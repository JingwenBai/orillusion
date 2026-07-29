import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, webGPUContext, setWebGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap } from './gfx/renderJob/frame/RTResourceMap';

import { ForwardRenderJob } from './gfx/renderJob/jobs/ForwardRenderJob';
import { GlobalBindGroup } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { Interpolator } from './math/TimeInterpolator';
import { RendererJob } from './gfx/renderJob/jobs/RendererJob';
import { Res } from './assets/Res';
import { ShaderLib } from './assets/shader/ShaderLib';
import { ShaderUtil } from './gfx/graphics/webGpu/shader/util/ShaderUtil';
import { ComponentCollect } from './gfx/renderJob/collect/ComponentCollect';
import { ShadowLightsCollect } from './gfx/renderJob/collect/ShadowLightsCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';
import { EntityCollect } from './gfx/renderJob/collect/EntityCollect';
import { RenderTexture } from './textures/RenderTexture';
import { ViewQuad } from './core/ViewQuad';

/**
 * Orillusion 3D Engine.
 *
 * Can be used as a classic static API (backward compatible):
 *   Engine3D.setting.xxx = ...;
 *   await Engine3D.init({ canvasConfig });
 *   Engine3D.startRenderView(view);
 *
 * Or instantiated for multiple independent engines on the same page:
 *   const engine1 = new Engine3D();
 *   await engine1.init({ canvasConfig: { canvas: canvas1 } });
 *   engine1.startRenderView(view1);
 *
 *   const engine2 = new Engine3D();
 *   await engine2.init({ canvasConfig: { canvas: canvas2 } });
 *   engine2.startRenderView(view2);
 *
 * @group engine3D
 */
export class Engine3D {

    // ═══════════════════════════════════════════════════════════════════════
    // Instance State  (per engine-instance)
    // ═══════════════════════════════════════════════════════════════════════

    /** Resource manager for this engine instance */
    public res: Res;

    /** Input system for this engine instance */
    public inputSystem: InputSystem;

    /** Active views managed by this engine instance */
    public views: View3D[];

    /** Render configuration for this engine instance */
    public setting: EngineSetting = Engine3D._buildDefaultSetting();

    /**
     * @internal
     * Map of View3D → RendererJob for this engine instance.
     */
    public renderJobs: Map<View3D, RendererJob>;

