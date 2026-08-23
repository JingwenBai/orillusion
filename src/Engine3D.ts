import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { webGPUContext, Context3D, setWebGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { setActiveEngine } from './core/EngineContextHolder';

/**
 * Default engine setting shared as a starting point for new Engine3D instances.
 * @internal
 */
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

/** @internal set to true after WasmMatrix / ShaderLib are initialised for the first time */
let _sharedInitDone = false;

/**
 * Orillusion 3D Engine — instantiable for multi-instance support.
 *
 * **Single-instance (backward-compatible) usage:**
 * ```typescript
 * await Engine3D.init({ canvasConfig });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-instance usage:**
 * ```typescript
 * const engine1 = new Engine3D();
 * await engine1.init({ canvasConfig: { canvas: canvas1 } });
 * engine1.startRenderView(view1);
 *
 * const engine2 = new Engine3D();
 * await engine2.init({ canvasConfig: { canvas: canvas2 } });
 * engine2.startRenderView(view2);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // ------------------------------------------------------------------
    // Per-instance state
    // ------------------------------------------------------------------

    /** Resource manager for this engine instance */
    public res: Res;

    /** Input system for this engine instance */
    public inputSystem: InputSystem;

    /** Active render views for this engine instance */
    public views: View3D[];

    /** WebGPU canvas context owned by this engine instance */
    public context: Context3D;

    /** Per-engine component update lists */
    public componentCollect: ComponentCollect;

    /** Per-engine shadow light registry */
    public shadowLightsCollect: ShadowLightsCollect;

    /** Per-engine GPU bind groups (cameras, lights, matrix buffer) */
    public globalBindGroup: GlobalBindGroup;

    /** Per-engine render texture registry */
    public rtResourceMap: RTResourceMap;

    /** Per-engine GBuffer frame registry */
    public gBufferMap: Map<string, GBufferFrame> = new Map();

    /** Per-engine render jobs keyed by view */
    public renderJobs: Map<View3D, RendererJob>;

    /** Engine configuration — copied from the shared default on construction */
    public setting: EngineSetting;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        // Deep-clone the shared default setting so each engine is independent
        this.setting = JSON.parse(JSON.stringify(_defaultSetting));
        // Restore Color object (JSON.parse strips class info)
        const fog = this.setting.render?.postProcessing?.globalFog;
        if (fog) {
            fog.fogColor = new Color(96 / 255, 117 / 255, 133 / 255, 1);
        }
    }

    /** Frame rate for this engine instance */
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

    public get size(): number[] {
        return this.context.presentationSize;
    }

    public get aspect(): number {
        return this.context.aspect;
    }

    public get width(): number {
        return this.context.windowWidth;
    }

    public get height(): number {
        return this.context.windowHeight;
    }

    /**
     * Initialise this engine instance.
     * Creates a dedicated WebGPU canvas context; the underlying GPUDevice is
     * shared with all other engine instances on the same page.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // Mark this engine as active so all per-engine subsystems route correctly
        this._activateSelf();

        // Initialise shared WASM / shaders once across all engine instances
        if (!_sharedInitDone) {
            _sharedInitDone = true;
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            ShaderLib.init();
            ShaderUtil.init();
        }

        // Create this engine's own WebGPU canvas context (device is shared)
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);
        setWebGPUContext(this.context);

        //****pre compute setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );
        //****pre compute setting****/

        // Per-engine subsystems
        this.globalBindGroup = new GlobalBindGroup();
        this.globalBindGroup.init();

        this.shadowLightsCollect = new ShadowLightsCollect();
        this.shadowLightsCollect._globalBindGroup = this.globalBindGroup;

        this.rtResourceMap = new RTResourceMap();

        this.componentCollect = new ComponentCollect();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);

        // Register as default engine for static compat if not already set
        if (!Engine3D._defaultEngine) {
            Engine3D._defaultEngine = this;
        }
    }

    private _activateSelf() {
        setActiveEngine(this);
        setWebGPUContext(this.context ?? webGPUContext);
    }

    private _startRenderJob(view: View3D): RendererJob {
        // Link view to this engine before subsystems query it
        view.engine = this;

        // Ensure shadow buffer exists for this view's scene
        this.shadowLightsCollect.createBuffer(view);

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
     * Attach a view and start the render loop for this engine instance.
     */
    public startRenderView(view: View3D): RendererJob {
        this._activateSelf();
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Attach multiple views and start the render loop for this engine instance.
     */
    public startRenderViews(views: View3D[]) {
        this._activateSelf();
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /** Get the render job for a view */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /** Pause this engine's render loop */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume this engine's render loop */
    public resume() {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    private async _render(time: number) {
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

    private async _updateFrame(time: number) {
        // Activate this engine: route all per-engine singleton access here,
        // and update the module-level webGPUContext to this canvas.
        this._activateSelf();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        let views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        for (const iterator of this.componentCollect.componentsBeforeUpdateList) {
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

        let command = this.context.device.createCommandEncoder();
        for (const iterator of this.componentCollect.componentsComputeList) {
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

        this.context.device.queue.submit([command.finish()]);

        for (const iterator of this.componentCollect.componentsUpdateList) {
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

        for (const iterator of this.componentCollect.graphicComponent) {
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
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        let globalMatrixBindGroup = this.globalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        for (const iterator of this.componentCollect.componentsLateUpdateList) {
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

        if (this._lateRender)
            await this._lateRender();
    }

    // ------------------------------------------------------------------
    // Static backward-compatibility API
    //
    // All existing single-instance code (Engine3D.init / Engine3D.startRenderView
    // etc.) continues to work unchanged.  The static methods simply delegate
    // to the default engine instance.
    // ------------------------------------------------------------------

    /** @internal The default engine instance created by the static API */
    private static _defaultEngine: Engine3D | null = null;

    /**
     * Shared engine setting — kept as a static property so that code like
     * `Engine3D.setting.shadow.enable = false` before `Engine3D.init()` works
     * as before.  New instances copy this on construction.
     */
    public static setting: EngineSetting = _defaultSetting;

    /** @internal */
    public static renderJobs: Map<View3D, RendererJob>;

    /** @internal */
    public static res: Res;

    /** @internal */
    public static inputSystem: InputSystem;

    /** @internal */
    public static views: View3D[];

    /**
     * Initialise the engine (single-instance / backward-compatible entry point).
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}) {
        const engine = new Engine3D();
        // Carry over any pre-init settings the user set on the static property
        engine.setting = { ...Engine3D.setting, ...descriptor.engineSetting };

        Engine3D._defaultEngine = engine;
        await engine.init(descriptor);

        // Mirror instance state onto static properties for legacy access
        Engine3D.res = engine.res;
        Engine3D.inputSystem = engine.inputSystem;
        Engine3D.views = engine.views;
        Engine3D.renderJobs = engine.renderJobs;

        return engine;
    }

    public static get frameRate(): number {
        return Engine3D._defaultEngine?._frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (Engine3D._defaultEngine) Engine3D._defaultEngine.frameRate = value;
    }

    public static get size(): number[] {
        return Engine3D._defaultEngine?.size ?? [0, 0];
    }
    public static get aspect(): number {
        return Engine3D._defaultEngine?.aspect ?? 1;
    }
    public static get width(): number {
        return Engine3D._defaultEngine?.width ?? 0;
    }
    public static get height(): number {
        return Engine3D._defaultEngine?.height ?? 0;
    }

    public static startRenderView(view: View3D): RendererJob {
        const job = Engine3D._defaultEngine?.startRenderView(view);
        Engine3D.views = Engine3D._defaultEngine?.views;
        Engine3D.renderJobs = Engine3D._defaultEngine?.renderJobs;
        return job;
    }

    public static startRenderViews(views: View3D[]) {
        Engine3D._defaultEngine?.startRenderViews(views);
        Engine3D.views = Engine3D._defaultEngine?.views;
        Engine3D.renderJobs = Engine3D._defaultEngine?.renderJobs;
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._defaultEngine?.getRenderJob(view);
    }

    public static pause() {
        Engine3D._defaultEngine?.pause();
    }

    public static resume() {
        Engine3D._defaultEngine?.resume();
    }
}
