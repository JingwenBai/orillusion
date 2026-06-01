import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time, setStaticTime } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, webGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap } from './gfx/renderJob/frame/RTResourceMap';

import { ForwardRenderJob } from './gfx/renderJob/jobs/ForwardRenderJob';
import { GlobalBindGroup } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { Interpolator } from './math/TimeInterpolator';
import { RendererJob } from './gfx/renderJob/jobs/RendererJob';
import { Res } from './assets/Res';
import { ShaderLib } from './assets/shader/ShaderLib';
import { ShaderUtil } from './gfx/graphics/webGpu/shader/util/ShaderUtil';
import { ComponentCollect, setDefaultComponentCollect } from './gfx/renderJob/collect/ComponentCollect';
import { ShadowLightsCollect } from './gfx/renderJob/collect/ShadowLightsCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';

/**
 * Orillusion 3D Engine
 *
 * ## Single-engine usage (backward-compatible static API)
 * ```ts
 * await Engine3D.init({ canvasConfig: { canvas } });
 * Engine3D.startRenderView(view);
 * ```
 *
 * ## Multi-engine usage (instantiable)
 * ```ts
 * const engineA = new Engine3D();
 * await engineA.init({ canvasConfig: { canvas: canvasA } });
 * engineA.startRenderView(viewA);
 *
 * const engineB = new Engine3D();
 * await engineB.init({ canvasConfig: { canvas: canvasB } });
 * engineB.startRenderView(viewB);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // ─── Per-engine state ──────────────────────────────────────────────────────

    /** Resource manager for this engine. */
    public res: Res;

    /** Input system for this engine. */
    public inputSystem: InputSystem;

    /** Active render views for this engine. */
    public views: View3D[] = [];

    /**
     * Per-engine WebGPU canvas context.
     * The first engine reuses the module-level `webGPUContext` singleton for
     * backward compatibility; subsequent engines get their own Context3D.
     */
    public context: Context3D;

    /** Per-engine frame time tracker. */
    public time: Time;

    /** Per-engine component lifecycle registry. */
    public componentCollect: ComponentCollect;

    /** Per-engine GPU bind-group registry. */
    public globalBindGroup: GlobalBindGroup;

    /** Per-engine shadow-light registry. */
    public shadowLightsCollect: ShadowLightsCollect;

    /** Per-engine render-texture registry. */
    public rtResourceMap: RTResourceMap;

    /** Render jobs keyed by View3D. */
    public renderJobs: Map<View3D, RendererJob> = new Map();

    /** Engine settings. Customise before calling init(). */
    public setting: EngineSetting = Engine3D._buildDefaultSetting();

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _renderTime: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ─── Instance getters ──────────────────────────────────────────────────────

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    public get size(): number[] { return this.context?.presentationSize; }
    public get aspect(): number { return this.context?.aspect; }
    public get width(): number { return this.context?.windowWidth; }
    public get height(): number { return this.context?.windowHeight; }

    // ─── Instance init ─────────────────────────────────────────────────────────

    /**
     * Initialise this engine instance.
     * - The first engine created reuses the module-level `webGPUContext` so all
     *   legacy imports of `webGPUContext` keep working.
     * - Subsequent engines each get their own `Context3D` with a fresh canvas but
     *   share the same underlying `GPUDevice`.
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

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // WASM matrix module is global; safe to call multiple times (idempotent).
        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        // ── Canvas / GPU context ──────────────────────────────────────────────
        // First engine: reuse the module-level webGPUContext so that code that
        // imports { webGPUContext } directly keeps working without changes.
        const isFirst = !Engine3D._default;
        this.context = isFirst ? webGPUContext : new Context3D();
        await this.context.init(descriptor.canvasConfig);

        // ── Reflection GBuffer (per-engine, idempotent within same key) ───────
        this.setting.reflectionSetting.width =
            this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false,
        );

        // ── Shader resources (global / idempotent) ────────────────────────────
        ShaderLib.init();
        ShaderUtil.init();

        // ── Per-engine subsystems ─────────────────────────────────────────────
        this.globalBindGroup    = new GlobalBindGroup();
        this.rtResourceMap      = new RTResourceMap();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.componentCollect   = new ComponentCollect();
        this.time               = new Time();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop   = descriptor.renderLoop;
        this._lateRender   = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);

        // ── Register as the default / first engine ────────────────────────────
        if (isFirst) {
            Engine3D._default = this;
            // Wire legacy static helpers to this engine's instances.
            setStaticTime(this.time);
            setDefaultComponentCollect(this.componentCollect);
            GlobalBindGroup._defaultInstance    = this.globalBindGroup;
            RTResourceMap._defaultInstance      = this.rtResourceMap;
            ShadowLightsCollect._defaultInstance = this.shadowLightsCollect;
        }
    }

    // ─── Render-view management ────────────────────────────────────────────────

    private _startRenderJob(view: View3D): RendererJob {
        const renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this.setting.pick.mode === 'pixel') {
            const postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }
        if (this.setting.pick.mode === 'pixel' || this.setting.pick.mode === 'bound') {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Attach a single view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.views = [view];
        view.engine = this;
        if (view.scene) this.shadowLightsCollect.createBuffer(view);
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Attach multiple views and start the render loop.
     */
    public startRenderViews(views: View3D[]) {
        this.views = views;
        for (const view of views) {
            view.engine = this;
            if (view.scene) this.shadowLightsCollect.createBuffer(view);
            this._startRenderJob(view);
        }
        this.resume();
    }

    /**
     * Get the RendererJob associated with a view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /** Pause this engine's render loop. */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume this engine's render loop. */
    public resume() {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame(t => this._render(t));
        }
    }

    // ─── Render loop ───────────────────────────────────────────────────────────

    private async _render(time: number) {
        if (this._frameRateValue > 0) {
            const delta = time - this._renderTime;
            if (delta < this._frameRateValue) {
                const t = performance.now();
                await new Promise<void>(resolve => {
                    setTimeout(() => {
                        time += performance.now() - t;
                        resolve();
                    }, this._frameRateValue - delta);
                });
            }
            this._renderTime = time;
        }
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number) {
        // Update per-engine time.
        this.time.delta = time - this.time.time;
        this.time.time = time;
        this.time.frame += 1;
        Interpolator.tick(this.time.delta);

        // Point the static Time accessors at this engine's time instance so
        // that legacy code calling Time.frame / Time.time / Time.delta sees
        // the values for the engine currently rendering.
        setStaticTime(this.time);

        // Activate per-engine subsystem routing so legacy static calls
        // (GlobalBindGroup.xxx, RTResourceMap.xxx, ShadowLightsCollect.xxx)
        // resolve to this engine's instances during the frame.
        Engine3D._currentRenderingEngine          = this;
        GlobalBindGroup._currentRenderingInstance  = this.globalBindGroup;
        RTResourceMap._currentRenderingInstance    = this.rtResourceMap;
        ShadowLightsCollect._currentRenderingInstance = this.shadowLightsCollect;

        const ctx = this.context;

        for (const view of this.views) {
            view.scene.waitUpdate();
            const [w, h] = ctx.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        // Before-update callbacks  (k = View3D, f = IComponent, c = callback)
        for (const [k, v] of this.componentCollect.componentsBeforeUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        // Compute pass
        const command = Context3D.sharedDevice.createCommandEncoder();
        for (const [k, v] of this.componentCollect.componentsComputeList) {
            for (const [f, c] of v) {
                if (f.enable) c(k, command);
            }
        }
        Context3D.sharedDevice.queue.submit([command.finish()]);

        // Update callbacks
        for (const [k, v] of this.componentCollect.componentsUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        // Graphic component callbacks
        for (const [k, v] of this.componentCollect.graphicComponent) {
            for (const [f, c] of v) {
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop) await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);

        // Write global model-matrix buffer to GPU.
        this.globalBindGroup.modelMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach(v => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        // Late-update callbacks
        for (const [k, v] of this.componentCollect.componentsLateUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        if (this._lateRender) await this._lateRender();

        // Clear per-frame routing statics.
        Engine3D._currentRenderingEngine           = null;
        GlobalBindGroup._currentRenderingInstance   = null;
        RTResourceMap._currentRenderingInstance     = null;
        ShadowLightsCollect._currentRenderingInstance = null;
    }

    // ─── Static backward-compat API ───────────────────────────────────────────

    /**
     * @internal
     * First Engine3D instance — backs the legacy static property proxies.
     */
    public static _default: Engine3D | null = null;

    /**
     * @internal
     * Set to the engine currently in its render frame so that per-engine
     * subsystem static methods resolve to the right instance.
     */
    public static _currentRenderingEngine: Engine3D | null = null;

    // Static property proxies
    public static get res(): Res              { return this._default?.res; }
    public static set res(v: Res)             { if (this._default) this._default.res = v; }
    public static get inputSystem(): InputSystem { return this._default?.inputSystem; }
    public static get views(): View3D[]       { return this._default?.views; }
    public static set views(v: View3D[])      { if (this._default) this._default.views = v; }
    public static get renderJobs()            { return this._default?.renderJobs; }
    public static get setting(): EngineSetting {
        // During a render frame, return the currently-rendering engine's settings
        // so that render-pass code sees the correct per-engine configuration.
        return (this._currentRenderingEngine ?? this._default)?.setting ?? Engine3D._buildDefaultSetting();
    }
    public static set setting(v: EngineSetting) { if (this._default) this._default.setting = v; }
    public static get frameRate(): number     { return this._default?._frameRate ?? 360; }
    public static set frameRate(v: number)    { if (this._default) this._default.frameRate = v; }
    public static get size(): number[]        { return this._default?.size; }
    public static get aspect(): number        { return this._default?.aspect; }
    public static get width(): number         { return this._default?.width; }
    public static get height(): number        { return this._default?.height; }

    // Static lifecycle
    /** Initialise the default single engine (legacy API). */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        await engine.init(descriptor);
    }

    public static startRenderView(view: View3D): RendererJob {
        return this._default?.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]) {
        this._default?.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return this._default?.getRenderJob(view);
    }

    public static pause()  { this._default?.pause(); }
    public static resume() { this._default?.resume(); }

    // ─── Default settings factory ──────────────────────────────────────────────

    private static _buildDefaultSetting(): EngineSetting {
        return {
            doublePrecision: false,
            occlusionQuery: { enable: true, debug: false },
            pick: { enable: true, mode: 'bound', detail: 'mesh' },
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
                        hdr: 1.0,
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
                    godRay: { blendColor: true, rayMarchCount: 16, scatteringExponent: 5, intensity: 0.5 },
                    ssao: { enable: false, radius: 0.15, bias: -0.1, aoPower: 2.0, debug: true },
                    outline: {
                        enable: false, strength: 1, groupCount: 4, outlinePixel: 2,
                        fadeOutlinePixel: 4, textureScale: 1, useAddMode: false, debug: true,
                    },
                    taa: {
                        enable: false, jitterSeedCount: 8, blendFactor: 0.1, sharpFactor: 0.6,
                        sharpPreBlurFactor: 0.5, temporalJitterScale: 0.13, debug: true,
                    },
                    gtao: {
                        enable: false, darkFactor: 1.0, maxDistance: 5.0, maxPixel: 50.0,
                        rayMarchSegment: 6, multiBounce: false, usePosFloat32: true,
                        blendColor: true, debug: true,
                    },
                    ssr: {
                        enable: false, pixelRatio: 1, fadeEdgeRatio: 0.2, rayMarchRatio: 0.5,
                        fadeDistanceMin: 600, fadeDistanceMax: 2000, roughnessThreshold: 0.5,
                        powDotRN: 0.2, mixThreshold: 0.1, debug: true,
                    },
                    fxaa: { enable: false },
                    depthOfView: { enable: false, iterationCount: 3, pixelOffset: 1.0, near: 150, far: 300 },
                },
            },
            shadow: {
                enable: true, type: 'HARD', pointShadowBias: 0.0005, shadowSize: 2048,
                pointShadowSize: 1024, shadowSoft: 0.005, shadowBound: 100, shadowBias: 0.05,
                needUpdate: true, autoUpdate: true, updateFrameRate: 2, csmMargin: 0.1,
                csmScatteringExp: 0.7, csmAreaScale: 0.4, debug: false,
            },
            gi: {
                enable: false, offsetX: 0, offsetY: 0, offsetZ: 0, probeSpace: 64,
                probeXCount: 4, probeYCount: 2, probeZCount: 4, probeSize: 32,
                probeSourceTextureSize: 2048, octRTMaxSize: 2048, octRTSideSize: 16,
                maxDistance: 64 * 1.73, normalBias: 0.25, depthSharpness: 1, hysteresis: 0.98,
                lerpHysteresis: 0.01, irradianceChebyshevBias: 0.01, rayNumber: 144,
                irradianceDistanceBias: 32, indirectIntensity: 1.0, ddgiGamma: 2.2,
                bounceIntensity: 0.025, probeRoughness: 1, realTimeGI: false, debug: false,
                autoRenderProbe: false,
            },
            sky: { type: 'HDRSKY', sky: null, skyExposure: 1.0, defaultFar: 65536, defaultNear: 1 },
            light: { maxLight: 4096 },
            material: { materialChannelDebug: false, materialDebug: false },
            loader: { numConcurrent: 20 },
            reflectionSetting: {
                reflectionProbeMaxCount: 8, reflectionProbeSize: 256,
                width: 256 * 6, height: 8 * 256, enable: true,
            },
        };
    }
}
