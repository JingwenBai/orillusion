import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { EngineTime } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setWebGPUContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { EntityCollect } from './gfx/renderJob/collect/EntityCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';
import { setCurrentEngine, getCurrentEngine } from './gfx/EngineContext';

/**
 * Orillusion 3D Engine instance.
 *
 * Create via `new Engine3D()` for multi-instance support.
 * The legacy all-static API (`Engine3D.init()`, `Engine3D.res`, …) is kept for
 * backward compatibility and delegates to the most-recently initialised instance.
 *
 * @group engine3D
 */
export class Engine3D {

    // ================================================================ //
    //  Per-instance state
    // ================================================================ //

    /**
     * Resource manager for this engine instance.
     */
    public res: Res;

    /**
     * Input system for this engine instance.
     */
    public inputSystem: InputSystem;

    /**
     * Active views registered with this engine instance.
     */
    public views: View3D[];

    /**
     * Per-engine component lifecycle registry.
     * @internal
     */
    public componentCollect: ComponentCollect;

    /**
     * Per-engine shadow-light tracker.
     * @internal
     */
    public shadowLightsCollect: ShadowLightsCollect;

    /**
     * Per-engine GPU bind-group manager.
     * @internal
     */
    public globalBindGroup: GlobalBindGroup;

    /**
     * Per-engine render-texture registry.
     * @internal
     */
    public rtResourceMap: RTResourceMap;

    /**
     * Per-engine entity/render-node collector.
     * @internal
     */
    public entityCollect: EntityCollect;

    /**
     * Per-engine G-buffer frame registry.
     * @internal
     */
    public gBufferMap: Map<string, GBufferFrame>;

    /**
     * Per-engine time state.
     * @internal
     */
    public time: EngineTime;

    /**
     * Engine settings (per-instance).
     */
    public setting: EngineSetting = {
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

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    // Internal render loop state
    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /** WebGPU context for this instance's canvas. @internal */
    public context3D: Context3D;

    // ================================================================ //
    //  Static backward-compatibility layer
    //
    //  All static members below delegate to `_defaultInstance` so that
    //  code written against the old all-static API continues to work.
    // ================================================================ //

    /** The most recently initialised Engine3D instance (used by the static API). */
    public static _defaultInstance: Engine3D | null = null;

    // Static setting is a fallback for code that reads Engine3D.setting before init
    private static _staticSetting: EngineSetting;

    public static get res(): Res { return Engine3D._defaultInstance?.res; }
    public static set res(v: Res) { if (Engine3D._defaultInstance) Engine3D._defaultInstance.res = v; }

    public static get inputSystem(): InputSystem { return Engine3D._defaultInstance?.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D._defaultInstance) Engine3D._defaultInstance.inputSystem = v; }

