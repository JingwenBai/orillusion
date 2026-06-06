import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setCurrentContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { setCurrentEngineId } from './core/EngineContext';

/**
 * Default engine settings factory – returns a fresh object so each Engine3D
 * instance starts with its own independent copy.
 * @internal
 */
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
                godRay: {
                    blendColor: true,
                    rayMarchCount: 16,
                    scatteringExponent: 5,
                    intensity: 0.5,
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
            materialDebug: false,
        },
        loader: {
            numConcurrent: 20,
        },
        reflectionSetting: {
            reflectionProbeMaxCount: 8,
            reflectionProbeSize: 256,
            width: 256 * 6,
            height: 8 * 256,
            enable: true,
        },
    };
}

/**
 * Orillusion 3D Engine
 *
 * **Multi-instance usage**
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
 * **Legacy single-instance usage (backward compatible)**
 * ```ts
 * await Engine3D.init();          // creates Engine3D.defaultInstance
 * Engine3D.startRenderView(view);
 * Engine3D.res.load(...);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // ------------------------------------------------------------------
    // Static registry – tracks all live engine instances
    // ------------------------------------------------------------------

    /** All Engine3D instances currently alive. */
    public static readonly instances: Engine3D[] = [];

    /** Maps a View3D to the engine that owns it, for cross-system lookups. */
    private static _viewToEngine = new Map<View3D, Engine3D>();

    /** Guards one-time global initialisations (WASM, ShaderLib, …). */
    private static _globalInitDone = false;

    /**
     * Look up the Engine3D instance that owns a given View3D.
     * Returns undefined if the view has not been registered with any engine.
     */
    public static getEngineByView(view: View3D): Engine3D | undefined {
        return this._viewToEngine.get(view);
    }

    // ------------------------------------------------------------------
    // Backward-compatibility: static wrappers for the default instance
    // ------------------------------------------------------------------

    /**
     * The first Engine3D created via the static `Engine3D.init()` helper.
     * Exists so that code written for the original single-instance API keeps
     * working without changes.
     */
    public static defaultInstance: Engine3D = null;

    /** @deprecated Use `engine.res` on an Engine3D instance instead. */
    public static get res(): Res { return this.defaultInstance?.res; }
    public static set res(v: Res) { if (this.defaultInstance) this.defaultInstance.res = v; }

    /** @deprecated Use `engine.inputSystem` on an Engine3D instance instead. */
    public static get inputSystem(): InputSystem { return this.defaultInstance?.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (this.defaultInstance) this.defaultInstance.inputSystem = v; }

    /** @deprecated Use `engine.views` on an Engine3D instance instead. */
    public static get views(): View3D[] { return this.defaultInstance?.views; }
    public static set views(v: View3D[]) { if (this.defaultInstance) this.defaultInstance.views = v; }

    /** @deprecated Use `engine.renderJobs` on an Engine3D instance instead. */
    public static get renderJobs(): Map<View3D, RendererJob> { return this.defaultInstance?.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { if (this.defaultInstance) this.defaultInstance.renderJobs = v; }

    /** @deprecated Use `engine.setting` on an Engine3D instance instead. */
    public static get setting(): EngineSetting { return this.defaultInstance?.setting; }
    public static set setting(v: EngineSetting) { if (this.defaultInstance) this.defaultInstance.setting = v; }

    /** @deprecated Use `engine.frameRate` on an Engine3D instance instead. */
    public static get frameRate(): number { return this.defaultInstance?._frameRate ?? 360; }
    public static set frameRate(v: number) { if (this.defaultInstance) this.defaultInstance.frameRate = v; }

    /** @deprecated Use `engine.size` on an Engine3D instance instead. */
    public static get size(): number[] { return this.defaultInstance?.size; }

    /** @deprecated Use `engine.aspect` on an Engine3D instance instead. */
    public static get aspect(): number { return this.defaultInstance?.aspect; }

    /** @deprecated Use `engine.width` on an Engine3D instance instead. */
    public static get width(): number { return this.defaultInstance?.width; }

    /** @deprecated Use `engine.height` on an Engine3D instance instead. */
    public static get height(): number { return this.defaultInstance?.height; }

    /**
     * Static init – creates (or returns) the default Engine3D instance.
     * @deprecated For multi-instance usage create Engine3D instances directly.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<Engine3D> {
        if (!this.defaultInstance) {
            this.defaultInstance = new Engine3D();
        }
        await this.defaultInstance.init(descriptor);
        return this.defaultInstance;
    }

    /** @deprecated Use `engine.startRenderView()` on an Engine3D instance. */
    public static startRenderView(view: View3D): RendererJob {
        return this.defaultInstance?.startRenderView(view);
    }

    /** @deprecated Use `engine.startRenderViews()` on an Engine3D instance. */
    public static startRenderViews(views: View3D[]): void {
        this.defaultInstance?.startRenderViews(views);
    }

    /** @deprecated Use `engine.getRenderJob()` on an Engine3D instance. */
    public static getRenderJob(view: View3D): RendererJob {
        return this.defaultInstance?.getRenderJob(view);
    }

    /** @deprecated Use `engine.pause()` on an Engine3D instance. */
    public static pause(): void {
        this.defaultInstance?.pause();
    }

    /** @deprecated Use `engine.resume()` on an Engine3D instance. */
    public static resume(): void {
        this.defaultInstance?.resume();
    }

    // ------------------------------------------------------------------
    // Instance state
    // ------------------------------------------------------------------

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine's canvas. */
    public inputSystem: InputSystem;

    /** Views registered with this engine. */
    public views: View3D[];

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /** Per-engine settings. */
    public setting: EngineSetting;

    /**
     * Per-engine WebGPU context (canvas, swapchain, size).
     * The underlying GPUDevice is shared across all Engine3D instances.
     */
    public context: Context3D;

    /**
     * Per-engine component lifecycle tracker.
     * Exposed so advanced callers can inspect or extend it, but normally you
     * interact with components through ComponentCollect's static bridge API.
     * @internal
     */
    public readonly collect: ComponentCollect;

    /** Unique numeric identifier for this engine instance. */
    public readonly engineId: number;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.engineId = Engine3D.instances.length;
        this.setting = createDefaultSetting();
        this.collect = new ComponentCollect();
    }

    // ------------------------------------------------------------------
    // Instance getters
    // ------------------------------------------------------------------

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    public get size(): number[] { return this.context?.presentationSize; }
    public get aspect(): number { return this.context?.aspect; }
    public get width(): number { return this.context?.windowWidth; }
    public get height(): number { return this.context?.windowHeight; }

    // ------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------

    /**
     * Initialise this Engine3D instance.
     *
     * The GPU adapter and device are created on the first call and reused by
     * any subsequent Engine3D instances, so multiple engines on the same page
     * share a single GPUDevice while each having its own canvas/swapchain.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<this> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // WASM matrix library – initialise once globally.
        if (!Engine3D._globalInitDone) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // Create a per-engine WebGPU context.  Context3D.init() automatically
        // reuses the shared GPUAdapter and GPUDevice after the first engine.
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);

        // Make this engine the active context for subsystems that read the
        // module-level webGPUContext variable.
        this._activateContext();

        //****pre compute setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );
        //****pre compute setting****/

        // Shader library and utility – initialise only once (idempotent).
        if (!Engine3D._globalInitDone) {
            ShaderLib.init();
            ShaderUtil.init();
        }

        // These systems are idempotent after the first call.
        GlobalBindGroup.init();
        RTResourceMap.init();
        ShadowLightsCollect.init();

        Engine3D._globalInitDone = true;

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);

        Engine3D.instances.push(this);
        return this;
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
     * Register a single View3D with this engine and start rendering.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        this._registerView(view);
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Register multiple View3Ds with this engine and start rendering.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._registerView(views[i]);
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    private _registerView(view: View3D): void {
        Engine3D._viewToEngine.set(view, this);
        ComponentCollect.registerView(view, this.collect);
    }

    /**
     * Get the RendererJob for a specific View3D.
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
     * Activate this engine's per-engine context so that subsystems that read
     * the module-level `webGPUContext` variable and the global engine ID see
     * the correct values for this engine.
     * @internal
     */
    private _activateContext(): void {
        setCurrentEngineId(this.engineId);
        setCurrentContext(this.context);
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
        // Switch global context to this engine before any per-engine work.
        this._activateContext();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        /****** before-update pass *****/
        for (const [k, v] of this.collect.componentsBeforeUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        /****** compute pass *****/
        const command = this.context.device.createCommandEncoder();
        for (const [k, v] of this.collect.componentsComputeList) {
            for (const [f, c] of v) {
                if (f.enable) c(k, command);
            }
        }
        this.context.device.queue.submit([command.finish()]);

        /****** update pass *****/
        for (const [k, v] of this.collect.componentsUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        /****** graphic pass *****/
        for (const [k, v] of this.collect.graphicComponent) {
            for (const [f, c] of v) {
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop) await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        GlobalBindGroup.modelMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        /****** late-update pass *****/
        for (const [k, v] of this.collect.componentsLateUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        if (this._lateRender) await this._lateRender();
    }
}
