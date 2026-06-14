import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { activateTime, Time, TimeState } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { activateWebGPUContext, Context3D, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { setEngineScope } from './gfx/renderJob/EngineScope';

// ─── module-level state ───────────────────────────────────────────────────────

/** The Engine3D instance whose render frame is currently executing. */
let _activeEngine: Engine3D | null = null;

/** Auto-incremented counter used to generate unique engine scope IDs. */
let _engineCounter = 0;

/** WasmMatrix and ShaderLib are one-time global initialisations. */
let _wasmInitialized = false;
let _shaderLibInitialized = false;

// ─── default setting factory ──────────────────────────────────────────────────

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

// Mutable default used for the static Engine3D.setting API (pre-init mutations).
let _defaultSettingCache: EngineSetting = createDefaultSetting();

// ─── Engine3D class ───────────────────────────────────────────────────────────

/**
 * Orillusion 3D Engine — supports multiple simultaneous instances.
 *
 * **Single-instance (existing API, unchanged):**
 * ```ts
 * await Engine3D.init({ canvasConfig: { ... } });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-instance:**
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

    // ── instance state ────────────────────────────────────────────────────────

    /** Unique identifier used to scope per-engine resources (render textures, GBuffers). */
    public readonly engineId: string;

    /** WebGPU context owned by this engine instance (one canvas per instance). */
    public context3D: Context3D;

    /** Resource manager. */
    public res: Res;

    /** Input system. */
    public inputSystem: InputSystem;

    /** Active views for this engine. */
    public views: View3D[];

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    private _setting: EngineSetting = createDefaultSetting();
    private _timeState: TimeState = new TimeState();
    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.engineId = `engine_${++_engineCounter}`;
    }

    // ── instance getters/setters ──────────────────────────────────────────────

    /** Engine render setting for this instance. */
    public get setting(): EngineSetting { return this._setting; }
    public set setting(v: EngineSetting) { this._setting = v; }

    /**
     * Target frame rate for this engine (24/30/60/120/360 fps or other).
     */
    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    /** Presentation size [width, height]. */
    public get size(): number[] { return this.context3D?.presentationSize; }
    /** Aspect ratio of the canvas. */
    public get aspect(): number { return this.context3D?.aspect; }
    /** Canvas width in pixels. */
    public get width(): number { return this.context3D?.windowWidth; }
    /** Canvas height in pixels. */
    public get height(): number { return this.context3D?.windowHeight; }

    // ── instance methods ──────────────────────────────────────────────────────

    /**
     * Initialise this engine instance.
     * Creates its own `Context3D` (canvas + WebGPU canvas-context).
     * The WebGPU device/adapter is shared with all other engine instances.
     */
    public async init(
        descriptor: {
            canvasConfig?: CanvasConfig;
            beforeRender?: Function;
            renderLoop?: Function;
            lateRender?: Function;
            engineSetting?: EngineSetting;
        } = {}
    ): Promise<this> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Merge caller's overrides into this instance's setting.
        if (descriptor.engineSetting) {
            this._setting = { ...this._setting, ...descriptor.engineSetting };
        }

        // WasmMatrix is a one-time global init (single shared WASM memory block).
        if (!_wasmInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, this._setting.doublePrecision);
            _wasmInitialized = true;
        }

        // Create and initialise this engine's canvas/WebGPU context.
        this.context3D = new Context3D();
        await this.context3D.init(descriptor.canvasConfig);

        // Make this engine active before any further resource creation.
        this._activate();

        // Pre-compute reflection GBuffer dimensions.
        this._setting.reflectionSetting.width = this._setting.reflectionSetting.reflectionProbeSize * 6;
        this._setting.reflectionSetting.height =
            this._setting.reflectionSetting.reflectionProbeSize *
            this._setting.reflectionSetting.reflectionProbeMaxCount;

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this._setting.reflectionSetting.width,
            this._setting.reflectionSetting.height,
            false
        );

        // ShaderLib is idempotent — safe to call once globally.
        if (!_shaderLibInitialized) {
            ShaderLib.init();
            _shaderLibInitialized = true;
        }

        // These are all guarded internally so calling them per-engine is safe.
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
        this.inputSystem.initCanvas(this.context3D.canvas);

        return this;
    }

    /**
     * Set a single render view and start rendering.
     */
    public startRenderView(view: View3D): RendererJob {
        this._activate();
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        const job = this._startRenderJob(view);
        this.resume();
        return job;
    }

    /**
     * Set multiple render views and start rendering.
     */
    public startRenderViews(views: View3D[]): void {
        this._activate();
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the render job for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
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

    // ── private helpers ───────────────────────────────────────────────────────

    /**
     * Set this engine as the globally "active" engine.
     * All code that reads the static Engine3D.setting / webGPUContext / Time
     * will see this engine's state while it is active.
     */
    private _activate(): void {
        _activeEngine = this;
        activateWebGPUContext(this.context3D);
        activateTime(this._timeState);
        setEngineScope(this.engineId);
    }

    private _startRenderJob(view: View3D): RendererJob {
        const renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this._setting.pick.mode === `pixel`) {
            const pp = view.scene.getOrAddComponent(PostProcessingComponent);
            pp.addPost(FXAAPost);
        }

        if (this._setting.pick.mode === `pixel` || this._setting.pick.mode === `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    private async _render(time: number): Promise<void> {
        if (this._frameRateValue > 0) {
            const delta = time - this._time;
            if (delta < this._frameRateValue) {
                const t = performance.now();
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
        // Activate this engine's context/time/scope for the duration of this frame.
        this._activate();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this.context3D.presentationSize;
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

        let command = this.context3D.device.createCommandEncoder();
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
        this.context3D.device.queue.submit([command.finish()]);

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
        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
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

    // ── Static API (backward-compatible single-instance façade) ───────────────
    //
    // All static properties and methods delegate to _activeEngine so that
    // existing code using the class-level API continues to work unchanged.
    // ─────────────────────────────────────────────────────────────────────────

    /** @deprecated Use `new Engine3D()` and call instance methods for multi-instance support. */
    public static get res(): Res { return _activeEngine?.res; }
    public static set res(v: Res) { if (_activeEngine) _activeEngine.res = v; }

    /** @deprecated Use `new Engine3D()` and call instance methods for multi-instance support. */
    public static get inputSystem(): InputSystem { return _activeEngine?.inputSystem; }

    /** @deprecated Use `new Engine3D()` and call instance methods for multi-instance support. */
    public static get views(): View3D[] { return _activeEngine?.views; }
    public static set views(v: View3D[]) { if (_activeEngine) _activeEngine.views = v; }

    /**
     * @internal
     * @deprecated Use `new Engine3D()` and call instance methods for multi-instance support.
     */
    public static get renderJobs(): Map<View3D, RendererJob> { return _activeEngine?.renderJobs; }

    /**
     * Engine render setting.
     * Before any engine is initialised, reads/writes the shared default that
     * will be applied to the first engine created via the static `init()` path.
     */
    public static get setting(): EngineSetting {
        return _activeEngine?._setting ?? _defaultSettingCache;
    }
    public static set setting(v: EngineSetting) {
        if (_activeEngine) {
            _activeEngine._setting = v;
        } else {
            _defaultSettingCache = v;
        }
    }

    /** @deprecated Use instance property. */
    public static get frameRate(): number {
        return _activeEngine?._frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (_activeEngine) _activeEngine.frameRate = value;
    }

    /** @deprecated Use instance property. */
    public static get size(): number[] { return _activeEngine?.context3D?.presentationSize; }

    /** @deprecated Use instance property. */
    public static get aspect(): number { return _activeEngine?.context3D?.aspect; }

    /** @deprecated Use instance property. */
    public static get width(): number { return _activeEngine?.context3D?.windowWidth; }

    /** @deprecated Use instance property. */
    public static get height(): number { return _activeEngine?.context3D?.windowHeight; }

    /**
     * Create a new Engine3D instance and initialise it.
     * Returns the created instance so callers can store a reference for
     * multi-instance use.
     *
     * For the single-instance legacy flow this is identical to the original API.
     * Pre-init mutations made via `Engine3D.setting.xxx = yyy` are honoured
     * because the instance inherits the current `_defaultSettingCache`.
     */
    public static async init(
        descriptor: {
            canvasConfig?: CanvasConfig;
            beforeRender?: Function;
            renderLoop?: Function;
            lateRender?: Function;
            engineSetting?: EngineSetting;
        } = {}
    ): Promise<Engine3D> {
        const engine = new Engine3D();
        // Seed this instance from the current default (which may have been
        // pre-mutated via Engine3D.setting.xxx before init was called).
        engine._setting = { ..._defaultSettingCache };
        await engine.init(descriptor);
        return engine;
    }

    /**
     * Set a single render view and start rendering.
     * @deprecated Use instance method for multi-instance support.
     */
    public static startRenderView(view: View3D): RendererJob {
        return _activeEngine?.startRenderView(view);
    }

    /**
     * Set multiple render views and start rendering.
     * @deprecated Use instance method for multi-instance support.
     */
    public static startRenderViews(views: View3D[]): void {
        _activeEngine?.startRenderViews(views);
    }

    /**
     * Get the render job for a given view.
     * @deprecated Use instance method for multi-instance support.
     */
    public static getRenderJob(view: View3D): RendererJob {
        return _activeEngine?.getRenderJob(view);
    }

    /**
     * Pause the active engine's render loop.
     * @deprecated Use instance method for multi-instance support.
     */
    public static pause(): void { _activeEngine?.pause(); }

    /**
     * Resume the active engine's render loop.
     * @deprecated Use instance method for multi-instance support.
     */
    public static resume(): void { _activeEngine?.resume(); }
}
