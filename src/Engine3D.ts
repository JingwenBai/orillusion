import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveWebGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { setActiveEngineId } from './core/EngineID';

let _engineIdCounter = 0;

/**
 * Orillusion 3D Engine
 *
 * Single-instance (backward compat):
 *   Engine3D.setting.xxx = yyy;
 *   await Engine3D.init({ canvasConfig: { ... } });
 *   Engine3D.startRenderView(view);
 *
 * Multi-instance:
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

    // ===================================================================
    // Static shared settings (configurable before init)
    // ===================================================================

    /**
     * engine setting (shared default, applied to each new engine instance)
     */
    public static setting: EngineSetting = {
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
            lerpHysteresis: 0.01,//The smaller the value, the slower the reaction, which can counteract flickering
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
            defaultFar: 65536,//can't be too big
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

    // ===================================================================
    // Static proxy API (backward compat — routes to the active engine)
    // ===================================================================

    /** @internal The engine instance currently executing a frame (or the last initialized engine). */
    public static _activeEngine: Engine3D | null = null;

    /** resource manager — proxied to the active engine instance */
    public static get res(): Res { return Engine3D._activeEngine?._res; }
    public static set res(v: Res) { if (Engine3D._activeEngine) Engine3D._activeEngine._res = v; }

    /** input system — proxied to the active engine instance */
    public static get inputSystem(): InputSystem { return Engine3D._activeEngine?._inputSystem; }

    /** active views — proxied to the active engine instance */
    public static get views(): View3D[] { return Engine3D._activeEngine?._views; }
    public static set views(v: View3D[]) { if (Engine3D._activeEngine) Engine3D._activeEngine._views = v; }

    /** render jobs map — proxied to the active engine instance */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._activeEngine?._renderJobs; }

    /** frame rate — proxied to the active engine instance */
    public static get frameRate(): number { return Engine3D._activeEngine?._frameRate ?? 360; }
    public static set frameRate(v: number) { if (Engine3D._activeEngine) Engine3D._activeEngine.frameRate = v; }

    /** render window size [width, height] */
    public static get size(): number[] { return Engine3D._activeEngine?.size; }

    /** render window aspect ratio */
    public static get aspect(): number { return Engine3D._activeEngine?.aspect; }

    /** render window width */
    public static get width(): number { return Engine3D._activeEngine?.width; }

    /** render window height */
    public static get height(): number { return Engine3D._activeEngine?.height; }

    /**
     * Initialize the engine (backward-compat static API).
     * Creates a new Engine3D instance, initializes it, and sets it as the active engine.
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function; engineSetting?: EngineSetting } = {}): Promise<Engine3D> {
        const engine = new Engine3D();
        await engine.init(descriptor);
        return engine;
    }

    /** set render view and start renderer (backward-compat static API) */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._activeEngine?.startRenderView(view);
    }

    /** set render views and start renderer (backward-compat static API) */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._activeEngine?.startRenderViews(views);
    }

    /** get view render job instance (backward-compat static API) */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._activeEngine?.getRenderJob(view);
    }

    /** Pause the engine render (backward-compat static API) */
    public static pause(): void { Engine3D._activeEngine?.pause(); }

    /** Resume the engine render (backward-compat static API) */
    public static resume(): void { Engine3D._activeEngine?.resume(); }

    // ===================================================================
    // Instance state
    // ===================================================================

    /** Unique identifier for this engine instance */
    public readonly engineId: string;

    /** Per-instance WebGPU context (canvas + device) */
    public webGPUContext: Context3D;

    private _res: Res;
    private _inputSystem: InputSystem;
    private _views: View3D[];
    private _renderJobs: Map<View3D, RendererJob>;
    private _frameRate: number = 360;
    private _frameRateValue: number = 0;
    private _time: number = 0;
    private _engineTime: number = 0;
    private _engineFrame: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.engineId = `engine_${_engineIdCounter++}`;
    }

    // ===================================================================
    // Instance getters / setters
    // ===================================================================

    /** resource manager */
    public get res(): Res { return this._res; }

    /** input system */
    public get inputSystem(): InputSystem { return this._inputSystem; }

    /** active views */
    public get views(): View3D[] { return this._views; }
    public set views(v: View3D[]) { this._views = v; }

    /** render jobs map */
    public get renderJobs(): Map<View3D, RendererJob> { return this._renderJobs; }

    /**
     * set/get engine render frameRate (24/30/60/114/120/144/240/360 fps or other)
     */
    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    /** render window size [width, height] */
    public get size(): number[] { return this.webGPUContext.presentationSize; }

    /** render window aspect ratio */
    public get aspect(): number { return this.webGPUContext.aspect; }

    /** render window width */
    public get width(): number { return this.webGPUContext.windowWidth; }

    /** render window height */
    public get height(): number { return this.webGPUContext.windowHeight; }

    // ===================================================================
    // Instance methods
    // ===================================================================

    /**
     * Initialize this engine instance.
     * @param descriptor  configuration object
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function; engineSetting?: EngineSetting } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        Engine3D.setting = { ...Engine3D.setting, ...descriptor.engineSetting };

        // Set this engine as active so all per-engine singletons resolve correctly
        this._setAsCurrent();

        // Initialize WasmMatrix once (shared across all engine instances)
        if (!WasmMatrix.wasm) {
            await WasmMatrix.init(Matrix4.allocCount, Engine3D.setting.doublePrecision);
        }

        // Create and initialize per-engine WebGPU context
        this.webGPUContext = new Context3D();
        setActiveWebGPUContext(this.webGPUContext);
        await this.webGPUContext.init(descriptor.canvasConfig);

        //****pre compute setting****/
        Engine3D.setting.reflectionSetting.width = Engine3D.setting.reflectionSetting.reflectionProbeSize * 6;
        Engine3D.setting.reflectionSetting.height = Engine3D.setting.reflectionSetting.reflectionProbeSize * Engine3D.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            Engine3D.setting.reflectionSetting.width,
            Engine3D.setting.reflectionSetting.height,
            false
        );
        //****pre compute setting****/

        ShaderLib.init();

        ShaderUtil.init();

        GlobalBindGroup.init();

        RTResourceMap.init();

        ShadowLightsCollect.init();

        this._res = new Res();
        this._res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this._inputSystem = new InputSystem();
        this._inputSystem.initCanvas(this.webGPUContext.canvas);

        // Ensure this engine remains the active one after init
        Engine3D._activeEngine = this;
    }

    private _startRenderJob(view: View3D): RendererJob {
        let renderJob = new ForwardRenderJob(view);
        this._renderJobs.set(view, renderJob);

        if (Engine3D.setting.pick.mode == `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (Engine3D.setting.pick.mode == `pixel` || Engine3D.setting.pick.mode == `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Set render view and start renderer
     */
    public startRenderView(view: View3D): RendererJob {
        this._renderJobs ||= new Map<View3D, RendererJob>();
        this._views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set render views and start renderer
     */
    public startRenderViews(views: View3D[]): void {
        this._renderJobs ||= new Map<View3D, RendererJob>();
        this._views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get view render job instance
     */
    public getRenderJob(view: View3D): RendererJob {
        return this._renderJobs.get(view);
    }

    /**
     * Pause the engine render
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the engine render
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    /** Activate this engine: update global singletons to point to this instance */
    private _setAsCurrent(): void {
        Engine3D._activeEngine = this;
        setActiveEngineId(this.engineId);
        if (this.webGPUContext) {
            setActiveWebGPUContext(this.webGPUContext);
        }
    }

    private async _render(time: number): Promise<void> {
        this._setAsCurrent();

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
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        this._setAsCurrent();

        // Update global Time from this engine's per-instance state
        Time.delta = time - this._engineTime;
        Time.time = time;
        Time.frame = ++this._engineFrame;
        this._engineTime = time;

        Interpolator.tick(Time.delta);

        /* update all transform */
        const views = this._views;
        // Build a Set of this engine's views for O(1) membership check
        const ownedViews = new Set<View3D>(views);
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        /****** auto before update with component list (this engine's views only) *****/
        for (const iterator of ComponentCollect.componentsBeforeUpdateList) {
            let k = iterator[0];
            if (!ownedViews.has(k)) continue;
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                };
            }
        }

        let command = this.webGPUContext.device.createCommandEncoder();
        for (const iterator of ComponentCollect.componentsComputeList) {
            let k = iterator[0];
            if (!ownedViews.has(k)) continue;
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k, command);
                };
            }
        }

        this.webGPUContext.device.queue.submit([command.finish()]);

        /****** auto update with component list (this engine's views only) *****/
        for (const iterator of ComponentCollect.componentsUpdateList) {
            let k = iterator[0];
            if (!ownedViews.has(k)) continue;
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                };
            }
        }

        for (const iterator of ComponentCollect.graphicComponent) {
            let k = iterator[0];
            if (!ownedViews.has(k)) continue;
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (k && f.enable) {
                    c(k);
                };
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
        for (const iterator of ComponentCollect.componentsLateUpdateList) {
            let k = iterator[0];
            if (!ownedViews.has(k)) continue;
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                };
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
