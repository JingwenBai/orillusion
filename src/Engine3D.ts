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
import { MatrixBindGroup } from './gfx/graphics/webGpu/core/bindGroups/MatrixBindGroup';

/**
 * Orillusion 3D Engine
 *
 * Can be used as an instance class (recommended for multi-instance scenarios):
 * ```ts
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: {...} });
 * engine.startRenderView(view);
 * ```
 *
 * Or via the static API for single-instance backwards compatibility:
 * ```ts
 * await Engine3D.init({ canvasConfig: {...} });
 * Engine3D.startRenderView(view);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // ─── Instance members ────────────────────────────────────────────────────────

    /**
     * The WebGPU context for this engine instance.
     */
    public gpuContext: Context3D;

    /**
     * Resource manager for this engine instance.
     */
    public res: Res;

    /**
     * Input system for this engine instance.
     */
    public inputSystem: InputSystem;

    /**
     * Views registered with this engine instance.
     */
    public views: View3D[];

    /**
     * Render jobs keyed by View3D.
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * Engine setting for this instance.
     */
    public setting: EngineSetting;

    // Per-instance resource caches (swapped into global statics before each render)
    private _rtMaps: { rtTextureMap: Map<any, any>; rtViewQuad: Map<any, any> };
    private _gBufferMap: Map<string, GBufferFrame>;
    private _interpolators: Interpolator[];
    private _matrixBindGroup: MatrixBindGroup;

    // Per-instance time state
    private _timeState: { time: number; delta: number; frame: number } = { time: 0, delta: 0, frame: 0 };

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.setting = Engine3D._buildDefaultSetting();
    }

    // ─── Instance getters ────────────────────────────────────────────────────────

    /** Set the render frame rate for this engine instance. */
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
        return this.gpuContext.presentationSize;
    }

    public get aspect(): number {
        return this.gpuContext.aspect;
    }

    public get width(): number {
        return this.gpuContext.windowWidth;
    }

    public get height(): number {
        return this.gpuContext.windowHeight;
    }

    // ─── Instance methods ────────────────────────────────────────────────────────

    /**
     * Initialise this engine instance with a canvas and optional settings.
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

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // WASM matrix pool is process-wide; only initialise once.
        if (Matrix4.useCount === 0 && Matrix4.wasmMatrixPtr === 0) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // Each engine instance gets its own WebGPU context (canvas + device).
        this.gpuContext = new Context3D();
        setActiveContext(this.gpuContext);
        await this.gpuContext.init(descriptor.canvasConfig);

        // Pre-compute reflection setting.
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Per-engine resource caches — initialise fresh maps and activate them.
        this._gBufferMap = GBufferFrame.createInstanceMap();
        GBufferFrame.activateForEngine(this._gBufferMap);

        this._rtMaps = RTResourceMap.createInstanceMaps();
        RTResourceMap.activateForEngine(this._rtMaps);

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false,
        );

        // Shader libraries are purely compile-time string registries — safe to share.
        ShaderLib.init();
        ShaderUtil.init();

        // GlobalBindGroup creates a new modelMatrixBindGroup; store it per-engine.
        GlobalBindGroup.init();
        this._matrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;

        // Shadow/light maps keyed by Scene3D — safe to share via idempotent init.
        ShadowLightsCollect.init();

        // Per-engine interpolator list.
        this._interpolators = [];
        Interpolator.activateForEngine(this._interpolators);

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.gpuContext.canvas);
    }

    /**
     * Activate this engine's context, making its GPU resources the globally-active ones.
     * Called automatically at the start of each render frame.
     */
    private _activateContext(): void {
        setActiveContext(this.gpuContext);
        RTResourceMap.activateForEngine(this._rtMaps);
        GBufferFrame.activateForEngine(this._gBufferMap);
        Interpolator.activateForEngine(this._interpolators);
        GlobalBindGroup.activateModelMatrixBindGroup(this._matrixBindGroup);
        // Restore per-engine time state so Time.* reflects this engine's clock.
        Time.time = this._timeState.time;
        Time.delta = this._timeState.delta;
        Time.frame = this._timeState.frame;
    }

    /**
     * Save this engine's time state after a frame update.
     */
    private _saveTimeState(): void {
        this._timeState.time = Time.time;
        this._timeState.delta = Time.delta;
        this._timeState.frame = Time.frame;
    }

    private _startRenderJob(view: View3D): RendererJob {
        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this.setting.pick.mode === 'pixel') {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this.setting.pick.mode === 'pixel' || this.setting.pick.mode === 'bound') {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Register a single view and start the render loop for this engine instance.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Register multiple views and start the render loop for this engine instance.
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
     * Get the RendererJob for a given view.
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
        if (this._frameRateValue > 0) {
            const delta = time - this._time;
            if (delta < this._frameRateValue) {
                const t = performance.now();
                await new Promise((res) => {
                    setTimeout(() => {
                        time += performance.now() - t;
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
        // Activate this engine's context and resources before processing any frame logic.
        this._activateContext();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this.gpuContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        for (const iterator of ComponentCollect.componentsBeforeUpdateList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        const command = this.gpuContext.device.createCommandEncoder();
        for (const iterator of ComponentCollect.componentsComputeList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k, command);
            }
        }
        this.gpuContext.device.queue.submit([command.finish()]);

        for (const iterator of ComponentCollect.componentsUpdateList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        for (const iterator of ComponentCollect.graphicComponent) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop) await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);

        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const iterator of ComponentCollect.componentsLateUpdateList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        if (this._lateRender) await this._lateRender();

        // Persist per-engine time state after the frame.
        this._saveTimeState();
    }

    // ─── Backward-compatible static API ──────────────────────────────────────────

    /**
     * @internal
     * The default engine instance used by the static API.
     * Created lazily on first static method call.
     */
    private static _default: Engine3D;

    private static _getDefault(): Engine3D {
        if (!Engine3D._default) {
            Engine3D._default = new Engine3D();
        }
        return Engine3D._default;
    }

    // ─── Static property mirrors ─────────────────────────────────────────────────

    /** @deprecated Use an Engine3D instance instead. */
    public static get res(): Res { return Engine3D._getDefault().res; }
    public static set res(v: Res) { Engine3D._getDefault().res = v; }

    /** @deprecated Use an Engine3D instance instead. */
    public static get inputSystem(): InputSystem { return Engine3D._getDefault().inputSystem; }
    public static set inputSystem(v: InputSystem) { Engine3D._getDefault().inputSystem = v; }

    /** @deprecated Use an Engine3D instance instead. */
    public static get views(): View3D[] { return Engine3D._getDefault().views; }
    public static set views(v: View3D[]) { Engine3D._getDefault().views = v; }

    /** @deprecated Use an Engine3D instance instead. */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._getDefault().renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { Engine3D._getDefault().renderJobs = v; }

    /** @deprecated Use an Engine3D instance instead. */
    public static get setting(): EngineSetting { return Engine3D._getDefault().setting; }
    public static set setting(v: EngineSetting) { Engine3D._getDefault().setting = v; }

    /** @deprecated Use an Engine3D instance instead. */
    public static get frameRate(): number { return Engine3D._getDefault().frameRate; }
    public static set frameRate(v: number) { Engine3D._getDefault().frameRate = v; }

    public static get size(): number[] { return Engine3D._getDefault().size; }
    public static get aspect(): number { return Engine3D._getDefault().aspect; }
    public static get width(): number { return Engine3D._getDefault().width; }
    public static get height(): number { return Engine3D._getDefault().height; }

    // ─── Static method mirrors ───────────────────────────────────────────────────

    /** @deprecated Use an Engine3D instance instead. */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        return Engine3D._getDefault().init(descriptor);
    }

    /** @deprecated Use an Engine3D instance instead. */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._getDefault().startRenderView(view);
    }

    /** @deprecated Use an Engine3D instance instead. */
    public static startRenderViews(views: View3D[]): void {
        return Engine3D._getDefault().startRenderViews(views);
    }

    /** @deprecated Use an Engine3D instance instead. */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._getDefault().getRenderJob(view);
    }

    /** @deprecated Use an Engine3D instance instead. */
    public static pause(): void {
        Engine3D._getDefault().pause();
    }

    /** @deprecated Use an Engine3D instance instead. */
    public static resume(): void {
        Engine3D._getDefault().resume();
    }

    // ─── Shared default setting factory ──────────────────────────────────────────

    private static _buildDefaultSetting(): EngineSetting {
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
}
