import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveWebGPUContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap, setActiveRTResourceMap } from './gfx/renderJob/frame/RTResourceMap';
import { GBufferFrame, setActiveGBufferMap } from './gfx/renderJob/frame/GBufferFrame';

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

// Default settings object - used as template for each new Engine3D instance
const _defaultSetting: EngineSetting = {
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
 * Orillusion 3D Engine
 *
 * Supports multiple simultaneous instances, each bound to its own canvas.
 *
 * Single-instance usage (backward compatible):
 *   await Engine3D.init({ canvasConfig: { ... } });
 *   Engine3D.startRenderView(view);
 *
 * Multi-instance usage:
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

    // =====================================================================
    // STATIC STATE: active engine registry
    // =====================================================================

    /** Currently active Engine3D instance (set before each frame renders) */
    public static current: Engine3D | null = null;

    /** All registered Engine3D instances */
    public static readonly instances: Engine3D[] = [];

    // =====================================================================
    // STATIC GETTERS/SETTERS: backward-compatible API delegating to current
    // =====================================================================

    /** resource manager - delegates to active engine instance */
    public static get res(): Res {
        return Engine3D.current?._res!;
    }
    public static set res(v: Res) {
        if (Engine3D.current) Engine3D.current._res = v;
    }

    /** input system - delegates to active engine instance */
    public static get inputSystem(): InputSystem {
        return Engine3D.current?._inputSystem!;
    }
    public static set inputSystem(v: InputSystem) {
        if (Engine3D.current) Engine3D.current._inputSystem = v;
    }

    /** active views - delegates to active engine instance */
    public static get views(): View3D[] {
        return Engine3D.current?._views!;
    }
    public static set views(v: View3D[]) {
        if (Engine3D.current) Engine3D.current._views = v;
    }

    /** render jobs map - delegates to active engine instance */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D.current?._renderJobs!;
    }

    /** engine settings - delegates to active engine instance */
    public static get setting(): EngineSetting {
        return Engine3D.current?._setting ?? _defaultSetting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D.current) Engine3D.current._setting = v;
    }

    /** frame rate - delegates to active engine instance */
    public static get frameRate(): number {
        return Engine3D.current?._frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (Engine3D.current) Engine3D.current.frameRate = value;
    }

    /** render window size */
    public static get size(): number[] {
        return Engine3D.current?._context3D?.presentationSize ?? [0, 0];
    }

    /** render window aspect ratio */
    public static get aspect(): number {
        return Engine3D.current?._context3D?.aspect ?? 1;
    }

    /** render window width */
    public static get width(): number {
        return Engine3D.current?._context3D?.windowWidth ?? 0;
    }

    /** render window height */
    public static get height(): number {
        return Engine3D.current?._context3D?.windowHeight ?? 0;
    }

    // =====================================================================
    // STATIC METHODS: backward-compatible API, create/delegate to instance
    // =====================================================================

    /**
     * Create and initialize a new engine instance (backward-compatible static API).
     * The new instance becomes Engine3D.current.
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {
        const engine = new Engine3D();
        await engine.init(descriptor);
    }

    /** Set render view and start renderer (delegates to current engine) */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D.current!.startRenderView(view);
    }

    /** Set render views and start renderer (delegates to current engine) */
    public static startRenderViews(views: View3D[]): void {
        Engine3D.current!.startRenderViews(views);
    }

    /** Get view render job instance (delegates to current engine) */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.current!.getRenderJob(view);
    }

    /** Pause the engine render (delegates to current engine) */
    public static pause(): void {
        Engine3D.current?.pause();
    }

    /** Resume the engine render (delegates to current engine) */
    public static resume(): void {
        Engine3D.current?.resume();
    }

    // =====================================================================
    // INSTANCE STATE: per-engine private fields
    // =====================================================================

    private _res: Res;
    private _inputSystem: InputSystem;
    private _views: View3D[];
    private _renderJobs: Map<View3D, RendererJob>;
    private _context3D: Context3D;
    private _rtResourceMap: RTResourceMap;
    private _gBufferMap: Map<string, GBufferFrame>;
    private _setting: EngineSetting;
    private _frameRate: number = 360;
    private _frameRateValue: number = 0;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;
    private _viewsSet: Set<View3D> = new Set();

    // =====================================================================
    // INSTANCE GETTERS/SETTERS
    // =====================================================================

    /** Instance-level frameRate getter */
    public get frameRate(): number {
        return this._frameRate;
    }

    /** Instance-level frameRate setter */
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) {
            this._frameRateValue = 0;
        }
    }

    // =====================================================================
    // INSTANCE METHODS
    // =====================================================================

    /**
     * Activate this engine instance: set as Engine3D.current and configure
     * all per-engine subsystems (webGPUContext, RTResourceMap, GBufferMap).
     * Called before init and before each frame render.
     */
    public activate(): void {
        Engine3D.current = this;
        if (this._context3D) setActiveWebGPUContext(this._context3D);
        if (this._rtResourceMap) setActiveRTResourceMap(this._rtResourceMap);
        if (this._gBufferMap) setActiveGBufferMap(this._gBufferMap);
    }

    /**
     * Initialize this engine instance. Creates its own WebGPU context,
     * RTResourceMap, and GBufferMap, then runs the standard engine setup.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Per-instance settings: deep-copy defaults then apply overrides
        this._setting = { ..._defaultSetting, ...descriptor.engineSetting };

        // Create per-instance subsystems
        this._context3D = new Context3D();
        this._rtResourceMap = new RTResourceMap();
        this._gBufferMap = new Map<string, GBufferFrame>();

        // Register and activate
        Engine3D.instances.push(this);
        this.activate();

        await WasmMatrix.init(Matrix4.allocCount, this._setting.doublePrecision);

        await this._context3D.init(descriptor.canvasConfig);

        // After canvas init, re-activate so webGPUContext proxy sees the configured canvas
        setActiveWebGPUContext(this._context3D);

        // Pre-compute reflection settings
        this._setting.reflectionSetting.width = this._setting.reflectionSetting.reflectionProbeSize * 6;
        this._setting.reflectionSetting.height = this._setting.reflectionSetting.reflectionProbeSize * this._setting.reflectionSetting.reflectionProbeMaxCount;

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this._setting.reflectionSetting.width,
            this._setting.reflectionSetting.height,
            false
        );

        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        RTResourceMap.init(); // no-op; kept for compatibility
        ShadowLightsCollect.init();

        this._res = new Res();
        this._res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this._inputSystem = new InputSystem();
        this._inputSystem.initCanvas(this._context3D.canvas);
        return;
    }

    private startRenderJob(view: View3D): RendererJob {
        let renderJob = new ForwardRenderJob(view);
        this._renderJobs.set(view, renderJob);

        if (this._setting.pick.mode == `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this._setting.pick.mode == `pixel` || this._setting.pick.mode == `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Set render view and start renderer for this engine instance.
     */
    public startRenderView(view: View3D): RendererJob {
        this._renderJobs ||= new Map<View3D, RendererJob>();
        this._views = [view];
        this._viewsSet = new Set([view]);
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set render views and start renderer for this engine instance.
     */
    public startRenderViews(views: View3D[]): void {
        this._renderJobs ||= new Map<View3D, RendererJob>();
        this._views = views;
        this._viewsSet = new Set(views);
        for (let i = 0; i < views.length; i++) {
            this.startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get render job for a view belonging to this engine instance.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this._renderJobs.get(view);
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
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
    }

    private async render(time: number) {
        // Activate this engine before rendering so all subsystems use its context
        this.activate();

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
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        /* update all transform */
        let views = this._views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        /****** auto before update with component list (this engine's views only) *****/
        for (const [k, v] of ComponentCollect.componentsBeforeUpdateList) {
            if (!this._viewsSet.has(k)) continue;
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        let command = webGPUContext.device.createCommandEncoder();;
        for (const [k, v] of ComponentCollect.componentsComputeList) {
            if (!this._viewsSet.has(k)) continue;
            for (const [f, c] of v) {
                if (f.enable) c(k, command);
            }
        }

        webGPUContext.device.queue.submit([command.finish()]);

        /****** auto update with component list (this engine's views only) *****/
        for (const [k, v] of ComponentCollect.componentsUpdateList) {
            if (!this._viewsSet.has(k)) continue;
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        for (const [k, v] of ComponentCollect.graphicComponent) {
            if (!this._viewsSet.has(k)) continue;
            for (const [f, c] of v) {
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        /****** auto update global matrix share buffer write to gpu *****/
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this._renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        /****** auto late update with component list (this engine's views only) *****/
        for (const [k, v] of ComponentCollect.componentsLateUpdateList) {
            if (!this._viewsSet.has(k)) continue;
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
