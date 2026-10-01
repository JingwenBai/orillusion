import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { EngineContext } from './core/EngineContext';

/**
 * Orillusion 3D Engine
 *
 * Create an independent engine instance with `new Engine3D()`.
 * Each instance owns its own GPU resources, scenes, and component lifecycle.
 * Multiple instances can run concurrently — they share the same WebGPU
 * device (adapter-level) but are otherwise fully isolated.
 *
 * ```typescript
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas } });
 * engine.startRenderView(view);
 * ```
 *
 * For projects that use only one engine the legacy static API still works
 * transparently — it delegates to the singleton stored in `Engine3D.current`.
 *
 * @group engine3D
 */
export class Engine3D {

    // ------------------------------------------------------------------ //
    //  Static "current engine" pointer (set at the top of every frame)   //
    // ------------------------------------------------------------------ //

    /** The engine instance that is currently executing a frame, or the last one that did. */
    public static get current(): Engine3D | null {
        return Engine3D._current;
    }
    private static _current: Engine3D | null = null;

    // ------------------------------------------------------------------ //
    //  Static backward-compat façade properties (delegate to _current)   //
    // ------------------------------------------------------------------ //

    /** @deprecated Use `engine.res` on the specific instance. */
    public static get res(): Res { return Engine3D._current?.res; }
    public static set res(v: Res) { if (Engine3D._current) Engine3D._current._context.res = v; }

    /** @deprecated Use `engine.inputSystem` on the specific instance. */
    public static get inputSystem(): InputSystem { return Engine3D._current?._inputSystem; }

    /** @deprecated Use `engine.views` on the specific instance. */
    public static get views(): View3D[] { return Engine3D._current?.views; }

    /**
     * Engine configuration.
     * Reading/writing `Engine3D.setting` always targets the currently-rendering
     * engine (set via `Engine3D._current`).  For multi-instance code prefer
     * `engine.setting` directly.
     */
    public static get setting(): EngineSetting { return Engine3D._current?._context.setting ?? Engine3D._defaultSetting; }
    public static set setting(v: EngineSetting) {
        if (Engine3D._current) Engine3D._current._context.setting = { ...Engine3D._current._context.setting, ...v };
        else Engine3D._defaultSetting = { ...Engine3D._defaultSetting, ...v };
    }

    /** Render window size as [width, height]. */
    public static get size(): number[] { return webGPUContext.presentationSize; }
    /** Render window aspect ratio. */
    public static get aspect(): number { return webGPUContext.aspect; }
    /** Render window width in pixels. */
    public static get width(): number { return webGPUContext.windowWidth; }
    /** Render window height in pixels. */
    public static get height(): number { return webGPUContext.windowHeight; }

