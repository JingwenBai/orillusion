import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setWebGPUContext } from './gfx/graphics/webGpu/Context3D';
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
 * Creates and returns the default {@link EngineSetting} object.
 * Called once per Engine3D instance so that each instance has its own copy.
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
 * Orillusion 3D Engine
 *
 * Instantiate one Engine3D per canvas/context. Multiple instances can run
 * concurrently — each owns its own WebGPU canvas context, bind groups,
 * render-texture pool and render loop.
 *
 * **Single-instance (legacy) usage** — all existing static API still works:
 * ```ts
 * await Engine3D.init({ canvasConfig: { canvas } });
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
 *
 * @group engine3D
 */
export class Engine3D {

    // ── Per-instance public state ─────────────────────────────────────────────

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system bound to this engine's canvas. */
    public inputSystem: InputSystem;

    /** Active views being rendered by this engine. */
    public views: View3D[];

    /** Map from View3D to its RendererJob. */
    public renderJobs: Map<View3D, RendererJob>;

    /** Per-instance engine settings. */
    public setting: EngineSetting = createDefaultSetting();

    /** WebGPU context (canvas + swap-chain) for this engine. */
    public context: Context3D;

    /** Per-engine global bind group (transform buffer, camera & light entries). */
    public globalBindGroup: GlobalBindGroup;

    /** Per-engine render-texture resource pool. */
    public rtResourceMap: RTResourceMap;

    // ── Per-instance private state ────────────────────────────────────────────

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /** Per-instance GBuffer frame cache (equivalent to the old static gBufferMap). */
    private _gBufferMap: Map<string, GBufferFrame> = new Map<string, GBufferFrame>();

    // ── Static shared flags ───────────────────────────────────────────────────

    /** True after WasmMatrix has been initialised (shared across all instances). */
    private static _wasmInitialized: boolean = false;

    /**
     * The most recently initialised Engine3D instance.
     * Used by all static backward-compat methods.
     */
    private static _active: Engine3D;

    // ═══════════════════════════════════════════════════════════════════════════
    // Static backward-compat API
    // All methods below delegate to the active (most recently initialised) instance
    // so that single-instance code works without changes.
    // ═══════════════════════════════════════════════════════════════════════════

    /** @deprecated Use instance.res */
    public static get res(): Res { return this._active?.res; }

    /** @deprecated Use instance.inputSystem */
    public static get inputSystem(): InputSystem { return this._active?.inputSystem; }

    /** @deprecated Use instance.views */
    public static get views(): View3D[] { return this._active?.views; }

    /** @deprecated Use instance.renderJobs */
    public static get renderJobs(): Map<View3D, RendererJob> { return this._active?.renderJobs; }

    /** @deprecated Use instance.setting */
    public static get setting(): EngineSetting { return this._active?.setting; }
    public static set setting(v: EngineSetting) { if (this._active) this._active.setting = v; }

    /** @deprecated Use instance.frameRate */
    public static get frameRate(): number { return this._active?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (this._active) this._active.frameRate = value; }

    /** @deprecated Use instance.context.presentationSize */
    public static get size(): number[] { return this._active?.context?.presentationSize; }

    /** @deprecated Use instance.context.aspect */
    public static get aspect(): number { return this._active?.context?.aspect; }

    /** @deprecated Use instance.context.windowWidth */
    public static get width(): number { return this._active?.context?.windowWidth; }

    /** @deprecated Use instance.context.windowHeight */
    public static get height(): number { return this._active?.context?.windowHeight; }

    /**
     * Initialise a default Engine3D instance and set it as active.
     * Subsequent calls to the static API will use this instance.
     * @deprecated Create an Engine3D instance and call init() on it directly.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        Engine3D._active = engine;
        return engine.init(descriptor);
    }

    /** @deprecated Use instance.startRenderView() */
    public static startRenderView(view: View3D): RendererJob {
        return this._active.startRenderView(view);
    }

    /** @deprecated Use instance.startRenderViews() */
    public static startRenderViews(views: View3D[]): void {
        this._active.startRenderViews(views);
    }

    /** @deprecated Use instance.getRenderJob() */
    public static getRenderJob(view: View3D): RendererJob {
        return this._active.getRenderJob(view);
    }

    /** @deprecated Use instance.pause() */
    public static pause(): void { this._active?.pause(); }

    /** @deprecated Use instance.resume() */
    public static resume(): void { this._active?.resume(); }

    // ═══════════════════════════════════════════════════════════════════════════
    // Instance API
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Frame rate cap for this engine instance.
     * Values ≥ 360 mean "uncapped".
     */
    public get frameRate(): number {
        return this._frameRate;
    }

    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    /**
     * Initialise this engine instance.
     *
     * Creates a WebGPU context for the configured canvas, sets up all
     * per-engine subsystems (GlobalBindGroup, RTResourceMap, Res, InputSystem)
     * and registers this instance as the active one for static backward-compat.
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

        // WasmMatrix is a shared WASM module — only initialise once per page.
        if (!Engine3D._wasmInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            Engine3D._wasmInitialized = true;
        }

        // Create a per-engine WebGPU context (shares the GPU device via static
        // fields on Context3D, but owns its own canvas and swap-chain).
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);

        // Create per-engine subsystems BEFORE activating the context so that
        // _activateContext can register them as current.
        this.globalBindGroup = new GlobalBindGroup();
        this.globalBindGroup.init();

        this.rtResourceMap = new RTResourceMap();
        this.rtResourceMap.init();

        // Expose this engine's context/subsystems as the active ones for all
        // subsystems that still use module-level or static references.
        this._activateContext();

        //── pre-compute reflection settings ───────────────────────────────────
        // RTResourceMap._current is now set, so GBufferFrame can allocate textures.
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
        //──────────────────────────────────────────────────────────────────────

        // Shader registries are device-level resources — safe to call on every
        // engine init; both methods are idempotent.
        ShaderLib.init();
        ShaderUtil.init();

        // Shadow light collection is keyed by Scene3D and shared across engines.
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
     * Make this engine the active one for all subsystems that use a static
     * "current" reference for backward-compat with single-instance call-sites.
     * Must be called at the start of any operation involving GPU resource
     * allocation (init, startRenderView, each frame).
     */
    private _activateContext(): void {
        Engine3D._active = this;
        setWebGPUContext(this.context);
        GBufferFrame.gBufferMap = this._gBufferMap;
        GlobalBindGroup.setCurrent(this.globalBindGroup);
        RTResourceMap.setCurrent(this.rtResourceMap);
    }

    private _startRenderJob(view: View3D): RendererJob {
        this._activateContext();

        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this.setting.pick.mode === `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this.setting.pick.mode === `pixel` || this.setting.pick.mode === `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Attach a single view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Attach multiple views and start the render loop.
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
     * Return the RendererJob for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /** Pause this engine's render loop. */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume (or start) this engine's render loop. */
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
        // Activate this engine's per-instance resources so that all synchronous
        // render-path code (GBufferFrame, GlobalBindGroup, RTResourceMap, …)
        // picks up the correct per-engine state for this frame.
        this._activateContext();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const [w, h] = this.context.presentationSize;
        for (const view of this.views) {
            view.scene.waitUpdate();
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        //── BeforeUpdate ──────────────────────────────────────────────────────
        for (const view of this.views) {
            const v = ComponentCollect.componentsBeforeUpdateList?.get(view);
            if (v) {
                for (const [component, call] of v) {
                    if (component.enable) call(view);
                }
            }
        }

        //── Compute pass ──────────────────────────────────────────────────────
        const command = this.context.device.createCommandEncoder();
        for (const view of this.views) {
            const v = ComponentCollect.componentsComputeList?.get(view);
            if (v) {
                for (const [component, call] of v) {
                    if (component.enable) call(view, command);
                }
            }
        }
        this.context.device.queue.submit([command.finish()]);

        //── Update ────────────────────────────────────────────────────────────
        for (const view of this.views) {
            const v = ComponentCollect.componentsUpdateList?.get(view);
            if (v) {
                for (const [component, call] of v) {
                    if (component.enable) call(view);
                }
            }
        }

        //── Graphic ───────────────────────────────────────────────────────────
        for (const view of this.views) {
            const v = ComponentCollect.graphicComponent?.get(view);
            if (v) {
                for (const [component, call] of v) {
                    if (view && component.enable) call(view);
                }
            }
        }

        if (this._renderLoop)
            await this._renderLoop();

        //── Write transform matrices to GPU ───────────────────────────────────
        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        //── Render jobs ───────────────────────────────────────────────────────
        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        //── LateUpdate ────────────────────────────────────────────────────────
        for (const view of this.views) {
            const v = ComponentCollect.componentsLateUpdateList?.get(view);
            if (v) {
                for (const [component, call] of v) {
                    if (component.enable) call(view);
                }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
