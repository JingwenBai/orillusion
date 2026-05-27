import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { _setCurrentTime, TimeState } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, _setCurrentWebGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap, _setCurrentRTResourceMap } from './gfx/renderJob/frame/RTResourceMap';

import { ForwardRenderJob } from './gfx/renderJob/jobs/ForwardRenderJob';
import { GlobalBindGroup, _setCurrentGlobalBindGroup } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { Interpolator } from './math/TimeInterpolator';
import { RendererJob } from './gfx/renderJob/jobs/RendererJob';
import { Res } from './assets/Res';
import { ShaderLib } from './assets/shader/ShaderLib';
import { ShaderUtil } from './gfx/graphics/webGpu/shader/util/ShaderUtil';
import { ComponentCollect, _setCurrentComponentCollect } from './gfx/renderJob/collect/ComponentCollect';
import { ShadowLightsCollect, _setCurrentShadowLightsCollect } from './gfx/renderJob/collect/ShadowLightsCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';
import { GPUContext, _setCurrentGPUContext } from './gfx/renderJob/GPUContext';

/**
 * Create the large default EngineSetting object.
 * Called once per Engine3D instance so each instance has independent settings.
 */
function createDefaultSetting(): EngineSetting {
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
 * Shared pre-init setting modified via the static `Engine3D.setting` accessor
 * before any engine instance is created.
 */
let _preinitSetting: EngineSetting = createDefaultSetting();

/**
 * Whether WasmMatrix has already been initialised (it is a global resource
 * shared across all engine instances).
 */
let _wasmMatrixInitialised = false;

/**
 * Whether ShaderLib / ShaderUtil have been initialised (shader source strings
 * are also global and shared across instances).
 */
let _shadersInitialised = false;

/**
 * Orillusion 3D Engine – multi-instance capable.
 *
 * **Single-engine usage (backward compatible):**
 * ```ts
 * Engine3D.setting.shadow.enable = true;
 * await Engine3D.init({ canvasConfig: { ... } });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-engine usage (new):**
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
 * @group engine3D
 */
export class Engine3D {

    // ── Per-instance state ────────────────────────────────────────────────────

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine instance. */
    public inputSystem: InputSystem;

    /** Active render views for this engine instance. */
    public views: View3D[];

    /** Render jobs keyed by View3D for this engine instance. @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /** Engine settings. Each instance starts with a copy of the defaults. */
    public setting: EngineSetting;

    /** The underlying WebGPU context for this engine instance. */
    public webGPUContext: Context3D;

    /** Per-engine GPU rendering state. @internal */
    public gpuContext: GPUContext;

    /** Per-engine component lifecycle registry. @internal */
    public componentCollect: ComponentCollect;

    /** Per-engine GPU bind group manager. @internal */
    public globalBindGroup: GlobalBindGroup;

    /** Per-engine shadow light registry. @internal */
    public shadowLightsCollect: ShadowLightsCollect;

    /** Per-engine render-target resource map. @internal */
    public rtResourceMap: RTResourceMap;

    /** Per-engine time state. @internal */
    public timeState: TimeState;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _engineTime: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.setting = createDefaultSetting();
        this.webGPUContext = new Context3D();
        this.gpuContext = new GPUContext();
        this.componentCollect = new ComponentCollect();
        this.timeState = { time: 0, frame: 0, delta: 0 };
        // globalBindGroup, shadowLightsCollect, rtResourceMap require the GPU
        // device and are created inside init() after webGPUContext.init().
    }

    // ── Instance frameRate property ───────────────────────────────────────────

    /** Render frame rate limit for this engine instance. */
    public get frameRate(): number {
        return this._frameRate;
    }

    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    // ── Activate all per-engine context pointers ──────────────────────────────

    /**
     * Make this engine instance the "current" one so that all global static
     * API calls (webGPUContext, ComponentCollect, etc.) operate on this engine.
     * @internal
     */
    public activateContext(): void {
        Engine3D._current = this;
        _setCurrentWebGPUContext(this.webGPUContext);
        _setCurrentComponentCollect(this.componentCollect);
        _setCurrentGPUContext(this.gpuContext);
        _setCurrentTime(this.timeState);
        if (this.globalBindGroup) _setCurrentGlobalBindGroup(this.globalBindGroup);
        if (this.shadowLightsCollect) _setCurrentShadowLightsCollect(this.shadowLightsCollect);
        if (this.rtResourceMap) _setCurrentRTResourceMap(this.rtResourceMap);
    }

    // ── Instance init ─────────────────────────────────────────────────────────

    /**
     * Initialise this engine instance: set up WebGPU, load default resources
     * and prepare the render pipeline.
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

        // Apply descriptor settings on top of pre-init defaults.
        this.setting = { ...this.setting, ..._preinitSetting, ...descriptor.engineSetting };

        // Make this the active engine before any context-sensitive calls.
        this.activateContext();

        if (!_wasmMatrixInitialised) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            _wasmMatrixInitialised = true;
        }

        await this.webGPUContext.init(descriptor.canvasConfig);

        // Reflection GBuffer pre-compute
        const rs = this.setting.reflectionSetting;
        rs.width = rs.reflectionProbeSize * 6;
        rs.height = rs.reflectionProbeSize * rs.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            rs.width,
            rs.height,
            false
        );

        if (!_shadersInitialised) {
            ShaderLib.init();
            ShaderUtil.init();
            _shadersInitialised = true;
        }

        // GPU-dependent resources — created after webGPUContext.init()
        this.globalBindGroup = new GlobalBindGroup();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.rtResourceMap = new RTResourceMap();

        // Register the newly created instances as current.
        _setCurrentGlobalBindGroup(this.globalBindGroup);
        _setCurrentShadowLightsCollect(this.shadowLightsCollect);
        _setCurrentRTResourceMap(this.rtResourceMap);

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.webGPUContext.canvas);
    }

    // ── Instance render-view management ──────────────────────────────────────

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
     * Set the render view and start the render loop for this engine instance.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        this.activateContext();
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
        this.activateContext();
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the RendererJob associated with a View3D on this engine.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
    }

    /**
     * Pause the render loop for this engine instance.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the render loop for this engine instance.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    private async _render(time: number): Promise<void> {
        if (this._frameRateValue > 0) {
            const delta = time - this._engineTime;
            if (delta < this._frameRateValue) {
                const t = performance.now();
                await new Promise(res => {
                    setTimeout(() => {
                        time += (performance.now() - t);
                        res(true);
                    }, this._frameRateValue - delta);
                });
            }
            this._engineTime = time;
        }
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        // Reactivate this engine's context at the start of every frame so that
        // concurrent engine instances don't interfere with each other.
        this.activateContext();

        const ts = this.timeState;
        ts.delta = time - ts.time;
        ts.time = time;
        ts.frame += 1;
        Interpolator.tick(ts.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this.webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        const cc = this.componentCollect;

        for (const [k, v] of cc.componentsBeforeUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        let command = this.webGPUContext.device.createCommandEncoder();
        for (const [k, v] of cc.componentsComputeList) {
            for (const [f, c] of v) {
                if (f.enable) c(k, command);
            }
        }
        this.webGPUContext.device.queue.submit([command.finish()]);

        for (const [k, v] of cc.componentsUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        for (const [k, v] of cc.graphicComponent) {
            for (const [f, c] of v) {
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop)
            await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        const globalMatrixBindGroup = this.globalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, _k) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const [k, v] of cc.componentsLateUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // =========================================================================
    // Static API – backward compatibility
    //
    // The static members below delegate to Engine3D._current so that all
    // existing code using `Engine3D.init(...)`, `Engine3D.setting`, etc.
    // continues to work unchanged for the single-engine case.
    // =========================================================================

    /** @internal The most recently initialised engine instance. */
    private static _current: Engine3D | null = null;

    /** Access the currently active Engine3D instance. */
    public static get current(): Engine3D | null {
        return Engine3D._current;
    }

    // ── Static property shims ─────────────────────────────────────────────────

    public static get res(): Res { return Engine3D._current?.res; }
    public static set res(v: Res) { if (Engine3D._current) Engine3D._current.res = v; }

    public static get inputSystem(): InputSystem { return Engine3D._current?.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D._current) Engine3D._current.inputSystem = v; }

    public static get views(): View3D[] { return Engine3D._current?.views; }
    public static set views(v: View3D[]) { if (Engine3D._current) Engine3D._current.views = v; }

    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._current?.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { if (Engine3D._current) Engine3D._current.renderJobs = v; }

    /**
     * Engine settings. Before the first `Engine3D.init()` call this points at
     * a shared pre-init object; after init it points at the active instance's
     * settings.
     */
    public static get setting(): EngineSetting {
        return Engine3D._current?.setting ?? _preinitSetting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D._current) {
            Engine3D._current.setting = v;
        } else {
            _preinitSetting = v;
        }
    }

    public static get frameRate(): number {
        return Engine3D._current?._frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (Engine3D._current) Engine3D._current.frameRate = value;
    }

    public static get size(): number[] { return Engine3D._current?.webGPUContext.presentationSize; }
    public static get aspect(): number { return Engine3D._current?.webGPUContext.aspect; }
    public static get width(): number { return Engine3D._current?.webGPUContext.windowWidth; }
    public static get height(): number { return Engine3D._current?.webGPUContext.windowHeight; }

    // ── Static method shims ───────────────────────────────────────────────────

    /**
     * Initialise a default (single) engine instance.
     * For multi-instance usage prefer `new Engine3D(); await engine.init(...)`.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        await engine.init(descriptor);
    }

    /** @see Engine3D.prototype.startRenderView */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._current.startRenderView(view);
    }

    /** @see Engine3D.prototype.startRenderViews */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._current.startRenderViews(views);
    }

    /** @see Engine3D.prototype.getRenderJob */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._current?.renderJobs?.get(view);
    }

    /** @see Engine3D.prototype.pause */
    public static pause(): void { Engine3D._current?.pause(); }

    /** @see Engine3D.prototype.resume */
    public static resume(): void { Engine3D._current?.resume(); }
}
