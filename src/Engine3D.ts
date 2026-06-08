import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, _activateGPUContext, _getActiveGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { EntityCollect } from './gfx/renderJob/collect/EntityCollect';
import { ActiveEngineContext } from './EngineContext';

/** @internal */
function makeDefaultSetting(): EngineSetting {
    return {
        doublePrecision: false,
        occlusionQuery: { enable: true, debug: false },
        pick: { enable: true, mode: `bound`, detail: `mesh` },
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
                godRay: { blendColor: true, rayMarchCount: 16, scatteringExponent: 5, intensity: 0.5 },
                ssao: { enable: false, radius: 0.15, bias: -0.1, aoPower: 2.0, debug: true },
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
                fxaa: { enable: false },
                depthOfView: { enable: false, iterationCount: 3, pixelOffset: 1.0, near: 150, far: 300 },
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
        sky: { type: 'HDRSKY', sky: null, skyExposure: 1.0, defaultFar: 65536, defaultNear: 1 },
        light: { maxLight: 4096 },
        material: { materialChannelDebug: false, materialDebug: false },
        loader: { numConcurrent: 20 },
        reflectionSetting: {
            reflectionProbeMaxCount: 8,
            reflectionProbeSize: 256,
            width: 256 * 6,
            height: 8 * 256,
            enable: true,
        },
    };
}

/** Whether the global WASM / shader layer has been initialized (shared across engines). */
let _globalInitDone = false;

/**
 * Orillusion 3D Engine
 *
 * **Multi-instance usage:**
 * ```typescript
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas: myCanvas } });
 * engine.startRenderView(view);
 * ```
 *
 * **Single-instance backward-compat (static API):**
 * ```typescript
 * await Engine3D.init({ canvasConfig: { canvas: myCanvas } });
 * Engine3D.startRenderView(view);
 * ```
 * @group engine3D
 */
export class Engine3D {

    // =========================================================================
    // Instance state
    // =========================================================================

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine instance. */
    public inputSystem: InputSystem;

    /** Active views managed by this engine. */
    public views: View3D[];

    /** Render jobs keyed by view. */
    public renderJobs: Map<View3D, RendererJob>;

    /** Per-engine settings (deep copy of defaults on construction). */
    public setting: EngineSetting;

    /** Per-engine WebGPU context (canvas, device, swapchain). */
    public gpuContext: Context3D;

    /** Per-engine component lifecycle manager. */
    public componentCollect: ComponentCollect;

    /** Per-engine GPU bind group manager. */
    public globalBindGroup: GlobalBindGroup;

    /** Per-engine shadow light collection. */
    public shadowLightsCollect: ShadowLightsCollect;

    /** Per-engine renderable entity collection. */
    public entityCollect: EntityCollect;

    /** Per-engine render-target resource map. */
    public rtResourceMap: RTResourceMap;

