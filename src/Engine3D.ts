import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { CanvasContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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

/**
 * Orillusion 3D Engine
 *
 * Supports both single-instance (static API, backwards compatible) and
 * multi-instance usage (create explicit Engine3D instances).
 *
 * **Single instance (existing code unchanged):**
 * ```ts
 * await Engine3D.init({ canvasConfig });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-instance:**
 * ```ts
 * const engine1 = new Engine3D();
 * await engine1.init({ canvasConfig: cfg1 });
 * engine1.startRenderView(view1);
 *
 * const engine2 = new Engine3D();
 * await engine2.init({ canvasConfig: cfg2 });
 * engine2.startRenderView(view2);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // =========================================================================
    // STATIC STATE
    // =========================================================================

    /**
     * The Engine3D instance that is currently executing its render loop tick.
     * Set by each instance at the start of every render frame and during init().
     * Used by the static property accessors so that engine-internal code which
     * calls `Engine3D.setting`, `Engine3D.res`, etc. transparently reads from
     * the currently active instance without needing changes.
     * @internal
     */
    private static _current: Engine3D = null;

    /** True once the shared WebGPU device and global subsystems have been initialised. */
    private static _deviceInitialized: boolean = false;

    /**
     * Mutable default settings object.
     * Used when `Engine3D.setting` is accessed before any instance is created,
     * and as the base for each new instance's settings.
     */
    private static _defaultSetting: EngineSetting = createDefaultSetting();

    // =========================================================================
    // STATIC PROPERTY ACCESSORS  (backward-compatible delegation to _current)
    // =========================================================================

    /**
     * Resource manager of the active Engine3D instance.
     */
    public static get res(): Res { return Engine3D._current?.res; }

    /**
     * Input system of the active Engine3D instance.
     */
    public static get inputSystem(): InputSystem { return Engine3D._current?.inputSystem; }

    /**
     * Active render views of the active Engine3D instance.
     */
    public static get views(): View3D[] { return Engine3D._current?.views; }

    /**
     * Render-job map of the active Engine3D instance.
     * @internal
     */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._current?.renderJobs; }

    /**
     * Engine settings.
     * Before any instance is initialised this returns (and mutates) the shared
     * default settings object.  During rendering it returns the active instance's
     * own settings copy.
     */
    public static get setting(): EngineSetting {
        return Engine3D._current ? Engine3D._current.setting : Engine3D._defaultSetting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D._current) {
            Engine3D._current.setting = v;
        } else {
            Engine3D._defaultSetting = v;
        }
    }

    /** Render window width (active canvas). */
    public static get width(): number { return Engine3D._current?._canvasContext?.windowWidth ?? 0; }

    /** Render window height (active canvas). */
    public static get height(): number { return Engine3D._current?._canvasContext?.windowHeight ?? 0; }

    /** Render window aspect ratio (active canvas). */
    public static get aspect(): number { return Engine3D._current?._canvasContext?.aspect ?? 1; }

    /** Render window [width, height] (active canvas). */
    public static get size(): number[] { return Engine3D._current?._canvasContext?.presentationSize ?? [0, 0]; }

    /** Target frame rate (active instance). */
    public static get frameRate(): number { return Engine3D._current?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (Engine3D._current) Engine3D._current.frameRate = value; }

    // =========================================================================
    // STATIC METHODS  (backward-compatible; delegate to active instance)
    // =========================================================================

    /**
     * Create a default Engine3D instance and initialise it.
     * Existing single-instance code can call this without any changes.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const instance = new Engine3D();
        await instance.init(descriptor);
    }

    /** Start rendering the given view (static API). */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._current?.startRenderView(view);
    }

    /** Start rendering multiple views (static API). */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._current?.startRenderViews(views);
    }

    /** Return the RendererJob for a given view (static API). */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._current?.getRenderJob(view);
    }

    /** Pause the render loop of the active instance. */
    public static pause(): void { Engine3D._current?.pause(); }

    /** Resume the render loop of the active instance. */
    public static resume(): void { Engine3D._current?.resume(); }

    // =========================================================================
    // INSTANCE STATE
    // =========================================================================

    /** Per-instance resource manager. */
    public res: Res;

    /** Per-instance input system. */
    public inputSystem: InputSystem;

    /** Active render views for this engine instance. */
    public views: View3D[] = [];

    /** @internal */
    public renderJobs: Map<View3D, RendererJob> = new Map();

    /** Per-instance engine settings (deep-copied from defaults on init). */
    public setting: EngineSetting;

    private _canvasContext: CanvasContext;
    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // =========================================================================
    // INSTANCE PROPERTY ACCESSORS
    // =========================================================================

    public get size(): number[] { return this._canvasContext?.presentationSize ?? [0, 0]; }
    public get aspect(): number { return this._canvasContext?.aspect ?? 1; }
    public get width(): number { return this._canvasContext?.windowWidth ?? 0; }
    public get height(): number { return this._canvasContext?.windowHeight ?? 0; }

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    // =========================================================================
    // INSTANCE METHODS
    // =========================================================================

    /**
     * Initialise this Engine3D instance.
     *
     * The first call (across all instances) initialises the shared WebGPU device
     * and global subsystems (shaders, bind groups, shadow system).  Subsequent
     * calls only create a new per-instance canvas context and resource pool.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        // Expose this instance as _current during init so that subsystems that
        // read Engine3D.setting during their initialisation see this instance's values.
        Engine3D._current = this;

        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Build this instance's settings: start from the shared defaults (which
        // may have been mutated pre-init via Engine3D.setting.xyz = …), then
        // overlay the descriptor's engineSetting.
        this.setting = { ...Engine3D._defaultSetting, ...descriptor.engineSetting };

        if (!Engine3D._deviceInitialized) {
            Engine3D._deviceInitialized = true;

            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            await webGPUContext.initDevice();

            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            ShadowLightsCollect.init();
        }

        // Per-instance canvas initialisation (must happen before GBufferFrame creation
        // so that webGPUContext.activeCanvas and presentationSize are correct).
        this._canvasContext = await webGPUContext.initCanvas(descriptor.canvasConfig);
        webGPUContext.setActiveCanvas(this._canvasContext);

        // RTResourceMap entries are lazy-created per active CanvasContext; no explicit
        // init needed, but the call is kept for API compatibility.
        RTResourceMap.init();

        // Pre-compute reflection GBuffer dimensions for this instance.
        this.setting.reflectionSetting.width =
            this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false,
        );

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this._canvasContext.canvas);
    }

    private _startRenderJob(view: View3D): RendererJob {
        const renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this.setting.pick.mode === 'pixel') {
            const postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this.setting.pick.mode === 'pixel' || this.setting.pick.mode === 'bound') {
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
            this._startRenderJob(view);
        }
        this.resume();
    }

    /**
     * Return the RendererJob for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
    }

    /**
     * Pause the render loop for this instance.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the render loop for this instance.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    private async _render(time: number): Promise<void> {
        // Make this instance the globally active one for the duration of this tick.
        // Since JS is single-threaded and rAF callbacks never interleave, this is safe.
        Engine3D._current = this;
        webGPUContext.setActiveCanvas(this._canvasContext);

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
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        // Update only the views that belong to this instance.
        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        // --- beforeUpdate ---
        for (const view of this.views) {
            const list = ComponentCollect.componentsBeforeUpdateList.get(view);
            if (list) {
                for (const [f, c] of list) {
                    if (f.enable) c(view);
                }
            }
        }

        // --- compute (GPU commands) ---
        const command = webGPUContext.device.createCommandEncoder();
        for (const view of this.views) {
            const list = ComponentCollect.componentsComputeList.get(view);
            if (list) {
                for (const [f, c] of list) {
                    if (f.enable) c(view, command);
                }
            }
        }
        webGPUContext.device.queue.submit([command.finish()]);

        // --- update ---
        for (const view of this.views) {
            const list = ComponentCollect.componentsUpdateList.get(view);
            if (list) {
                for (const [f, c] of list) {
                    if (f.enable) c(view);
                }
            }
        }

        // --- graphic ---
        for (const view of this.views) {
            const list = ComponentCollect.graphicComponent.get(view);
            if (list) {
                for (const [f, c] of list) {
                    if (f && f.enable) c(view);
                }
            }
        }

        if (this._renderLoop)
            await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        GlobalBindGroup.modelMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        // --- lateUpdate ---
        for (const view of this.views) {
            const list = ComponentCollect.componentsLateUpdateList.get(view);
            if (list) {
                for (const [f, c] of list) {
                    if (f.enable) c(view);
                }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
