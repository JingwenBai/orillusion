import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveWebGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMapState, setActiveRTResourceMapState } from './gfx/renderJob/frame/RTResourceMap';

import { ForwardRenderJob } from './gfx/renderJob/jobs/ForwardRenderJob';
import { GlobalBindGroup, GlobalBindGroupState, setActiveGlobalBindGroupState } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
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
import { GBufferFrame, setActiveGBufferMap } from './gfx/renderJob/frame/GBufferFrame';

/** @internal The Engine3D instance that is currently executing a render frame, or null. */
let _currentEngine: Engine3D | null = null;

/** @internal The default Engine3D instance used by all static-API calls. */
let _defaultEngine: Engine3D | null = null;

function getDefaultEngine(): Engine3D {
    if (!_defaultEngine) {
        _defaultEngine = new Engine3D();
    }
    return _defaultEngine;
}

/**
 * Orillusion 3D Engine
 *
 * Can be used either as a classic static singleton:
 * ```ts
 * await Engine3D.init();
 * Engine3D.startRenderView(view);
 * ```
 *
 * Or as multiple independent instances for multi-canvas use:
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
 * -- Engine3D.setting.*
 * -- await Engine3D.init();
 * @group engine3D
 */
export class Engine3D {

    // =========================================================
    // INSTANCE STATE
    // =========================================================

    /** WebGPU context for this engine instance. */
    public webGPUContext: Context3D;

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine instance. */
    public inputSystem: InputSystem;

    /** Active views in this engine instance. */
    public views: View3D[];

    /** Render jobs keyed by view in this engine instance. */
    public renderJobs: Map<View3D, RendererJob>;

    /** Engine settings for this instance. */
    public setting: EngineSetting;

    /** Per-instance GlobalBindGroup state (owns the model-matrix GPU buffer). */
    public _globalBindGroupState: GlobalBindGroupState;

    /** Per-instance RTResourceMap state (render-texture pool). */
    public _rtResourceMapState: RTResourceMapState;

