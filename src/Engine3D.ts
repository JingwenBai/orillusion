import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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

/**
 * Default engine setting shared by all Engine3D instances unless overridden per-instance.
 * @group engine3D
 */
const defaultEngineSetting: EngineSetting = {
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
 * Orillusion 3D Engine — now instantiable for multi-instance support.
 *
 * **New (multi-instance) usage:**
 * ```ts
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas: myCanvas } });
 * engine.startRenderView(view);
 * ```
 *
 * **Legacy (single-instance) usage unchanged:**
 * ```ts
 * await Engine3D.init();
 * Engine3D.startRenderView(view);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // -------------------------------------------------------------------------
    // Per-instance state
    // -------------------------------------------------------------------------

    /** resource manager */
    public res: Res;

    /** input system */
    public inputSystem: InputSystem;

    /** active views */
    public views: View3D[];

    /** per-view render jobs */
    public renderJobs: Map<View3D, RendererJob>;

    /** per-instance engine setting */
    public setting: EngineSetting;

    /** WebGPU context (canvas + surface) owned by this engine instance */
    public readonly context: Context3D;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.context = new Context3D();
        // Deep-clone the default setting so each instance has its own copy
        this.setting = JSON.parse(JSON.stringify(defaultEngineSetting));
        // Restore non-serializable Color objects in fogColor
        const fog = this.setting.render.postProcessing.globalFog;
        const defFog = defaultEngineSetting.render.postProcessing.globalFog;
        fog.fogColor = new Color(defFog.fogColor.r, defFog.fogColor.g, defFog.fogColor.b, defFog.fogColor.a);
    }

    // -------------------------------------------------------------------------
    // Per-instance getters mirroring legacy static getters
    // -------------------------------------------------------------------------

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    public get size(): number[] { return this.context.presentationSize; }
    public get aspect(): number { return this.context.aspect; }
    public get width(): number { return this.context.windowWidth; }
    public get height(): number { return this.context.windowHeight; }

    // -------------------------------------------------------------------------
    // Instance init
    // -------------------------------------------------------------------------

    /**
     * Initialise this Engine3D instance on a specific canvas.
     * Multiple Engine3D instances may coexist; they share one GPU device.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        this.setting = { ...this.setting, ...descriptor.engineSetting };

        const isFirstInstance = !Context3D.sharedDevice;

        if (isFirstInstance) {
            console.log('Engine Version', version);
            if (!window.isSecureContext) {
                console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
            }
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        await this.context.init(descriptor.canvasConfig);

        // On first instance: initialise shared/global subsystems.
        // These only need to be set up once for the shared GPU device.
        if (isFirstInstance) {
            // Set global webGPUContext to this instance's context for backward compat
            setActiveContext(this.context);

            this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
            this.setting.reflectionSetting.height =
                this.setting.reflectionSetting.reflectionProbeSize *
                this.setting.reflectionSetting.reflectionProbeMaxCount;

            GBufferFrame.getGBufferFrame(
                GBufferFrame.reflections_GBuffer,
                this.setting.reflectionSetting.width,
                this.setting.reflectionSetting.height,
                false
            );

            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            RTResourceMap.init();
            ShadowLightsCollect.init();
        }

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);
    }

    // -------------------------------------------------------------------------
    // Instance rendering
    // -------------------------------------------------------------------------

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

    /** Set render view and start renderer */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        view.engine = this;
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /** Set render views and start renderer */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            views[i].engine = this;
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /** Get view render job instance */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /** Pause the engine render */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume the engine render */
    public resume(): void {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
    }

    /** @internal */
    private async _render(time: number): Promise<void> {
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
        // Switch global webGPUContext to this instance's context for the duration
        // of this frame so all rendering subsystems see the right canvas/surface.
        setActiveContext(this.context);
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        // Build a Set of views owned by this engine for per-engine filtering
        const ownedViews = new Set<View3D>(this.views);

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

        // Only process components that belong to this engine's views
        for (const [view, viewComponents] of ComponentCollect.componentsBeforeUpdateList) {
            if (!ownedViews.has(view)) continue;
            for (const [f, c] of viewComponents) {
                if (f.enable) c(view);
            }
        }

        let command = this.context.device.createCommandEncoder();
        for (const [view, viewComponents] of ComponentCollect.componentsComputeList) {
            if (!ownedViews.has(view)) continue;
            for (const [f, c] of viewComponents) {
                if (f.enable) c(view, command);
            }
        }

        this.context.device.queue.submit([command.finish()]);

        for (const [view, viewComponents] of ComponentCollect.componentsUpdateList) {
            if (!ownedViews.has(view)) continue;
            for (const [f, c] of viewComponents) {
                if (f.enable) c(view);
            }
        }

        for (const [view, viewComponents] of ComponentCollect.graphicComponent) {
            if (!ownedViews.has(view)) continue;
            for (const [f, c] of viewComponents) {
                if (view && f.enable) c(view);
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);

        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) { v.start(); }
            v.renderFrame();
        });

        for (const [view, viewComponents] of ComponentCollect.componentsLateUpdateList) {
            if (!ownedViews.has(view)) continue;
            for (const [f, c] of viewComponents) {
                if (f.enable) c(view);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // =========================================================================
    // Static backward-compatible API
    // All static members delegate to Engine3D._default, the first instance
    // created via the static Engine3D.init() call.
    // =========================================================================

    private static _default: Engine3D;

    // Static setting object — kept as a true static property so that code
    // which writes Engine3D.setting.xxx before calling init() still works.
    // After init(), _default.setting is the live copy; this static acts as the
    // pre-init staging area and is merged into the instance during init().
    public static setting: EngineSetting = defaultEngineSetting;

    public static get res(): Res { return Engine3D._default?.res; }
    public static set res(v: Res) { if (Engine3D._default) Engine3D._default.res = v; }

    public static get inputSystem(): InputSystem { return Engine3D._default?.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D._default) Engine3D._default.inputSystem = v; }

    public static get views(): View3D[] { return Engine3D._default?.views; }
    public static set views(v: View3D[]) { if (Engine3D._default) Engine3D._default.views = v; }

    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._default?.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { if (Engine3D._default) Engine3D._default.renderJobs = v; }

    public static get frameRate(): number { return Engine3D._default?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (Engine3D._default) Engine3D._default.frameRate = value; }

    public static get size(): number[] { return Engine3D._default?.size; }
    public static get aspect(): number { return Engine3D._default?.aspect; }
    public static get width(): number { return Engine3D._default?.width; }
    public static get height(): number { return Engine3D._default?.height; }

    /**
     * Create the default single Engine3D instance and initialise it.
     * This is the backward-compatible entry point.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        // Merge any pre-init static setting mutations into the descriptor
        descriptor.engineSetting = { ...Engine3D.setting, ...descriptor.engineSetting };

        Engine3D._default = new Engine3D();
        await Engine3D._default.init(descriptor);

        // Keep the static setting reference in sync with the instance
        Engine3D.setting = Engine3D._default.setting;
    }

    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._default.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        Engine3D._default.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._default.getRenderJob(view);
    }

    public static pause(): void { Engine3D._default?.pause(); }
    public static resume(): void { Engine3D._default?.resume(); }
}
