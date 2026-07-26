import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveContext } from './gfx/graphics/webGpu/Context3D';
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
 * Default engine settings shared as the initial value for every Engine3D instance.
 * @internal
 */
const DEFAULT_ENGINE_SETTING: EngineSetting = {
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
 * Orillusion 3D Engine.
 *
 * **Single-instance (backward-compat) usage:**
 * ```ts
 * Engine3D.setting.xxx = ...;
 * await Engine3D.init({ canvasConfig });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-instance usage:**
 * ```ts
 * const engine1 = new Engine3D();
 * await engine1.init({ canvasConfig: { canvas: canvas1 } });
 * engine1.startRenderView(view1);
 *
 * const engine2 = new Engine3D();
 * await engine2.init({ canvasConfig: { canvas: canvas2 } });
 * engine2.startRenderView(view2);
 * ```
 * @group engine3D
 */
export class Engine3D {

    // =========================================================
    // INSTANCE STATE
    // =========================================================

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine instance's canvas. */
    public inputSystem: InputSystem;

    /** Active render views for this engine instance. */
    public views: View3D[];

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /** Engine settings for this instance (deep-cloned from defaults at construction time). */
    public setting: EngineSetting;

    /** WebGPU context (canvas + GPU device) for this engine instance. */
    public context: Context3D;

    // Per-instance subsystem managers
    /** @internal */ public componentCollect: ComponentCollect;
    /** @internal */ public shadowLightsCollect: ShadowLightsCollect;
    /** @internal */ public globalBindGroup: GlobalBindGroup;
    /** @internal */ public rtResourceMap: RTResourceMap;

    // Per-instance render-loop state
    private _frameRate: number = 360;
    private _frameRateValue: number = 0;
    private _time: number = 0;
    private _requestAnimationFrameID: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;

    constructor() {
        // Deep-clone defaults so each instance has independent settings.
        this.setting = JSON.parse(JSON.stringify(DEFAULT_ENGINE_SETTING));
        // Restore the Color object that JSON.parse would have flattened.
        this.setting.render.postProcessing.globalFog.fogColor = new Color(96 / 255, 117 / 255, 133 / 255, 1);

        this.views = [];
        this.renderJobs = new Map();

        this.componentCollect = new ComponentCollect();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.globalBindGroup = new GlobalBindGroup();
        this.rtResourceMap = new RTResourceMap();
    }

    // -------------------------
    // Instance getters / setters
    // -------------------------

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    public get size(): number[] { return this.context?.presentationSize ?? [0, 0]; }
    public get aspect(): number { return this.context?.aspect ?? 1; }
    public get width(): number { return this.context?.windowWidth ?? 0; }
    public get height(): number { return this.context?.windowHeight ?? 0; }

    // -------------------------
    // Instance init
    // -------------------------

    /**
     * Initialize this engine instance on its own canvas.
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

        // WASM matrix buffer is currently shared — only init once globally.
        if (!Engine3D._wasmInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            Engine3D._wasmInitialized = true;
        }

        // Per-instance WebGPU context (separate canvas, separate swap-chain).
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);

        // Activate this engine as the "current" so that shader/pipeline init works.
        Engine3D._setCurrent(this);

        //****pre compute reflection setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );
        //****end pre compute****/

        // Shared singletons — ShaderLib and ShaderUtil can be shared across engines
        // because they compile WGSL for the same GPU device family.
        if (!Engine3D._shaderInitialized) {
            ShaderLib.init();
            ShaderUtil.init();
            Engine3D._shaderInitialized = true;
        }

        GlobalBindGroup.setCurrent(this.globalBindGroup);

        RTResourceMap.setCurrent(this.rtResourceMap);

        ShadowLightsCollect.setCurrent(this.shadowLightsCollect);

        ComponentCollect.setCurrent(this.componentCollect);

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);

        Engine3D.instances.push(this);
    }

    // -------------------------
    // Instance render control
    // -------------------------

    private _startRenderJob(view: View3D): RendererJob {
        view.engine = this;
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

    /** Set render view and start the render loop for this engine instance. */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map();
        this.views = [view];
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /** Set multiple render views and start the render loop for this engine instance. */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /** Get the RendererJob for a given view. */
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
        // Activate this engine's context and managers before rendering.
        Engine3D._setCurrent(this);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        for (const iterator of this.componentCollect.componentsBeforeUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        const command = this.context.device.createCommandEncoder();
        for (const iterator of this.componentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k, command);
            }
        }
        this.context.device.queue.submit([command.finish()]);

        for (const iterator of this.componentCollect.componentsUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        for (const iterator of this.componentCollect.graphicComponent) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
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

        for (const iterator of this.componentCollect.componentsLateUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        if (this._lateRender) await this._lateRender();
    }

    // =========================================================
    // STATIC INFRASTRUCTURE
    // =========================================================

    /** All active Engine3D instances. */
    public static instances: Engine3D[] = [];

    // One-time global init flags for shared resources.
    private static _wasmInitialized: boolean = false;
    private static _shaderInitialized: boolean = false;

    // The "default" instance — created by the static Engine3D.init() for backward compat.
    private static _default: Engine3D | null = null;

    /**
     * @internal
     * Activate an engine instance as the current one:
     * - Sets the module-level webGPUContext to this engine's canvas context.
     * - Switches all static manager proxies to this engine's managers.
     * - Switches the active GBufferFrame map to this engine's map.
     * - Updates _default so static getters (e.g. Engine3D.setting) reflect the active engine.
     */
    private static _setCurrent(engine: Engine3D): void {
        Engine3D._default = engine;
        setActiveContext(engine.context);
        ComponentCollect.setCurrent(engine.componentCollect);
        ShadowLightsCollect.setCurrent(engine.shadowLightsCollect);
        GlobalBindGroup.setCurrent(engine.globalBindGroup);
        RTResourceMap.setCurrent(engine.rtResourceMap);
        GBufferFrame.setCurrent(engine);
    }

    // =========================================================
    // STATIC API — backward-compat single-instance API
    // All static members delegate to Engine3D._default.
    // =========================================================

    /**
     * Resource manager (backward compat — single-instance).
     */
    public static get res(): Res { return Engine3D._default?.res; }
    public static set res(value: Res) { if (Engine3D._default) Engine3D._default.res = value; }

    /**
     * Input system (backward compat — single-instance).
     */
    public static get inputSystem(): InputSystem { return Engine3D._default?.inputSystem; }
    public static set inputSystem(value: InputSystem) { if (Engine3D._default) Engine3D._default.inputSystem = value; }

    /**
     * Active render views (backward compat — single-instance).
     */
    public static get views(): View3D[] { return Engine3D._default?.views; }
    public static set views(value: View3D[]) { if (Engine3D._default) Engine3D._default.views = value; }

    /**
     * @internal
     */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._default?.renderJobs; }
    public static set renderJobs(value: Map<View3D, RendererJob>) { if (Engine3D._default) Engine3D._default.renderJobs = value; }

    /**
     * Engine settings (backward compat — single-instance).
     * Accessing Engine3D.setting before init() returns a mutable proxy of defaults;
     * mutations made to it before init() are picked up by the first init() call.
     */
    public static get setting(): EngineSetting {
        if (Engine3D._default) return Engine3D._default.setting;
        if (!Engine3D._defaultSettingProxy) {
            Engine3D._defaultSettingProxy = JSON.parse(JSON.stringify(DEFAULT_ENGINE_SETTING));
            // Restore the Color instance that JSON.parse flattens.
            Engine3D._defaultSettingProxy.render.postProcessing.globalFog.fogColor =
                new Color(96 / 255, 117 / 255, 133 / 255, 1);
        }
        return Engine3D._defaultSettingProxy;
    }
    public static set setting(value: EngineSetting) {
        if (Engine3D._default) {
            Engine3D._default.setting = value;
        } else {
            Engine3D._defaultSettingProxy = value;
        }
    }

    // Lazy fallback settings object for code that reads Engine3D.setting before init().
    private static _defaultSettingProxy: EngineSetting | null = null;

    public static get size(): number[] { return Engine3D._default?.size ?? [0, 0]; }
    public static get aspect(): number { return Engine3D._default?.aspect ?? 1; }
    public static get width(): number { return Engine3D._default?.width ?? 0; }
    public static get height(): number { return Engine3D._default?.height ?? 0; }

    public static get frameRate(): number { return Engine3D._default?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (Engine3D._default) Engine3D._default.frameRate = value; }

    /**
     * Initialize the default (single-instance) engine.
     * For multi-instance usage, call `new Engine3D()` and use the instance API directly.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        // If users mutated Engine3D.setting before calling init(), pick up those mutations.
        if (Engine3D._defaultSettingProxy) {
            // Deep-merge: copy each top-level sub-object from the proxy into the engine setting.
            for (const key of Object.keys(Engine3D._defaultSettingProxy) as (keyof EngineSetting)[]) {
                const proxyVal = Engine3D._defaultSettingProxy[key];
                if (proxyVal !== null && typeof proxyVal === 'object' && !Array.isArray(proxyVal)) {
                    Object.assign(engine.setting[key] as object, proxyVal);
                } else {
                    (engine.setting as any)[key] = proxyVal;
                }
            }
            // Restore Color after the merge.
            engine.setting.render.postProcessing.globalFog.fogColor =
                new Color(96 / 255, 117 / 255, 133 / 255, 1);
        }
        Engine3D._default = engine;
        await engine.init(descriptor);
    }

    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._default?.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        Engine3D._default?.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._default?.getRenderJob(view);
    }

    public static pause(): void {
        Engine3D._default?.pause();
    }

    public static resume(): void {
        Engine3D._default?.resume();
    }
}
