import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time, _createTimeState, _setActiveTime, TimeState } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, _setWebGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap, _createRTResourceMapState, _setActiveRTResourceMap, RTResourceMapState } from './gfx/renderJob/frame/RTResourceMap';

import { ForwardRenderJob } from './gfx/renderJob/jobs/ForwardRenderJob';
import { GlobalBindGroup, _createGlobalBindGroupState, _setActiveGlobalBindGroup, GlobalBindGroupState } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { Interpolator } from './math/TimeInterpolator';
import { RendererJob } from './gfx/renderJob/jobs/RendererJob';
import { Res } from './assets/Res';
import { ShaderLib } from './assets/shader/ShaderLib';
import { ShaderUtil, _createShaderUtilState, _setActiveShaderUtil, ShaderUtilState } from './gfx/graphics/webGpu/shader/util/ShaderUtil';
import { ComponentCollect, _createComponentCollectState, _setActiveComponentCollect, ComponentCollectState } from './gfx/renderJob/collect/ComponentCollect';
import { ShadowLightsCollect, _createShadowLightsCollectState, _setActiveShadowLightsCollect, ShadowLightsCollectState } from './gfx/renderJob/collect/ShadowLightsCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame, _createGBufferFrameState, _setActiveGBufferFrame, GBufferFrameState } from './gfx/renderJob/frame/GBufferFrame';
import { GPUContext, _createGPUContextState, _setActiveGPUContext, GPUContextState } from './gfx/renderJob/GPUContext';
import { PipelinePool, _createPipelinePoolState, _setActivePipelinePool, PipelinePoolState } from './gfx/graphics/webGpu/PipelinePool';

// Note: EntityCollect is NOT imported here to avoid a circular dependency
// (EntityCollect already imports Engine3D). EntityCollect manages its own
// per-engine instance by checking Engine3D.current.context at access time.

/**
 * Per-engine context — holds all subsystem state that must be isolated
 * between engine instances.
 * @group engine3D
 */
export class EngineContext {
    webGPUContext: Context3D;
    componentCollectState: ComponentCollectState;
    globalBindGroupState: GlobalBindGroupState;
    rtResourceMapState: RTResourceMapState;
    shadowLightsCollectState: ShadowLightsCollectState;
    gBufferFrameState: GBufferFrameState;
    gpuContextState: GPUContextState;
    pipelinePoolState: PipelinePoolState;
    shaderUtilState: ShaderUtilState;
    timeState: TimeState;
    /** @internal EntityCollect instance (typed as unknown to avoid circular import) */
    _entityCollect?: unknown;
}

