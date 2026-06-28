import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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

// ── Default engine setting ────────────────────────────────────────────────────

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
 * Orillusion 3D Engine — supports multiple independent instances.
 *
 * **Single-instance (legacy API — unchanged):**
 * ```ts
 * await Engine3D.init({ canvasConfig });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-instance API:**
 * ```ts
 * const engine1 = new Engine3D();
 * await engine1.init({ canvasConfig: { canvas: canvas1 } });
 * engine1.startRenderView(view1);
 *
 * const engine2 = new Engine3D();
 * await engine2.init({ canvasConfig: { canvas: canvas2 } });
 * engine2.startRenderView(view2);
 * ```
 * @group engine3D
 */
export class Engine3D {

    // ── Static tracking ───────────────────────────────────────────────────────

    /**
     * The engine instance currently executing its render frame.
     * Enables static backward-compat getters to resolve per-instance data.
     * @internal
     */
    public static _activeEngine: Engine3D | null = null;

    /**
     * All Engine3D instances created in this session.
     */
    public static readonly instances: Engine3D[] = [];

    /**
     * Whether shared GPU systems (WasmMatrix, ShaderLib, ShaderUtil, GlobalBindGroup)
     * have been initialised. These are per-device and must only run once.
     * @internal
     */
    private static _sharedSystemsReady: boolean = false;

    // ── Static backward-compat getters/setters ────────────────────────────────

    /** @deprecated Use engine instance property `engine.res` */
    public static get res(): Res { return Engine3D._activeEngine?._res; }
    public static set res(v: Res) { if (Engine3D._activeEngine) Engine3D._activeEngine._res = v; }

    /** @deprecated Use engine instance property `engine.inputSystem` */
    public static get inputSystem(): InputSystem { return Engine3D._activeEngine?._inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D._activeEngine) Engine3D._activeEngine._inputSystem = v; }

    /** @deprecated Use engine instance property `engine.views` */
    public static get views(): View3D[] { return Engine3D._activeEngine?._views; }
    public static set views(v: View3D[]) { if (Engine3D._activeEngine) Engine3D._activeEngine._views = v; }

    /** @deprecated Use engine instance property `engine.renderJobs` */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._activeEngine?._renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { if (Engine3D._activeEngine) Engine3D._activeEngine._renderJobs = v; }

    /** @deprecated Use engine instance property `engine.setting` */
    public static get setting(): EngineSetting { return Engine3D._activeEngine?._setting; }
    public static set setting(v: EngineSetting) { if (Engine3D._activeEngine) Engine3D._activeEngine._setting = v; }

    /** @deprecated Use engine.frameRate */
    public static get frameRate(): number { return Engine3D._activeEngine?._frameRate ?? 360; }
    public static set frameRate(v: number) { if (Engine3D._activeEngine) Engine3D._activeEngine.frameRate = v; }

    /** @deprecated Use engine.size */
    public static get size(): number[] { return Engine3D._activeEngine?.webGPUContext?.presentationSize ?? [0, 0]; }
    /** @deprecated Use engine.aspect */
    public static get aspect(): number { return Engine3D._activeEngine?.webGPUContext?.aspect ?? 1; }
    /** @deprecated Use engine.width */
    public static get width(): number { return Engine3D._activeEngine?.webGPUContext?.windowWidth ?? 0; }
    /** @deprecated Use engine.height */
    public static get height(): number { return Engine3D._activeEngine?.webGPUContext?.windowHeight ?? 0; }

    // ── Static backward-compat methods ────────────────────────────────────────

    /**
     * Legacy static init: creates a default Engine3D instance and initialises it.
     * For multi-instance use `new Engine3D()` + `engine.init()` instead.
     * @deprecated
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
        await engine.init(descriptor);
        return engine;
    }

    /** @deprecated Use engine.startRenderView(view) */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._activeEngine?.startRenderView(view);
    }

    /** @deprecated Use engine.startRenderViews(views) */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._activeEngine?.startRenderViews(views);
    }

    /** @deprecated Use engine.getRenderJob(view) */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._activeEngine?.getRenderJob(view);
    }

    /** @deprecated Use engine.pause() */
    public static pause(): void { Engine3D._activeEngine?.pause(); }

    /** @deprecated Use engine.resume() */
    public static resume(): void { Engine3D._activeEngine?.resume(); }

    // ── Per-instance private backing fields ───────────────────────────────────

    private _setting!: EngineSetting;
    private _res!: Res;
    private _inputSystem!: InputSystem;
    private _views!: View3D[];
    private _renderJobs!: Map<View3D, RendererJob>;
    private _frameRate: number = 360;
    private _frameRateValue: number = 0;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ── Per-instance public state ─────────────────────────────────────────────

    /** WebGPU context for this engine instance's canvas. */
    public webGPUContext!: Context3D;

    /** Per-engine component lifecycle registry. */
    public componentCollect: ComponentCollect;

    /** Per-engine shadow/light collection. */
    public shadowLightsCollect: ShadowLightsCollect;

    /** Per-engine G-buffer frame map. */
    public gBufferMap: Map<string, GBufferFrame>;

    /** Per-engine render texture registry. */
    public rtResourceMap: RTResourceMap;

    // ── Per-instance public getters ───────────────────────────────────────────

    public get setting(): EngineSetting { return this._setting; }
    public set setting(v: EngineSetting) { this._setting = v; }

    public get res(): Res { return this._res; }
    public set res(v: Res) { this._res = v; }

    public get inputSystem(): InputSystem { return this._inputSystem; }
    public set inputSystem(v: InputSystem) { this._inputSystem = v; }

    public get views(): View3D[] { return this._views; }
    public set views(v: View3D[]) { this._views = v; }

    public get renderJobs(): Map<View3D, RendererJob> { return this._renderJobs; }
    public set renderJobs(v: Map<View3D, RendererJob>) { this._renderJobs = v; }

    public get size(): number[] { return this.webGPUContext?.presentationSize; }
    public get aspect(): number { return this.webGPUContext?.aspect; }
    public get width(): number { return this.webGPUContext?.windowWidth; }
    public get height(): number { return this.webGPUContext?.windowHeight; }

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor() {
        Engine3D.instances.push(this);
        this._setting = createDefaultSetting();
        this.componentCollect = new ComponentCollect();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.gBufferMap = new Map<string, GBufferFrame>();
        this.rtResourceMap = new RTResourceMap();
    }

    // ── Instance init ─────────────────────────────────────────────────────────

    /**
     * Initialise this engine instance.
     * @param descriptor Init options.
     */
    public async init(
        descriptor: {
            canvasConfig?: CanvasConfig;
            beforeRender?: Function;
            renderLoop?: Function;
            lateRender?: Function;
            engineSetting?: EngineSetting;
        } = {}
    ): Promise<void> {
        // Partial activate: sets active engine and per-engine maps.
        // Context3D._active is null until webGPUContext is assigned below.
        this._activate();

        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this._setting = { ...this._setting, ...descriptor.engineSetting };

        // WasmMatrix does not need a GPU device — run once across all instances.
        if (!Engine3D._sharedSystemsReady) {
            await WasmMatrix.init(Matrix4.allocCount, this._setting.doublePrecision);
        }

        // Assign the WebGPU context: first engine reuses module-level singleton,
        // subsequent engines get their own Context3D (sharing the same GPU device).
        if (Engine3D.instances.indexOf(this) === 0) {
            this.webGPUContext = webGPUContext;
        } else {
            this.webGPUContext = new Context3D();
        }
        await this.webGPUContext.init(descriptor.canvasConfig);

        // Re-activate now that webGPUContext is set so Context3D._active is correct.
        this._activate();

        // Pre-compute reflection settings
        this._setting.reflectionSetting.width =
            this._setting.reflectionSetting.reflectionProbeSize * 6;
        this._setting.reflectionSetting.height =
            this._setting.reflectionSetting.reflectionProbeSize *
            this._setting.reflectionSetting.reflectionProbeMaxCount;

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this._setting.reflectionSetting.width,
            this._setting.reflectionSetting.height,
            false
        );

        // Shader and GPU bind-group systems depend on the shared GPU device — run once.
        if (!Engine3D._sharedSystemsReady) {
            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            Engine3D._sharedSystemsReady = true;
        }

        ShadowLightsCollect.init(); // no-op for compat

        this._res = new Res();
        this._res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this._inputSystem = new InputSystem();
        this._inputSystem.initCanvas(this.webGPUContext.canvas);
    }

    // ── Render view helpers ───────────────────────────────────────────────────

    private _startRenderJob(view: View3D): RendererJob {
        let renderJob = new ForwardRenderJob(view);
        this._renderJobs.set(view, renderJob);

        if (this._setting.pick.mode === `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this._setting.pick.mode === `pixel` || this._setting.pick.mode === `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Set a single render view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this._activate();
        this._renderJobs ||= new Map<View3D, RendererJob>();
        this._views = [view];
        view.engine = this;
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop.
     */
    public startRenderViews(views: View3D[]): void {
        this._activate();
        this._renderJobs ||= new Map<View3D, RendererJob>();
        this._views = views;
        for (let i = 0; i < views.length; i++) {
            views[i].engine = this;
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Return the RendererJob for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this._renderJobs?.get(view);
    }

    // ── Render loop control ───────────────────────────────────────────────────

    /** Pause this engine's render loop. */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume this engine's render loop. */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    // ── Internal render ───────────────────────────────────────────────────────

    /**
     * Set this engine as the globally active one (updates all static delegates).
     * Called at the start of each frame and at key init points.
     * @internal
     */
    private _activate(): void {
        Engine3D._activeEngine = this;
        RTResourceMap._active = this.rtResourceMap;
        GBufferFrame._activeGBufferMap = this.gBufferMap;
        Context3D._active = this.webGPUContext ?? null;
    }

    private async _render(time: number): Promise<void> {
        if (this._frameRateValue > 0) {
            const delta = time - this._time;
            if (delta < this._frameRateValue) {
                const t = performance.now();
                await new Promise<void>(res => {
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
        // Make this engine the active context for all static API calls
        this._activate();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        /* Update all transforms */
        const views = this._views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this.webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        // Before-update callbacks
        for (const [k, v] of this.componentCollect.componentsBeforeUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        const command = this.webGPUContext.device.createCommandEncoder();
        for (const [k, v] of this.componentCollect.componentsComputeList) {
            for (const [f, c] of v) {
                if (f.enable) c(k, command);
            }
        }
        this.webGPUContext.device.queue.submit([command.finish()]);

        // Update callbacks
        for (const [k, v] of this.componentCollect.componentsUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        // Graphic callbacks
        for (const [k, v] of this.componentCollect.graphicComponent) {
            for (const [f, c] of v) {
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop) await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);

        // Write matrix buffer to GPU
        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this._renderJobs.forEach((v, k) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        // Late-update callbacks
        for (const [k, v] of this.componentCollect.componentsLateUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        if (this._lateRender) await this._lateRender();
    }
}
