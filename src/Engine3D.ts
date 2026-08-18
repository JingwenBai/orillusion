import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { webGPUContext, Context3D } from './gfx/graphics/webGpu/Context3D';
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
import { WasmMatrix } from './components/matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';
import { EngineContext } from './gfx/renderJob/EngineContext';

function deepMergeSettings(base: any, override: any): any {
    const result = { ...base };
    for (const key of Object.keys(override)) {
        const ov = override[key];
        const bv = base[key];
        // Recurse into plain objects but not Color instances, arrays, or nulls
        if (ov !== null && typeof ov === 'object' && !Array.isArray(ov) && !(ov instanceof Color)) {
            result[key] = deepMergeSettings(bv ?? {}, ov);
        } else {
            result[key] = ov;
        }
    }
    return result as any;
}

function createDefaultSetting(): EngineSetting {
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

/**
 * Orillusion 3D Engine
 *
 * Multiple independent instances are supported:
 * ```ts
 * const engine1 = new Engine3D();
 * await engine1.init({ canvasConfig: { canvas: canvas1 } });
 * engine1.startRenderView(view1);
 *
 * const engine2 = new Engine3D();
 * await engine2.init({ canvasConfig: { canvas: canvas2 } });
 * engine2.startRenderView(view2);
 * ```
 *
 * Legacy single-instance static API is preserved via `Engine3D.current`:
 * ```ts
 * await Engine3D.init();          // creates and activates a default instance
 * Engine3D.startRenderView(view); // delegates to Engine3D.current
 * ```
 * @group engine3D
 */
export class Engine3D {

    // =====================================================================
    //  Static "current engine" reference + backward-compatible static API
    // =====================================================================

    /**
     * The most recently initialised (or currently rendering) Engine3D instance.
     * All legacy static accessors delegate to this instance.
     */
    public static current: Engine3D = null;

    /** @deprecated Use instance property. Reads from / writes to Engine3D.current. */
    public static get res(): Res { return Engine3D.current?.res; }
    public static set res(v: Res) { if (Engine3D.current) Engine3D.current.res = v; }

    /** @deprecated Use instance property. Reads from / writes to Engine3D.current. */
    public static get inputSystem(): InputSystem { return Engine3D.current?.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D.current) Engine3D.current.inputSystem = v; }

    /** @deprecated Use instance property. Reads from / writes to Engine3D.current. */
    public static get views(): View3D[] { return Engine3D.current?.views; }
    public static set views(v: View3D[]) { if (Engine3D.current) Engine3D.current.views = v; }

    /** @deprecated Use instance property. Reads from / writes to Engine3D.current. */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D.current?.renderJobs; }

    /**
     * Engine settings shared with all render passes via the static accessor.
     * Reads from `Engine3D.current.setting`; before any engine is initialised,
     * reads/writes the shared `_defaultSetting` which seeds new instances.
     */
    public static get setting(): EngineSetting {
        return Engine3D.current?.setting ?? Engine3D._defaultSetting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D.current) {
            Engine3D.current.setting = v;
        } else {
            Engine3D._defaultSetting = v;
        }
    }

    /** Pre-init defaults – applied to every new Engine3D instance at construction time. */
    private static _defaultSetting: EngineSetting = createDefaultSetting();

    public static get size(): number[] { return Engine3D.current?._context.presentationSize ?? [0, 0]; }
    public static get aspect(): number { return Engine3D.current?._context.aspect ?? 1; }
    public static get width(): number { return Engine3D.current?._context.windowWidth ?? 0; }
    public static get height(): number { return Engine3D.current?._context.windowHeight ?? 0; }

    public static get frameRate(): number { return Engine3D.current?._frameRate ?? 360; }
    public static set frameRate(v: number) { if (Engine3D.current) Engine3D.current.frameRate = v; }

    // ---- Shared one-time initialisation guards ----
    private static _wasmInitialized: boolean = false;
    private static _sharedResourcesInitialized: boolean = false;
    private static _instanceCount: number = 0;

    // =====================================================================
    //  Instance fields
    // =====================================================================

    public res: Res;
    public inputSystem: InputSystem;
    public views: View3D[];
    public setting: EngineSetting;

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * Per-engine canvas/WebGPU context.
     * @internal
     */
    public _context: Context3D;

    /**
     * Unique identifier used to namespace per-engine GPU resources.
     * @internal
     */
    public _id: string;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        // Deep-merge the shared _defaultSetting (which captures any pre-init
        // Engine3D.setting.xxx = ... mutations) onto a fresh per-engine copy.
        this.setting = deepMergeSettings(createDefaultSetting(), Engine3D._defaultSetting);
    }

    // =====================================================================
    //  Instance getters / setters
    // =====================================================================

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    public get size(): number[] { return this._context?.presentationSize ?? [0, 0]; }
    public get aspect(): number { return this._context?.aspect ?? 1; }
    public get width(): number { return this._context?.windowWidth ?? 0; }
    public get height(): number { return this._context?.windowHeight ?? 0; }

    // =====================================================================
    //  Lifecycle
    // =====================================================================

    /**
     * Initialise this Engine3D instance.
     * The first call also boots the shared WebGPU device, WASM matrix library,
     * shader library, and other once-only GPU resources.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        this._id = `engine${Engine3D._instanceCount++}`;

        // Make this the active engine so that resource-name scoping works during init
        Engine3D.current = this;
        EngineContext.id = this._id;

        console.log(`[${this._id}] Engine Version`, version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // ---- One-time: WASM matrix library ----
        if (!Engine3D._wasmInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            Engine3D._wasmInitialized = true;
        }

        // ---- Per-engine: canvas + WebGPU canvas context ----
        this._context = new Context3D();
        await this._context.init(descriptor.canvasConfig);

        // Mirror per-canvas fields onto the shared webGPUContext singleton so that
        // existing code that reads webGPUContext.presentationSize / .context etc.
        // sees the correct values for the current engine.
        this._syncWebGPUContext();

        // ---- Pre-compute per-engine reflection GBuffer ----
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // ---- One-time: shader & binding infrastructure (idempotent) ----
        if (!Engine3D._sharedResourcesInitialized) {
            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            Engine3D._sharedResourcesInitialized = true;
        }

        RTResourceMap.init();
        ShadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this._context.canvas);
    }

    // =====================================================================
    //  Render control
    // =====================================================================

    private startRenderJob(view: View3D) {
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
     * Set render view and start renderer.
     */
    public startRenderView(view: View3D) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start renderer.
     */
    public startRenderViews(views: View3D[]) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this.startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the RendererJob for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause this engine's render loop.
     */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume this engine's render loop.
     */
    public resume() {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
    }

    // =====================================================================
    //  Internal render loop
    // =====================================================================

    private async render(time: number) {
        if (this._frameRateValue > 0) {
            let delta = time - this._time;
            if (delta < this._frameRateValue) {
                let t = performance.now();
                await new Promise(res => {
                    setTimeout(() => {
                        time += (performance.now() - t);
                        res(true);
                    }, this._frameRateValue - delta);
                });
            }
            this._time = time;
        }
        await this.updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async updateFrame(time: number) {
        // ---- Activate this engine as the "current" context ----
        Engine3D.current = this;
        EngineContext.id = this._id;
        this._syncWebGPUContext();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        let views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this._context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        // Only process views belonging to this engine instance
        const viewSet = new Set(views);

        for (const [k, v] of ComponentCollect.componentsBeforeUpdateList) {
            if (!viewSet.has(k)) continue;
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        let command = webGPUContext.device.createCommandEncoder();
        for (const [k, v] of ComponentCollect.componentsComputeList) {
            if (!viewSet.has(k)) continue;
            for (const [f, c] of v) {
                if (f.enable) c(k, command);
            }
        }

        webGPUContext.device.queue.submit([command.finish()]);

        for (const [k, v] of ComponentCollect.componentsUpdateList) {
            if (!viewSet.has(k)) continue;
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        for (const [k, v] of ComponentCollect.graphicComponent) {
            if (!viewSet.has(k)) continue;
            for (const [f, c] of v) {
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        for (const [k, v] of ComponentCollect.componentsLateUpdateList) {
            if (!viewSet.has(k)) continue;
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    /**
     * Mirror this engine's per-canvas context fields onto the shared `webGPUContext`
     * singleton.  Because JS is single-threaded, only one engine renders at a time,
     * so the singleton always reflects the currently-active engine's canvas state.
     */
    private _syncWebGPUContext() {
        webGPUContext.context = this._context.context;
        webGPUContext.canvas = this._context.canvas;
        webGPUContext.presentationSize = this._context.presentationSize;
        webGPUContext.windowWidth = this._context.windowWidth;
        webGPUContext.windowHeight = this._context.windowHeight;
        webGPUContext.aspect = this._context.aspect;
    }

    // =====================================================================
    //  Static convenience wrappers (legacy single-instance API)
    // =====================================================================

    /**
     * Legacy static init — creates a new Engine3D instance and activates it as
     * `Engine3D.current`.  For multi-instance usage, call `new Engine3D()` instead.
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<Engine3D> {
        const engine = new Engine3D();
        await engine.init(descriptor);
        return engine;
    }

    /** @deprecated Use instance method on Engine3D.current. */
    public static startRenderView(view: View3D) {
        return Engine3D.current.startRenderView(view);
    }

    /** @deprecated Use instance method on Engine3D.current. */
    public static startRenderViews(views: View3D[]) {
        return Engine3D.current.startRenderViews(views);
    }

    /** @deprecated Use instance method on Engine3D.current. */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.current.getRenderJob(view);
    }

    /** @deprecated Use instance method on Engine3D.current. */
    public static pause() {
        Engine3D.current?.pause();
    }

    /** @deprecated Use instance method on Engine3D.current. */
    public static resume() {
        Engine3D.current?.resume();
    }
}