    /** Static renderJobs map — delegates to the current engine. */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._current?.renderJobs; }

    // ------------------------------------------------------------------ //
    //  Static backward-compat method façades                             //
    // ------------------------------------------------------------------ //

    /**
     * @deprecated Prefer `new Engine3D()` + `await engine.init(...)`.
     * Creates (or re-uses) a singleton engine and initialises it.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        if (!Engine3D._singleton) Engine3D._singleton = new Engine3D();
        Engine3D._current = Engine3D._singleton;
        await Engine3D._singleton.init(descriptor);
    }
    private static _singleton: Engine3D | null = null;

    /** @deprecated Use `engine.startRenderView(view)`. */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._current?.startRenderView(view);
    }

    /** @deprecated Use `engine.startRenderViews(views)`. */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._current?.startRenderViews(views);
    }

    /** @deprecated Use `engine.getRenderJob(view)`. */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._current?.getRenderJob(view);
    }

    /** @deprecated Use `engine.pause()`. */
    public static pause(): void { Engine3D._current?.pause(); }

    /** @deprecated Use `engine.resume()`. */
    public static resume(): void { Engine3D._current?.resume(); }

    // ------------------------------------------------------------------ //
    //  Default settings object (used before any engine is created)       //
    // ------------------------------------------------------------------ //
    private static _defaultSetting: EngineSetting = _buildDefaultSetting();

    // ------------------------------------------------------------------ //
    //  INSTANCE fields                                                   //
    // ------------------------------------------------------------------ //

    /** Per-engine context object holding all isolated subsystems. */
    public readonly context: EngineContext;

    /** Shortcut to `context.res`. */
    public get res(): Res { return this._context.res; }

    /** Input system for this engine instance. */
    public get inputSystem(): InputSystem { return this._inputSystem; }

    /** Active render views for this engine instance. */
    public views: View3D[];

    /** Per-view render jobs for this engine instance. */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * Per-instance engine settings.
     * Initialised from `Engine3D._defaultSetting` then overridden by `init()`.
     */
    public get setting(): EngineSetting { return this._context.setting; }
    public set setting(v: EngineSetting) { this._context.setting = v; }

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    private _context: EngineContext;
    private _inputSystem: InputSystem;
    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this._context = new EngineContext();
        // Expose as public readonly (cast tricks avoid readonly on _context)
        (this as any).context = this._context;
        this._context.setting = { ...(Engine3D._defaultSetting) };
    }

    // ------------------------------------------------------------------ //
    //  INSTANCE METHODS                                                   //
    // ------------------------------------------------------------------ //

    /**
     * Initialise this engine instance.
     * @param descriptor  Engine and canvas configuration.
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

        // Merge user-supplied settings into this instance's settings.
        if (descriptor.engineSetting) {
            this._context.setting = { ...this._context.setting, ...descriptor.engineSetting };
        }

        // Mark this as the current engine so static proxy calls during init work.
        Engine3D._current = this;
        EngineContext.setCurrent(this._context);

        await WasmMatrix.init(Matrix4.allocCount, this._context.setting.doublePrecision);
        await webGPUContext.init(descriptor.canvasConfig);
        this._context.webGPUContext = webGPUContext;

        // Pre-compute reflection settings
        this._context.setting.reflectionSetting.width =
            this._context.setting.reflectionSetting.reflectionProbeSize * 6;
        this._context.setting.reflectionSetting.height =
            this._context.setting.reflectionSetting.reflectionProbeSize *
            this._context.setting.reflectionSetting.reflectionProbeMaxCount;

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this._context.setting.reflectionSetting.width,
            this._context.setting.reflectionSetting.height,
            false
        );

        ShaderLib.init();
        ShaderUtil.init();

        this._context.globalBindGroup._init();
        GlobalBindGroup.init();

        this._context.rtResourceMap._init();
        RTResourceMap.init();

        this._context.shadowLightsCollect._init();
        ShadowLightsCollect.init();

        this._context.res = new Res();
        this._context.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this._inputSystem = new InputSystem();
        this._inputSystem.initCanvas(webGPUContext.canvas);
    }

    private _startRenderJob(view: View3D): RendererJob {
        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this._context.setting.pick.mode === 'pixel') {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this._context.setting.pick.mode === 'pixel' || this._context.setting.pick.mode === 'bound') {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Assign a view to this engine and start rendering.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        view.engineContext = this._context;

        // Make this engine current so any static-proxy access during render-job
        // construction hits the right per-engine state.
        Engine3D._current = this;
        EngineContext.setCurrent(this._context);

        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Assign multiple views to this engine and start rendering.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;

        Engine3D._current = this;
        EngineContext.setCurrent(this._context);

        for (let i = 0; i < views.length; i++) {
            views[i].engineContext = this._context;
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the RendererJob for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
    }

    /** Pause this engine's render loop. */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume (or start) this engine's render loop. */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    private async _render(time: number): Promise<void> {
        if (this._frameRateValue > 0) {
            const delta = time - this._time;
            if (delta < this._frameRateValue) {
                const t = performance.now();
                await new Promise<void>(res => {
                    setTimeout(() => {
                        time += (performance.now() - t);
                        res();
                    }, this._frameRateValue - delta);
                });
            }
            this._time = time;
        }
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        // Set this engine as current so all static proxy calls during the frame
        // resolve to this engine's per-instance data.
        Engine3D._current = this;
        EngineContext.setCurrent(this._context);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        const cc = this._context.componentCollect;

        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        // Before-update
        if (cc.componentsBeforeUpdateList) {
            for (const iterator of cc.componentsBeforeUpdateList) {
                const k = iterator[0];
                const v = iterator[1];
                for (const [f, c] of v) {
                    if (f.enable) c(k);
                }
            }
        }

        // Compute pass
        const command = webGPUContext.device.createCommandEncoder();
        if (cc.componentsComputeList) {
            for (const iterator of cc.componentsComputeList) {
                const k = iterator[0];
                const v = iterator[1];
                for (const [f, c] of v) {
                    if (f.enable) c(k, command);
                }
            }
        }
        webGPUContext.device.queue.submit([command.finish()]);

        // Update
        if (cc.componentsUpdateList) {
            for (const iterator of cc.componentsUpdateList) {
                const k = iterator[0];
                const v = iterator[1];
                for (const [f, c] of v) {
                    if (f.enable) c(k);
                }
            }
        }

        // Graphic components
        if (cc.graphicComponent) {
            for (const iterator of cc.graphicComponent) {
                const k = iterator[0];
                const v = iterator[1];
                for (const [f, c] of v) {
                    if (k && f.enable) c(k);
                }
            }
        }

        if (this._renderLoop) await this._renderLoop();

        // Flush transforms and write matrix buffer
        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        // Execute render jobs
        this.renderJobs.forEach((v) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        // Late update
        if (cc.componentsLateUpdateList) {
            for (const iterator of cc.componentsLateUpdateList) {
                const k = iterator[0];
                const v = iterator[1];
                for (const [f, c] of v) {
                    if (f.enable) c(k);
                }
            }
        }

        if (this._lateRender) await this._lateRender();
    }
}