    // Per-instance private state
    private _context: Context3D;
    private _gBufferMap: Map<string, GBufferFrame>;
    private _rtTextureMap: Map<string, RenderTexture>;
    private _rtViewQuad: Map<string, ViewQuad>;
    private _entityCollect: EntityCollect;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _internalTime: number = 0;

    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /** Frame rate for this engine instance (fps) */
    public get frameRate(): number {
        return this._frameRate;
    }

    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) {
            this._frameRateValue = 0;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Static "current engine" management
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * The engine instance currently executing a render frame.
     * Exposed for internal use by classes that need to access per-engine state
     * (e.g. EntityCollect, GBufferFrame) without receiving an explicit reference.
     * @internal
     */
    public static _current: Engine3D | null = null;

    // ═══════════════════════════════════════════════════════════════════════
    // Static backward-compatible API
    // All static getters/setters delegate to the _current engine instance.
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Resource manager — delegates to the current engine instance.
     * @deprecated Prefer accessing `engine.res` on the Engine3D instance.
     */
    public static get res(): Res {
        return Engine3D._current?.res;
    }
    public static set res(v: Res) {
        if (Engine3D._current) Engine3D._current.res = v;
    }

    /**
     * Input system — delegates to the current engine instance.
     * @deprecated Prefer accessing `engine.inputSystem` on the Engine3D instance.
     */
    public static get inputSystem(): InputSystem {
        return Engine3D._current?.inputSystem;
    }

    /**
     * Active views — delegates to the current engine instance.
     * @deprecated Prefer accessing `engine.views` on the Engine3D instance.
     */
    public static get views(): View3D[] {
        return Engine3D._current?.views;
    }
    public static set views(v: View3D[]) {
        if (Engine3D._current) Engine3D._current.views = v;
    }

    /**
     * Engine settings — delegates to the current engine instance.
     * Modifications to this object before the first `Engine3D.init()` call are
     * captured in the default setting and applied to the first created engine.
     */
    public static get setting(): EngineSetting {
        if (Engine3D._current) return Engine3D._current.setting;
        return Engine3D._defaultSetting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D._current) {
            Engine3D._current.setting = v;
        } else {
            Engine3D._defaultSetting = v;
        }
    }

    /**
     * @internal
     * Render jobs map — delegates to the current engine instance.
     */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._current?.renderJobs;
    }
    public static set renderJobs(v: Map<View3D, RendererJob>) {
        if (Engine3D._current) Engine3D._current.renderJobs = v;
    }

    /** Render surface dimensions */
    public static get size(): number[] {
        return webGPUContext.presentationSize;
    }

    /** Render surface aspect ratio */
    public static get aspect(): number {
        return webGPUContext.aspect;
    }

    /** Render surface width in pixels */
    public static get width(): number {
        return webGPUContext.windowWidth;
    }

    /** Render surface height in pixels */
    public static get height(): number {
        return webGPUContext.windowHeight;
    }

    /**
     * Target frame rate for the current engine.
     * Values ≥ 360 mean "uncapped" (requestAnimationFrame cadence).
     */
    public static get frameRate(): number {
        return Engine3D._current?._frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (Engine3D._current) Engine3D._current.frameRate = value;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Static API methods (backward compat — delegate to _current engine)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Create and initialise the default engine instance (backward-compat static API).
     * If you need multiple engines, use `new Engine3D()` and call `init()` on each.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        if (!Engine3D._current) {
            Engine3D._current = new Engine3D();
            // Apply any pre-init static setting mutations
            Engine3D._current.setting = { ...Engine3D._defaultSetting };
        }
        return Engine3D._current.init(descriptor);
    }

    /** @deprecated Use the engine instance returned by `new Engine3D()` */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._current?.startRenderView(view);
    }

    /** @deprecated Use the engine instance returned by `new Engine3D()` */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._current?.startRenderViews(views);
    }

    /** Get the RendererJob for a given view on the current engine */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._current?.getRenderJob(view);
    }

    /** Pause the current engine's render loop */
    public static pause(): void {
        Engine3D._current?.pause();
    }

    /** Resume the current engine's render loop */
    public static resume(): void {
        Engine3D._current?.resume();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Instance API methods
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Initialise this engine instance: set up the WebGPU context, shader libraries,
     * resource manager, and input system.
     *
     * The WebGPU adapter and device are shared across all engine instances on the page.
     * Each engine gets its own canvas context and render resource maps.
     *
     * Note: if you use async `beforeRender`/`renderLoop`/`lateRender` callbacks with
     * multiple concurrent engine instances, ensure those callbacks resolve quickly so
     * frame rendering for different engines does not interleave.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Merge caller-supplied setting on top of this instance's setting
        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // WasmMatrix is a singleton WASM module — safe to call multiple times,
        // it initialises only once internally.
        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        // Per-instance resource maps (must exist before _activate is called)
        this._gBufferMap = new Map<string, GBufferFrame>();
        this._rtTextureMap = new Map<string, RenderTexture>();
        this._rtViewQuad = new Map<string, ViewQuad>();
        this._entityCollect = new EntityCollect();

        // Create and initialise the per-engine WebGPU canvas context.
        // The shared GPU device is initialised on the first call.
        this._context = new Context3D();
        await this._context.init(descriptor.canvasConfig);

        // Switch all engine-global singletons to point to this instance's data
        this._activate();

        // ── Pre-compute derived settings ────────────────────────────────────
        this.setting.reflectionSetting.width =
            this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // ── One-time global initialisations (guarded internally) ────────────
        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        ShadowLightsCollect.init();

        // ── Per-instance resources ──────────────────────────────────────────
        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this._context.canvas);
    }

    private _startRenderJob(view: View3D): RendererJob {
        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this.setting.pick.mode == `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this.setting.pick.mode == `pixel` || this.setting.pick.mode == `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Set a single render view and start the render loop for this engine.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop for this engine.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the RendererJob for a given view on this engine instance.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause this engine's render loop.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume this engine's render loop.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    /**
     * Switch all engine-global singletons to this instance's data.
     * Must be called at the start of each render frame and after any async boundary.
     * @internal
     */
    public _activate(): void {
        Engine3D._current = this;
        setWebGPUContext(this._context);
        GBufferFrame.gBufferMap = this._gBufferMap;
        RTResourceMap.rtTextureMap = this._rtTextureMap;
        RTResourceMap.rtViewQuad = this._rtViewQuad;
        EntityCollect.setInstance(this._entityCollect);
    }

    private async _render(time: number): Promise<void> {
        if (this._frameRateValue > 0) {
            let delta = time - this._internalTime;
            if (delta < this._frameRateValue) {
                const t = performance.now();
                await new Promise<void>(res => {
                    setTimeout(() => {
                        time += (performance.now() - t);
                        res();
                    }, this._frameRateValue - delta);
                });
            }
            this._internalTime = time;
        }
        // Re-activate after any async boundary (setTimeout above)
        this._activate();
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) {
            await this._beforeRender();
            this._activate(); // re-activate after async callback
        }

        // ── Component before-update pass ───────────────────────────────────
        for (const iterator of ComponentCollect.componentsBeforeUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                }
            }
        }

        let command = webGPUContext.device.createCommandEncoder();
        for (const iterator of ComponentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k, command);
                }
            }
        }
        webGPUContext.device.queue.submit([command.finish()]);

        // ── Component update pass ──────────────────────────────────────────
        for (const iterator of ComponentCollect.componentsUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                }
            }
        }

        for (const iterator of ComponentCollect.graphicComponent) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (k && f.enable) {
                    c(k);
                }
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
            this._activate(); // re-activate after async callback
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);

        // Upload global matrix buffer to GPU
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        // ── Component late-update pass ─────────────────────────────────────
        for (const iterator of ComponentCollect.componentsLateUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                }
            }
        }

        if (this._lateRender) {
            await this._lateRender();
            this._activate(); // re-activate after async callback
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Static default setting — captured before first init() call
    // ═══════════════════════════════════════════════════════════════════════

    private static _defaultSetting: EngineSetting = Engine3D._buildDefaultSetting();

    private static _buildDefaultSetting(): EngineSetting {
        return {
            doublePrecision: false,

            occlusionQuery: {
                enable: true,
                debug: false,
            },
            pick: {
                enable: true,
                mode: `bound`,
                detail: `mesh`,
            },
            render: {
                debug: false,
                renderPassState: 4,
                renderState_left: 5,
                renderState_right: 5,
                renderState_split: 0.5,
                quadScale: 1,
                hdrExposure: 1.5,
                debugQuad: -1,
                maxPointLight: 1000,
                maxDirectLight: 4,
                maxSportLight: 1000,
                drawOpMin: 0,
                drawOpMax: Number.MAX_SAFE_INTEGER,
                drawTrMin: 0,
                drawTrMax: Number.MAX_SAFE_INTEGER,
                zPrePass: false,
                useLogDepth: false,
                useCompressGBuffer: false,
                gi: false,
                postProcessing: {
                    bloom: {
                        downSampleStep: 3,
                        downSampleBlurSize: 9,
                        downSampleBlurSigma: 1.0,
                        upSampleBlurSize: 9,
                        upSampleBlurSigma: 1.0,
                        luminanceThreshole: 1.0,
                        bloomIntensity: 1.0,
                        hdr: 1.0
                    },
                    globalFog: {
                        debug: false,
                        enable: false,
                        fogType: 0.0,
                        fogHeightScale: 0.1,
                        start: 400,
                        end: 10,
                        density: 0.02,
                        ins: 0.5,
                        skyFactor: 0.5,
                        skyRoughness: 0.4,
                        overrideSkyFactor: 0.8,
                        fogColor: new Color(96 / 255, 117 / 255, 133 / 255, 1),
                        falloff: 0.7,
                        rayLength: 200.0,
                        scatteringExponent: 2.7,
                        dirHeightLine: 10.0,
                    },
                    godRay: {
                        blendColor: true,
                        rayMarchCount: 16,
                        scatteringExponent: 5,
                        intensity: 0.5
                    },
                    ssao: {
                        enable: false,
                        radius: 0.15,
                        bias: -0.1,
                        aoPower: 2.0,
                        debug: true,
                    },
                    outline: {
                        enable: false,
                        strength: 1,
                        groupCount: 4,
                        outlinePixel: 2,
                        fadeOutlinePixel: 4,
                        textureScale: 1,
                        useAddMode: false,
                        debug: true,
                    },
                    taa: {
                        enable: false,
                        jitterSeedCount: 8,
                        blendFactor: 0.1,
                        sharpFactor: 0.6,
                        sharpPreBlurFactor: 0.5,
                        temporalJitterScale: 0.13,
                        debug: true,
                    },
                    gtao: {
                        enable: false,
                        darkFactor: 1.0,
                        maxDistance: 5.0,
                        maxPixel: 50.0,
                        rayMarchSegment: 6,
                        multiBounce: false,
                        usePosFloat32: true,
                        blendColor: true,
                        debug: true,
                    },
                    ssr: {
                        enable: false,
                        pixelRatio: 1,
                        fadeEdgeRatio: 0.2,
                        rayMarchRatio: 0.5,
                        fadeDistanceMin: 600,
                        fadeDistanceMax: 2000,
                        roughnessThreshold: 0.5,
                        powDotRN: 0.2,
                        mixThreshold: 0.1,
                        debug: true,
                    },
                    fxaa: {
                        enable: false,
                    },
                    depthOfView: {
                        enable: false,
                        iterationCount: 3,
                        pixelOffset: 1.0,
                        near: 150,
                        far: 300,
                    },
                },
            },
            shadow: {
                enable: true,
                type: 'HARD',
                pointShadowBias: 0.0005,
                shadowSize: 2048,
                pointShadowSize: 1024,
                shadowSoft: 0.005,
                shadowBound: 100,
                shadowBias: 0.05,
                needUpdate: true,
                autoUpdate: true,
                updateFrameRate: 2,
                csmMargin: 0.1,
                csmScatteringExp: 0.7,
                csmAreaScale: 0.4,
                debug: false,
            },
            gi: {
                enable: false,
                offsetX: 0,
                offsetY: 0,
                offsetZ: 0,
                probeSpace: 64,
                probeXCount: 4,
                probeYCount: 2,
                probeZCount: 4,
                probeSize: 32,
                probeSourceTextureSize: 2048,
                octRTMaxSize: 2048,
                octRTSideSize: 16,
                maxDistance: 64 * 1.73,
                normalBias: 0.25,
                depthSharpness: 1,
                hysteresis: 0.98,
                lerpHysteresis: 0.01,
                irradianceChebyshevBias: 0.01,
                rayNumber: 144,
                irradianceDistanceBias: 32,
                indirectIntensity: 1.0,
                ddgiGamma: 2.2,
                bounceIntensity: 0.025,
                probeRoughness: 1,
                realTimeGI: false,
                debug: false,
                autoRenderProbe: false,
            },
            sky: {
                type: 'HDRSKY',
                sky: null,
                skyExposure: 1.0,
                defaultFar: 65536,
                defaultNear: 1,
            },
            light: {
                maxLight: 4096,
            },
            material: {
                materialChannelDebug: false,
                materialDebug: false
            },
            loader: {
                numConcurrent: 20,
            },
            reflectionSetting: {
                reflectionProbeMaxCount: 8,
                reflectionProbeSize: 256,
                width: 256 * 6,
                height: 8 * 256,
                enable: true
            }
        };
    }
}