function buildDefaultSetting(): EngineSetting {
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

/**
 * Orillusion 3D Engine
 *
 * ## Multi-instance usage
 * ```ts
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas } });
 * engine.startRenderView(view);
 * ```
 *
 * ## Legacy single-instance usage (fully backward compatible)
 * ```ts
 * await Engine3D.init();
 * Engine3D.startRenderView(view);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // ─── Static registry ──────────────────────────────────────────────────────

    /** Currently active engine instance (updated before each frame). */
    private static _current: Engine3D | null = null;
    /** Default (first) engine instance — used for backward-compat static shims. */
    private static _default: Engine3D | null = null;
    /** All registered engine instances. */
    private static _instances: Engine3D[] = [];
    /** WASM matrix buffer is shared (global); initialize only once. */
    private static _wasmInitialized: boolean = false;

    /** Currently active engine (set before each frame by `_setAsCurrent`). */
    public static get current(): Engine3D | null { return Engine3D._current; }

    /** All live engine instances. */
    public static get instances(): readonly Engine3D[] { return Engine3D._instances; }

    // ─── Backward-compat static setting field ─────────────────────────────────
    // This static field is kept so that pre-init code like
    // `Engine3D.setting.shadow.enable = false` continues to work.
    // After init(), _setAsCurrent() keeps it pointing to the current
    // engine's per-instance setting object.
    /**
     * engine setting
     */
    public static setting: EngineSetting = buildDefaultSetting();

    // ─── Backward-compat static shims ─────────────────────────────────────────

    public static get res(): Res {
        return (Engine3D._current ?? Engine3D._default)?.res;
    }

    public static get inputSystem(): InputSystem {
        return (Engine3D._current ?? Engine3D._default)?.inputSystem;
    }

    public static get views(): View3D[] {
        return (Engine3D._current ?? Engine3D._default)?.views;
    }

    /** @internal */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return (Engine3D._current ?? Engine3D._default)?.renderJobs;
    }

    public static get frameRate(): number {
        return (Engine3D._current ?? Engine3D._default)?._frameRate ?? 360;
    }
    public static set frameRate(v: number) {
        const target = Engine3D._current ?? Engine3D._default;
        if (target) target.frameRate = v;
    }

    public static get size(): number[] {
        return (Engine3D._current ?? Engine3D._default)?.context.webGPUContext.presentationSize;
    }
    public static get aspect(): number {
        return (Engine3D._current ?? Engine3D._default)?.context.webGPUContext.aspect;
    }
    public static get width(): number {
        return (Engine3D._current ?? Engine3D._default)?.context.webGPUContext.windowWidth;
    }
    public static get height(): number {
        return (Engine3D._current ?? Engine3D._default)?.context.webGPUContext.windowHeight;
    }

    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        if (!Engine3D._default) {
            Engine3D._default = new Engine3D();
        }
        return Engine3D._default.init(descriptor);
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

    public static pause(): void { Engine3D._default?.pause(); }
    public static resume(): void { Engine3D._default?.resume(); }

    // ─── Instance state ───────────────────────────────────────────────────────

    /** Per-engine subsystem context */
    public readonly context: EngineContext = new EngineContext();

    public res: Res;
    public inputSystem: InputSystem;
    public views: View3D[];
    public renderJobs: Map<View3D, RendererJob>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ─── Frame rate ───────────────────────────────────────────────────────────

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    // ─── Initialization ───────────────────────────────────────────────────────

    /**
     * Initialize this engine instance.
     *
     * @param descriptor engine configuration
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

        // Register this instance
        if (!Engine3D._instances.includes(this)) {
            Engine3D._instances.push(this);
        }

        // Merge provided settings into the static setting object (which may
        // already carry pre-init user mutations).
        Engine3D.setting = { ...Engine3D.setting, ...descriptor.engineSetting };

        // WASM matrix buffer is global — init only once across all instances.
        if (!Engine3D._wasmInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, Engine3D.setting.doublePrecision);
            Engine3D._wasmInitialized = true;
        }

        // ── WebGPU context ─────────────────────────────────────────────────
        this.context.webGPUContext = new Context3D();
        _setWebGPUContext(this.context.webGPUContext);
        await this.context.webGPUContext.init(descriptor.canvasConfig);

        // ── GBuffer state (before reflections pre-compute) ─────────────────
        this.context.gBufferFrameState = _createGBufferFrameState();
        _setActiveGBufferFrame(this.context.gBufferFrameState);

        // Pre-compute reflection GBuffer (outColor=false, skips RTResourceMap)
        Engine3D.setting.reflectionSetting.width =
            Engine3D.setting.reflectionSetting.reflectionProbeSize * 6;
        Engine3D.setting.reflectionSetting.height =
            Engine3D.setting.reflectionSetting.reflectionProbeSize *
            Engine3D.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            Engine3D.setting.reflectionSetting.width,
            Engine3D.setting.reflectionSetting.height,
            false
        );

        // ── Shader library (read-only constants, shared across instances) ──
        ShaderLib.init();

        // ── Per-instance shader module pool (GPUShaderModule is device-scoped)
        this.context.shaderUtilState = _createShaderUtilState();
        _setActiveShaderUtil(this.context.shaderUtilState);
        ShaderUtil.init();

        // ── Per-instance bind groups (GPUBindGroup is device-scoped) ──────
        this.context.globalBindGroupState = _createGlobalBindGroupState();
        _setActiveGlobalBindGroup(this.context.globalBindGroupState);
        GlobalBindGroup.init();

        // ── Per-instance render texture registry ───────────────────────────
        this.context.rtResourceMapState = _createRTResourceMapState();
        _setActiveRTResourceMap(this.context.rtResourceMapState);
        RTResourceMap.init();

        // ── Per-instance shadow light tracking ────────────────────────────
        this.context.shadowLightsCollectState = _createShadowLightsCollectState();
        _setActiveShadowLightsCollect(this.context.shadowLightsCollectState);
        ShadowLightsCollect.init();

        // ── Per-instance component lifecycle state ────────────────────────
        this.context.componentCollectState = _createComponentCollectState();
        _setActiveComponentCollect(this.context.componentCollectState);

        // ── Per-instance GPU pipeline cache (pipeline is device-scoped) ───
        this.context.pipelinePoolState = _createPipelinePoolState();
        _setActivePipelinePool(this.context.pipelinePoolState);

        // ── Per-instance GPU render-state tracker ─────────────────────────
        this.context.gpuContextState = _createGPUContextState();
        _setActiveGPUContext(this.context.gpuContextState);

        // ── Per-instance frame time ────────────────────────────────────────
        this.context.timeState = _createTimeState();
        _setActiveTime(this.context.timeState);

        // ── Resources & input ─────────────────────────────────────────────
        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.webGPUContext.canvas);

        // Set this as the active engine so that any post-init code using
        // the static API picks up the right context.
        this._setAsCurrent();
    }

    // ─── Render view management ───────────────────────────────────────────────

    private _startRenderJob(view: View3D): RendererJob {
        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

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
     * Set a single render view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop.
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
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
    }

    // ─── Internal render loop ─────────────────────────────────────────────────

    /**
     * Activate this engine as the "current" instance.
     * All static subsystem APIs will route to this engine's per-instance state
     * for the duration of the current frame.
     * @internal
     */
    private _setAsCurrent(): void {
        Engine3D._current = this;
        // Keep the static setting pointing to this engine's setting object
        // so that `Engine3D.setting.xxx` always refers to the active engine.
        // (Engine3D.setting is the same object that was mutated during init.)

        _setWebGPUContext(this.context.webGPUContext);
        _setActiveComponentCollect(this.context.componentCollectState);
        _setActiveGlobalBindGroup(this.context.globalBindGroupState);
        _setActiveRTResourceMap(this.context.rtResourceMapState);
        _setActiveShadowLightsCollect(this.context.shadowLightsCollectState);
        _setActiveGBufferFrame(this.context.gBufferFrameState);
        _setActivePipelinePool(this.context.pipelinePoolState);
        _setActiveShaderUtil(this.context.shaderUtilState);
        _setActiveGPUContext(this.context.gpuContextState);
        _setActiveTime(this.context.timeState);
    }

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
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        // Activate this engine's per-instance subsystem state for this frame.
        this._setAsCurrent();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        let views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.context.webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        for (const [k, v] of ComponentCollect.componentsBeforeUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        let command = this.context.webGPUContext.device.createCommandEncoder();
        for (const [k, v] of ComponentCollect.componentsComputeList) {
            for (const [f, c] of v) {
                if (f.enable) c(k, command);
            }
        }
        this.context.webGPUContext.device.queue.submit([command.finish()]);

        for (const [k, v] of ComponentCollect.componentsUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        for (const [k, v] of ComponentCollect.graphicComponent) {
            for (const [f, c] of v) {
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop)
            await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        GlobalBindGroup.modelMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const [k, v] of ComponentCollect.componentsLateUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