// ---- helpers ---- //

function _buildDefaultSetting(): EngineSetting {
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
                    downSampleStep: 3, downSampleBlurSize: 9, downSampleBlurSigma: 1.0,
                    upSampleBlurSize: 9, upSampleBlurSigma: 1.0,
                    luminanceThreshole: 1.0, bloomIntensity: 1.0, hdr: 1.0,
                },
                globalFog: {
                    debug: false, enable: false, fogType: 0.0, fogHeightScale: 0.1,
                    start: 400, end: 10, density: 0.02, ins: 0.5, skyFactor: 0.5,
                    skyRoughness: 0.4, overrideSkyFactor: 0.8,
                    fogColor: new Color(96 / 255, 117 / 255, 133 / 255, 1),
                    falloff: 0.7, rayLength: 200.0, scatteringExponent: 2.7, dirHeightLine: 10.0,
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
            enable: true, type: 'HARD', pointShadowBias: 0.0005,
            shadowSize: 2048, pointShadowSize: 1024, shadowSoft: 0.005,
            shadowBound: 100, shadowBias: 0.05, needUpdate: true, autoUpdate: true,
            updateFrameRate: 2, csmMargin: 0.1, csmScatteringExp: 0.7, csmAreaScale: 0.4, debug: false,
        },
        gi: {
            enable: false, offsetX: 0, offsetY: 0, offsetZ: 0,
            probeSpace: 64, probeXCount: 4, probeYCount: 2, probeZCount: 4,
            probeSize: 32, probeSourceTextureSize: 2048, octRTMaxSize: 2048, octRTSideSize: 16,
            maxDistance: 64 * 1.73, normalBias: 0.25, depthSharpness: 1, hysteresis: 0.98,
            lerpHysteresis: 0.01, irradianceChebyshevBias: 0.01, rayNumber: 144,
            irradianceDistanceBias: 32, indirectIntensity: 1.0, ddgiGamma: 2.2,
            bounceIntensity: 0.025, probeRoughness: 1, realTimeGI: false,
            debug: false, autoRenderProbe: false,
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