    public static get views(): View3D[] { return Engine3D._defaultInstance?.views; }
    public static set views(v: View3D[]) { if (Engine3D._defaultInstance) Engine3D._defaultInstance.views = v; }

    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._defaultInstance?.renderJobs; }

    public static get setting(): EngineSetting {
        // Prefer the currently-rendering engine so ForwardRenderJob etc. get the right settings
        return (getCurrentEngine() ?? Engine3D._defaultInstance)?.setting ?? (Engine3D._staticSetting ??= {} as any);
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D._defaultInstance) Engine3D._defaultInstance.setting = v;
        else Engine3D._staticSetting = v;
    }

    public static get size(): number[] { return webGPUContext.presentationSize; }
    public static get aspect(): number { return webGPUContext.aspect; }
    public static get width(): number { return webGPUContext.windowWidth; }
    public static get height(): number { return webGPUContext.windowHeight; }

    public static get frameRate(): number { return Engine3D._defaultInstance?._frameRate ?? 360; }
    public static set frameRate(value: number) { Engine3D._defaultInstance && (Engine3D._defaultInstance.frameRate = value); }

    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const instance = new Engine3D();
        await instance.init(descriptor);
    }

    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._defaultInstance?.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        Engine3D._defaultInstance?.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._defaultInstance?.getRenderJob(view);
    }

    public static pause(): void {
        Engine3D._defaultInstance?.pause();
    }

    public static resume(): void {
        Engine3D._defaultInstance?.resume();
    }

    // ================================================================ //
    //  Instance methods
    // ================================================================ //

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    public get size(): number[] { return this.context3D.presentationSize; }
    public get aspect(): number { return this.context3D.aspect; }
    public get width(): number { return this.context3D.windowWidth; }
    public get height(): number { return this.context3D.windowHeight; }

    /**
     * Initialise this engine instance.
     * The first instance to call init() also becomes the default instance for the
     * backward-compatible static API.
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

        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // Per-instance subsystems
        this.time = new EngineTime();
        this.componentCollect = new ComponentCollect();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.globalBindGroup = new GlobalBindGroup();
        this.rtResourceMap = new RTResourceMap();
        this.entityCollect = new EntityCollect();
        this.gBufferMap = new Map<string, GBufferFrame>();
        this.renderJobs = new Map<View3D, RendererJob>();
        this.views = [];

        // Set as current so subsequent calls during init go to the right instance
        setCurrentEngine(this);
        Engine3D._defaultInstance ??= this;

        const isFirstInstance = Engine3D._defaultInstance === this;

        // WebGPU context — first instance uses the module singleton; additional
        // instances create their own Context3D and share the GPU device.
        if (isFirstInstance || !webGPUContext.device) {
            await webGPUContext.init(descriptor.canvasConfig);
            this.context3D = webGPUContext;
        } else {
            // Reuse the existing GPU adapter/device; only the canvas surface is new
            this.context3D = new Context3D();
            await this.context3D.initWithSharedDevice(
                webGPUContext.adapter,
                webGPUContext.device,
                descriptor.canvasConfig
            );
        }

        // Pre-compute reflection GBuffer sizes
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;

        if (isFirstInstance) {
            // One-time shared initialisation (shaders, WASM matrix pool)
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            ShaderLib.init();
            ShaderUtil.init();
        }

        // Per-instance GPU resource init (uses current engine context)
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context3D.canvas);
    }

    private _startRenderJob(view: View3D): RendererJob {
        // Ensure this engine is active so render-job constructors read the right settings
        setCurrentEngine(this);
        setWebGPUContext(this.context3D);
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
     * Register a view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        view.engine = this;
        // Ensure shadow-light buffer is registered in THIS engine's collector
        if (view.scene) this.shadowLightsCollect.createBuffer(view);
        this.views = [view];
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Register multiple views and start the render loop.
     */
    public startRenderViews(views: View3D[]): void {
        for (const view of views) {
            view.engine = this;
            if (view.scene) this.shadowLightsCollect.createBuffer(view);
        }
        this.views = views;
        for (const view of views) this._startRenderJob(view);
        this.resume();
    }

    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /** Pause the render loop for this engine instance. */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume the render loop for this engine instance. */
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
                await new Promise<void>((res) => {
                    setTimeout(() => {
                        time += (performance.now() - t);
                        res();
                    }, this._frameRateValue - delta);
                });
            }
            this._time = time;
        }

        // Activate this engine's context before any GPU work
        setCurrentEngine(this);
        setWebGPUContext(this.context3D);

        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        this.time.delta = time - this.time.time;
        this.time.time = time;
        this.time.frame += 1;
        Interpolator.tick(this.time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this.context3D.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        const cc = this.componentCollect;

        for (const [k, v] of cc.componentsBeforeUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        const command = webGPUContext.device.createCommandEncoder();
        for (const [k, v] of cc.componentsComputeList) {
            for (const [f, c] of v) {
                if (f.enable) c(k, command);
            }
        }
        webGPUContext.device.queue.submit([command.finish()]);

        for (const [k, v] of cc.componentsUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        for (const [k, v] of cc.graphicComponent) {
            for (const [f, c] of v) {
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop) await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        const globalMatrixBindGroup = this.globalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const [k, v] of cc.componentsLateUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        if (this._lateRender) await this._lateRender();
    }
}