    /** Per-engine GBuffer frame map (keyed by name). */
    public gBufferFrameMap: Map<string, GBufferFrame>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.setting = makeDefaultSetting();
        this.gpuContext = new Context3D();
        this.componentCollect = new ComponentCollect();
        this.globalBindGroup = new GlobalBindGroup();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.entityCollect = new EntityCollect();
        this.rtResourceMap = new RTResourceMap();
        this.gBufferFrameMap = new Map();
    }

    // =========================================================================
    // Instance getters / setters
    // =========================================================================

    public get frameRate(): number {
        return this._frameRate;
    }

    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
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

    // =========================================================================
    // Instance methods
    // =========================================================================

    /**
     * Initialize this engine instance.
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

        // Global one-time initialization (WASM, ShaderLib, ShaderUtil).
        if (!_globalInitDone) {
            _globalInitDone = true;
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            ShaderLib.init();
            ShaderUtil.init();
        }

        // Activate this engine's GPU context so that webGPUContext proxy resolves correctly.
        _activateGPUContext(this.gpuContext);
        ActiveEngineContext.activate(this);

        await this.gpuContext.init(descriptor.canvasConfig);

        // Pre-compute reflection GBuffer size.
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false,
        );

        ShadowLightsCollect.init(); // no-op for static compat

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.gpuContext.canvas);
    }

    /**
     * Set a single render view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        view.engine = this;
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (const view of views) {
            view.engine = this;
            this._startRenderJob(view);
        }
        this.resume();
    }

    /**
     * Get the render job for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause rendering.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume rendering.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    private _startRenderJob(view: View3D): RendererJob {
        // Activate context so sub-systems resolve to this engine.
        _activateGPUContext(this.gpuContext);
        ActiveEngineContext.activate(this);

        const renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this.setting.pick.mode === `pixel`) {
            const postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this.setting.pick.mode === `pixel` || this.setting.pick.mode === `bound`) {
            view.enablePick = true;
        }

        return renderJob;
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
        // Activate this engine's per-instance subsystems so all static calls resolve here.
        _activateGPUContext(this.gpuContext);
        ActiveEngineContext.activate(this);

        const cc = this.componentCollect;
        const gbg = this.globalBindGroup;
        const gpu = this.gpuContext;

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = gpu.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        // Before-update pass
        for (const [k, v] of cc.componentsBeforeUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        // Compute pass
        const command = gpu.device.createCommandEncoder();
        for (const [k, v] of cc.componentsComputeList) {
            for (const [f, c] of v) {
                if (f.enable) c(k, command);
            }
        }
        gpu.device.queue.submit([command.finish()]);

        // Update pass
        for (const [k, v] of cc.componentsUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        // Graphic component pass
        for (const [k, v] of cc.graphicComponent) {
            for (const [f, c] of v) {
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop) await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);

        // Write global matrix buffer to GPU.
        gbg.modelMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        // Late-update pass
        for (const [k, v] of cc.componentsLateUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        if (this._lateRender) await this._lateRender();
    }

    // =========================================================================
    // Static backward-compat API
    // All static methods/properties delegate to Engine3D.defaultEngine.
    // =========================================================================

    /** @internal */
    private static _defaultInstance: Engine3D;

    /**
     * The default (first) Engine3D instance used by the static API.
     * Created lazily on first access.
     */
    public static get defaultEngine(): Engine3D {
        if (!this._defaultInstance) {
            this._defaultInstance = new Engine3D();
        }
        return this._defaultInstance;
    }

    // ---- Static property proxies ----

    /** @deprecated Use instance API. */
    public static get res(): Res { return this.defaultEngine.res; }
    public static set res(v: Res) { this.defaultEngine.res = v; }

    /** @deprecated Use instance API. */
    public static get inputSystem(): InputSystem { return this.defaultEngine.inputSystem; }
    public static set inputSystem(v: InputSystem) { this.defaultEngine.inputSystem = v; }

    /** @deprecated Use instance API. */
    public static get views(): View3D[] { return this.defaultEngine.views; }
    public static set views(v: View3D[]) { this.defaultEngine.views = v; }

    /** @deprecated Use instance API. */
    public static get renderJobs(): Map<View3D, RendererJob> { return this.defaultEngine.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { this.defaultEngine.renderJobs = v; }

    /** engine setting */
    public static get setting(): EngineSetting { return this.defaultEngine.setting; }
    public static set setting(v: EngineSetting) { this.defaultEngine.setting = v; }

    public static get frameRate(): number { return this.defaultEngine.frameRate; }
    public static set frameRate(v: number) { this.defaultEngine.frameRate = v; }

    public static get size(): number[] { return this.defaultEngine.size; }
    public static get aspect(): number { return this.defaultEngine.aspect; }
    public static get width(): number { return this.defaultEngine.width; }
    public static get height(): number { return this.defaultEngine.height; }

    // ---- Static method proxies ----

    /**
     * Initialize the default engine instance.
     * @param descriptor {@link CanvasConfig}
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        return this.defaultEngine.init(descriptor);
    }

    public static startRenderView(view: View3D): RendererJob {
        return this.defaultEngine.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        return this.defaultEngine.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return this.defaultEngine.getRenderJob(view);
    }

    public static pause(): void {
        this.defaultEngine.pause();
    }

    public static resume(): void {
        this.defaultEngine.resume();
    }
}
