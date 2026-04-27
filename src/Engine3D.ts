import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveWebGPUContext } from './gfx/graphics/webGpu/Context3D';
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

// ── Default settings factory ──────────────────────────────────────────────────
// Returns a fresh copy so each Engine3D instance gets its own mutable settings.
function createDefaultEngineSetting(): EngineSetting {
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
 * Orillusion 3D Engine – multi-instance edition.
 *
 * Each `Engine3D` instance manages its own canvas, WebGPU context, resource
 * manager, input system, render jobs, and render loop.  Create one instance
 * per `<canvas>` element:
 *
 * ```ts
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas } });
 * engine.startRenderView(view);
 * ```
 *
 * Internal engine code (render passes, bind-groups, etc.) reads the shared
 * static getters `Engine3D.setting`, `Engine3D.res`, etc., which automatically
 * delegate to whichever instance is currently rendering.
 *
 * @group engine3D
 */
export class Engine3D {

    // ── Static registry ───────────────────────────────────────────────────────
    /** All active Engine3D instances. */
    public static readonly instances: Set<Engine3D> = new Set<Engine3D>();

    /** The engine instance that is currently executing its render frame. */
    public static current: Engine3D | null = null;

    // Sequential ID counter – used to key per-engine resource maps.
    private static _nextId: number = 1;

    // Shared one-time global initialisation flag.
    private static _globalInitialized: boolean = false;

    // ── Static compatibility getters (for internal engine code) ───────────────
    // These delegate to the currently-rendering engine so that existing code
    // such as `Engine3D.setting.sky.skyExposure` keeps working without changes.

    /** Per-engine setting of the currently-active engine (read by internal code). */
    public static get setting(): EngineSetting {
        return Engine3D.current?.setting ?? Engine3D._defaultSetting;
    }

    /** Resource manager of the currently-active engine. */
    public static get res(): Res | null {
        return Engine3D.current?.res ?? null;
    }

    /** Canvas width of the currently-active engine. */
    public static get width(): number {
        return Engine3D.current?._context?.windowWidth ?? 0;
    }

    /** Canvas height of the currently-active engine. */
    public static get height(): number {
        return Engine3D.current?._context?.windowHeight ?? 0;
    }

    /** Presentation size [w, h] of the currently-active engine. */
    public static get size(): number[] {
        return Engine3D.current?._context?.presentationSize ?? [0, 0];
    }

    /** Aspect ratio of the currently-active engine. */
    public static get aspect(): number {
        return Engine3D.current?._context?.aspect ?? 1;
    }

    // Shared fallback settings (mutated via `Engine3D.setting.foo = …` before init).
    private static _defaultSetting: EngineSetting = createDefaultEngineSetting();

    // ── Instance properties ───────────────────────────────────────────────────

    /** Unique numeric ID for this engine instance. */
    public readonly id: number = Engine3D._nextId++;

    /** Per-engine configuration. Initialised to a copy of the default settings. */
    public setting: EngineSetting = createDefaultEngineSetting();

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system bound to this engine's canvas. */
    public inputSystem: InputSystem;

    /** Active views being rendered by this engine. */
    public views: View3D[] = [];

    /** Map from View3D → RendererJob for each active view. */
    public renderJobs: Map<View3D, RendererJob> = new Map<View3D, RendererJob>();

    // WebGPU context owned by this instance.
    private _context: Context3D;

    // Render-loop state.
    private _frameRate: number = 360;
    private _frameRateValue: number = 0;
    private _time: number = 0;
    private _requestAnimationFrameID: number = 0;

    // Per-frame callbacks supplied by the application.
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;

    // ── Instance getters ──────────────────────────────────────────────────────

    /** The WebGPU context owned by this engine instance. */
    public get context(): Context3D {
        return this._context;
    }

    /** Canvas rendering width for this engine. */
    public get width(): number {
        return this._context?.windowWidth ?? 0;
    }

    /** Canvas rendering height for this engine. */
    public get height(): number {
        return this._context?.windowHeight ?? 0;
    }

    /** Presentation size [w, h] for this engine. */
    public get size(): number[] {
        return this._context?.presentationSize ?? [0, 0];
    }

    /** Canvas aspect ratio for this engine. */
    public get aspect(): number {
        return this._context?.aspect ?? 1;
    }

    /**
     * Target frame-rate cap (frames per second).
     * Values ≥ 360 disable the cap (render at native vsync speed).
     */
    public get frameRate(): number {
        return this._frameRate;
    }

    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /**
     * Initialise the engine.  Creates a WebGPU context for the supplied canvas
     * (or auto-creates one), initialises global GPU resources (first call only),
     * and starts the per-instance resource systems.
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

        // Merge caller-supplied settings onto this instance's fresh copy.
        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // ── One-time global init (WasmMatrix, ShaderLib, …) ──────────────────
        if (!Engine3D._globalInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // ── Per-instance: create and activate this engine's WebGPU context ───
        this._context = new Context3D();
        this._activate(); // sets active context + engine ID for resource access
        await this._context.init(descriptor.canvasConfig);

        // ── One-time global GPU resource init ─────────────────────────────────
        if (!Engine3D._globalInitialized) {
            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            Engine3D._globalInitialized = true;
        }

        // Pre-compute reflection texture size.
        this.setting.reflectionSetting.width =
            this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Per-instance resource maps.
        RTResourceMap.init();

        // ShadowLightsCollect uses scene-keyed maps – idempotent init.
        ShadowLightsCollect.init();

        // Reflection GBuffer (fixed size, per-engine).
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
        this.inputSystem.initCanvas(this._context.canvas);

        Engine3D.instances.add(this);
    }

    // ── Render-job management ─────────────────────────────────────────────────

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
     * Attach a single view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.views = [view];
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Attach multiple views and start the render loop.
     */
    public startRenderViews(views: View3D[]): void {
        this.views = views;
        for (const view of views) {
            this._startRenderJob(view);
        }
        this.resume();
    }

    /**
     * Retrieve the RendererJob associated with a view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    // ── Render-loop control ───────────────────────────────────────────────────

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

    /** Destroy this engine instance and free its resources. */
    public destroy(): void {
        this.pause();
        Engine3D.instances.delete(this);
        if (Engine3D.current === this) {
            Engine3D.current = null;
        }
    }

    // ── Internal render loop ──────────────────────────────────────────────────

    private _activate(): void {
        Engine3D.current = this;
        setActiveWebGPUContext(this._context, this.id);
    }

    private async _render(time: number): Promise<void> {
        if (this._frameRateValue > 0) {
            const delta = time - this._time;
            if (delta < this._frameRateValue) {
                const t = performance.now();
                await new Promise<void>((res) => {
                    setTimeout(() => {
                        time += performance.now() - t;
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
        // Make this engine the active one for all downstream resource access.
        this._activate();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this._context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        for (const [view, v] of ComponentCollect.componentsBeforeUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(view);
            }
        }

        const command = this._context.device.createCommandEncoder();
        for (const [view, v] of ComponentCollect.componentsComputeList) {
            for (const [f, c] of v) {
                if (f.enable) c(view, command);
            }
        }
        this._context.device.queue.submit([command.finish()]);

        for (const [view, v] of ComponentCollect.componentsUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(view);
            }
        }

        for (const [view, v] of ComponentCollect.graphicComponent) {
            for (const [f, c] of v) {
                if (view && f.enable) c(view);
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

        for (const [view, v] of ComponentCollect.componentsLateUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(view);
            }
        }

        if (this._lateRender) await this._lateRender();
    }
}
