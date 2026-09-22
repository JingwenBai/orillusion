import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time, TimeState } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveWebGPUContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap, RTResourceMapState } from './gfx/renderJob/frame/RTResourceMap';

import { ForwardRenderJob } from './gfx/renderJob/jobs/ForwardRenderJob';
import { GlobalBindGroup, GlobalBindGroupState } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { Interpolator } from './math/TimeInterpolator';
import { RendererJob } from './gfx/renderJob/jobs/RendererJob';
import { Res } from './assets/Res';
import { ShaderLib } from './assets/shader/ShaderLib';
import { ShaderUtil, ShaderUtilState } from './gfx/graphics/webGpu/shader/util/ShaderUtil';
import { ComponentCollect } from './gfx/renderJob/collect/ComponentCollect';
import { ShadowLightsCollect } from './gfx/renderJob/collect/ShadowLightsCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';

/** Default engine settings shared across all instances as initial values. */
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
 * Supports both legacy static usage and new multi-instance usage:
 *
 * Static (backward-compatible):
 *   await Engine3D.init({ canvasConfig });
 *   Engine3D.startRenderView(view);
 *
 * Instance-based (multi-instance):
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

    // ─── Instance state ─────────────────────────────────────────────────────

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine instance. */
    public inputSystem: InputSystem;

    /** Active views managed by this engine instance. */
    public views: View3D[];

    /** Per-engine setting object. */
    public setting: EngineSetting;

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /** WebGPU context owned by this instance. */
    public context: Context3D;

    // Per-instance subsystem states
    /** @internal */ public _globalBindGroupState: GlobalBindGroupState;
    /** @internal */ public _rtResourceMapState: RTResourceMapState;
    /** @internal */ public _shaderUtilState: ShaderUtilState;
    /** @internal */ public _timeState: TimeState;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _renderTime: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        // Create per-instance subsystem states eagerly so they can be switched
        // into the global singletons via _activateContext().
        this.context = new Context3D();
        this._globalBindGroupState = GlobalBindGroup.createState();
        this._rtResourceMapState = RTResourceMap.createState();
        this._shaderUtilState = ShaderUtil.createState();
        this._timeState = Time.createState();

        // Deep-clone the current static setting so each instance starts from the
        // same base (including any pre-init mutations via Engine3D.setting.X = Y).
        this.setting = JSON.parse(JSON.stringify(Engine3D._staticSetting));
        // Restore Color objects that JSON.parse can't preserve.
        this.setting.render.postProcessing.globalFog.fogColor = new Color(96 / 255, 117 / 255, 133 / 255, 1);
    }

    // ─── Instance lifecycle ─────────────────────────────────────────────────

    /**
     * Initialize this engine instance with the given WebGPU canvas config.
     * Activates this instance as the "current" engine for all global singletons.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // Activate this engine before any subsystem initialisation so that global
        // singletons (webGPUContext, GlobalBindGroup, …) point to this instance.
        this._activateContext();

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        await this.context.init(descriptor.canvasConfig);

        // Pre-compute reflection settings.
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
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

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);
    }

    /**
     * Activate this engine's subsystem states as the globally visible singletons.
     * Called automatically before each render frame so the correct state is used
     * even when multiple Engine3D instances exist on the same page.
     * @internal
     */
    public _activateContext(): void {
        Engine3D._activeEngine = this;
        setActiveWebGPUContext(this.context);
        GlobalBindGroup.activateState(this._globalBindGroupState);
        RTResourceMap.activateState(this._rtResourceMapState);
        ShaderUtil.activateState(this._shaderUtilState);
        Time.activateState(this._timeState);
    }

    /** Instance version of startRenderView. */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /** Instance version of startRenderViews. */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /** Instance version of getRenderJob. */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /** Instance frame rate getter. */
    public get frameRate(): number {
        return this._frameRate;
    }

    /** Instance frame rate setter. */
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) {
            this._frameRateValue = 0;
        }
    }

    /** Pause rendering for this engine instance. */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume rendering for this engine instance. */
    public resume(): void {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
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

    private async _render(time: number): Promise<void> {
        // Activate this engine's context before doing any work this frame.
        this._activateContext();

        if (this._frameRateValue > 0) {
            let delta = time - this._renderTime;
            if (delta < this._frameRateValue) {
                let t = performance.now();
                await new Promise(res => {
                    setTimeout(() => {
                        time += (performance.now() - t);
                        res(true);
                    }, this._frameRateValue - delta);
                });
            }
            this._renderTime = time;
        }
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        let views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        for (const iterator of ComponentCollect.componentsBeforeUpdateList) {
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

        let command = webGPUContext.device.createCommandEncoder();
        for (const iterator of ComponentCollect.componentsComputeList) {
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

        webGPUContext.device.queue.submit([command.finish()]);

        for (const iterator of ComponentCollect.componentsUpdateList) {
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

        for (const iterator of ComponentCollect.graphicComponent) {
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
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        for (const iterator of ComponentCollect.componentsLateUpdateList) {
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

    // ─── Static backward-compatible API ─────────────────────────────────────
    //
    // All static members below delegate to the currently active engine instance.
    // Existing code that uses `Engine3D.init()`, `Engine3D.res`, etc. continues
    // to work without modification.

    /**
     * @internal
     * The engine instance that is currently active (i.e. whose render loop is
     * running or that was most recently initialised via the static API).
     */
    public static _activeEngine: Engine3D = null;

    /**
     * @internal
     * Mutable default setting used when no engine instance is active.
     * Pre-init mutations like `Engine3D.setting.shadow.autoUpdate = true`
     * write here, and new Engine3D instances clone this as their starting point.
     */
    public static _staticSetting: EngineSetting = JSON.parse(JSON.stringify(_defaultSetting));

    /** @deprecated Use `engine.res` on the Engine3D instance. */
    public static get res(): Res {
        return Engine3D._activeEngine?.res;
    }
    public static set res(v: Res) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.res = v;
    }

    /** @deprecated Use `engine.inputSystem` on the Engine3D instance. */
    public static get inputSystem(): InputSystem {
        return Engine3D._activeEngine?.inputSystem;
    }
    public static set inputSystem(v: InputSystem) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.inputSystem = v;
    }

    /** @deprecated Use `engine.views` on the Engine3D instance. */
    public static get views(): View3D[] {
        return Engine3D._activeEngine?.views;
    }
    public static set views(v: View3D[]) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.views = v;
    }

    /** @deprecated Use `engine.renderJobs` on the Engine3D instance. */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._activeEngine?.renderJobs;
    }
    public static set renderJobs(v: Map<View3D, RendererJob>) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.renderJobs = v;
    }

    /**
     * Static setting object.
     * When no engine is active this is the mutable default that new instances
     * will clone. After an engine is initialised it delegates to the active
     * engine's own setting object so legacy per-property assignments
     * (e.g. `Engine3D.setting.shadow.autoUpdate = true`) continue to work.
     */
    public static get setting(): EngineSetting {
        return Engine3D._activeEngine?.setting ?? Engine3D._staticSetting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D._activeEngine) {
            Engine3D._activeEngine.setting = v;
        } else {
            Engine3D._staticSetting = v;
        }
    }

    /** @deprecated Use `engine.frameRate` on the Engine3D instance. */
    public static get frameRate(): number {
        return Engine3D._activeEngine?._frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.frameRate = value;
    }

    public static get size(): number[] {
        return webGPUContext?.presentationSize;
    }

    public static get aspect(): number {
        return webGPUContext?.aspect;
    }

    public static get width(): number {
        return webGPUContext?.windowWidth;
    }

    public static get height(): number {
        return webGPUContext?.windowHeight;
    }

    /**
     * Create and initialise a default Engine3D instance (backward-compatible).
     * Returns the new Engine3D instance.
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<Engine3D> {
        const engine = new Engine3D();
        await engine.init(descriptor);
        return engine;
    }

    /** @deprecated Use `engine.startRenderView(view)` on the Engine3D instance. */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._activeEngine.startRenderView(view);
    }

    /** @deprecated Use `engine.startRenderViews(views)` on the Engine3D instance. */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._activeEngine.startRenderViews(views);
    }

    /** @deprecated Use `engine.getRenderJob(view)` on the Engine3D instance. */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._activeEngine?.renderJobs?.get(view);
    }

    /** @deprecated Use `engine.pause()` on the Engine3D instance. */
    public static pause(): void {
        Engine3D._activeEngine?.pause();
    }

    /** @deprecated Use `engine.resume()` on the Engine3D instance. */
    public static resume(): void {
        Engine3D._activeEngine?.resume();
    }
}