    /** Per-instance GBuffer map (keyed frame-buffer cache). */
    public _gBufferMap: Map<string, GBufferFrame>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.webGPUContext = new Context3D();
        this.setting = Engine3D._createDefaultSetting();
        this._gBufferMap = new Map<string, GBufferFrame>();
        // Start with this engine's GBuffer map active so pre-init code routes correctly.
        setActiveGBufferMap(this._gBufferMap);
    }

    // =========================================================
    // INSTANCE METHODS
    // =========================================================

    /**
     * Activate this engine instance as the current context.
     * All module-level singletons (webGPUContext, GlobalBindGroup, RTResourceMap, GBufferFrame)
     * are redirected to this instance's state until another engine calls activate().
     */
    public activate(): void {
        _currentEngine = this;
        setActiveWebGPUContext(this.webGPUContext);
        if (this._globalBindGroupState) setActiveGlobalBindGroupState(this._globalBindGroupState);
        if (this._rtResourceMapState) setActiveRTResourceMapState(this._rtResourceMapState);
        setActiveGBufferMap(this._gBufferMap);
    }

    /**
     * get render window size width and height
     */
    public get size(): number[] {
        return this.webGPUContext.presentationSize;
    }

    /**
     * get render window aspect
     */
    public get aspect(): number {
        return this.webGPUContext.aspect;
    }

    /**
     * get render window size width
     */
    public get width(): number {
        return this.webGPUContext.windowWidth;
    }

    /**
     * get render window size height
     */
    public get height(): number {
        return this.webGPUContext.windowHeight;
    }

    /**
     * set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
     */
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

    /**
     * Initialize this engine instance and set up a WebGPU context on the given canvas.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // Activate this instance so subsystem calls during init target the right engine.
        this.activate();

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        await this.webGPUContext.init(descriptor.canvasConfig);

        //****pre compute setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Per-instance subsystem initialization — each engine owns its own state objects.
        // We create and activate them here so subsequent init calls (ShaderLib, etc.) and
        // GBufferFrame allocation all go to this engine's state.
        this._globalBindGroupState = new GlobalBindGroupState();
        setActiveGlobalBindGroupState(this._globalBindGroupState);

        this._rtResourceMapState = new RTResourceMapState();
        setActiveRTResourceMapState(this._rtResourceMapState);

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );
        //****pre compute setting****/

        ShaderLib.init();
        ShaderUtil.init();
        // ShadowLightsCollect is keyed by Scene3D — no per-instance init needed.
        ShadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.webGPUContext.canvas);
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
     * Set render view and start renderer for this engine instance.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start renderer for this engine instance.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the render job for a specific view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause rendering for this engine instance.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume rendering for this engine instance.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    private async _render(time: number): Promise<void> {
        // Activate this engine so all singleton accessors route to our subsystems.
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
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        for (const [view, componentMap] of ComponentCollect.componentsBeforeUpdateList) {
            if (!this.renderJobs?.has(view)) continue;
            for (const [f, c] of componentMap) {
                if (f.enable) c(view);
            }
        }

        let command = this.webGPUContext.device.createCommandEncoder();
        for (const [view, componentMap] of ComponentCollect.componentsComputeList) {
            if (!this.renderJobs?.has(view)) continue;
            for (const [f, c] of componentMap) {
                if (f.enable) c(view, command);
            }
        }

        this.webGPUContext.device.queue.submit([command.finish()]);

        for (const [view, componentMap] of ComponentCollect.componentsUpdateList) {
            if (!this.renderJobs?.has(view)) continue;
            for (const [f, c] of componentMap) {
                if (f.enable) c(view);
            }
        }

        for (const [view, componentMap] of ComponentCollect.graphicComponent) {
            if (!this.renderJobs?.has(view)) continue;
            for (const [f, c] of componentMap) {
                if (view && f.enable) c(view);
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        for (const [view, componentMap] of ComponentCollect.componentsLateUpdateList) {
            if (!this.renderJobs?.has(view)) continue;
            for (const [f, c] of componentMap) {
                if (f.enable) c(view);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // =========================================================
    // STATIC COMPAT API  (delegates to default or current engine)
    // =========================================================

    /**
     * resource manager — delegates to the default engine instance.
     */
    public static get res(): Res { return getDefaultEngine().res; }
    public static set res(v: Res) { getDefaultEngine().res = v; }

    /**
     * input system — delegates to the default engine instance.
     */
    public static get inputSystem(): InputSystem { return getDefaultEngine().inputSystem; }
    public static set inputSystem(v: InputSystem) { getDefaultEngine().inputSystem = v; }

    /**
     * active views — delegates to the current or default engine instance.
     */
    public static get views(): View3D[] { return (_currentEngine || getDefaultEngine()).views; }
    public static set views(v: View3D[]) { (_currentEngine || getDefaultEngine()).views = v; }

    /**
     * set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
     */
    public static get frameRate(): number { return getDefaultEngine().frameRate; }
    public static set frameRate(value: number) { getDefaultEngine().frameRate = value; }

    /**
     * get render window size width and height
     */
    public static get size(): number[] { return (_currentEngine || getDefaultEngine()).webGPUContext.presentationSize; }

    /**
     * get render window aspect
     */
    public static get aspect(): number { return (_currentEngine || getDefaultEngine()).webGPUContext.aspect; }

    /**
     * get render window size width
     */
    public static get width(): number { return (_currentEngine || getDefaultEngine()).webGPUContext.windowWidth; }

    /**
     * get render window size height
     */
    public static get height(): number { return (_currentEngine || getDefaultEngine()).webGPUContext.windowHeight; }

    /**
     * engine setting — returns the active (currently-rendering) engine's setting so that
     * per-engine settings are picked up correctly during render frames.
     */
    public static get setting(): EngineSetting { return (_currentEngine || getDefaultEngine()).setting; }
    public static set setting(v: EngineSetting) { (_currentEngine || getDefaultEngine()).setting = v; }

    /**
     * @internal
     */
    public static get renderJobs(): Map<View3D, RendererJob> { return (_currentEngine || getDefaultEngine()).renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { (_currentEngine || getDefaultEngine()).renderJobs = v; }

    /**
     * create webgpu 3d engine (static convenience API, uses the default instance).
     * @param descriptor {@link CanvasConfig}
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {
        return getDefaultEngine().init(descriptor);
    }

    /**
     * set render view and start renderer (static convenience API).
     */
    public static startRenderView(view: View3D): RendererJob {
        return getDefaultEngine().startRenderView(view);
    }

    /**
     * set render views and start renderer (static convenience API).
     */
    public static startRenderViews(views: View3D[]): void {
        return getDefaultEngine().startRenderViews(views);
    }

    /**
     * get view render job instance (static convenience API).
     */
    public static getRenderJob(view: View3D): RendererJob {
        return getDefaultEngine().getRenderJob(view);
    }

    /**
     * Pause the engine render (static convenience API).
     */
    public static pause(): void {
        getDefaultEngine().pause();
    }

    /**
     * Resume the engine render (static convenience API).
     */
    public static resume(): void {
        getDefaultEngine().resume();
    }

    // =========================================================
    // PRIVATE HELPERS
    // =========================================================

    private static _createDefaultSetting(): EngineSetting {
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
}
