import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveGPUContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { GPUContext } from './gfx/renderJob/GPUContext';

/**
 * Orillusion 3D Engine — now instantiable for multi-instance rendering.
 *
 * **Single-instance (existing code unchanged):**
 * ```ts
 * Engine3D.setting.shadow.enable = false;
 * await Engine3D.init({ canvasConfig });
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

    // ─────────────────────────────────────────────────────────────────────────
    // INSTANCE STATE
    // ─────────────────────────────────────────────────────────────────────────

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine instance's canvas. */
    public inputSystem: InputSystem;

    /** Active views for this engine instance. */
    public views: View3D[];

    /** Per-engine settings. */
    public setting: EngineSetting;

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    // Per-engine subsystems
    /** @internal */ public _context: Context3D;
    /** @internal */ public _componentCollect: ComponentCollect;
    /** @internal */ public _globalBindGroup: GlobalBindGroup;
    /** @internal */ public _rtResourceMap: RTResourceMap;
    /** @internal */ public _shadowLightsCollect: ShadowLightsCollect;
    /** @internal */ public _gpuContext: GPUContext;
    /** @internal */ public _gBufferMap: Map<string, GBufferFrame>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        // Start with a fresh copy of the global pre-init setting template
        this.setting = Engine3D._cloneSetting(Engine3D._globalSetting);
        this._gBufferMap = new Map<string, GBufferFrame>();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INSTANCE GETTERS
    // ─────────────────────────────────────────────────────────────────────────

    /** Target frame rate for this engine instance. */
    get frameRate(): number { return this._frameRate; }
    set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    /** Canvas size [width, height] for this engine instance. */
    get size(): number[] { return this._context?.presentationSize; }
    /** Canvas aspect ratio for this engine instance. */
    get aspect(): number { return this._context?.aspect; }
    /** Canvas pixel width for this engine instance. */
    get width(): number { return this._context?.windowWidth; }
    /** Canvas pixel height for this engine instance. */
    get height(): number { return this._context?.windowHeight; }

    // ─────────────────────────────────────────────────────────────────────────
    // INSTANCE METHODS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Initialise this engine instance: create the WebGPU context (reusing a
     * shared device if one already exists), set up per-engine subsystems, and
     * load default resources.
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

        // Merge caller-supplied settings on top of this instance's setting
        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // ── Step 1: Create and initialise per-engine GPU canvas context ──────
        this._context = new Context3D();
        await this._context.init(descriptor.canvasConfig);

        // ── Step 2: Activate this engine (sets static delegates) ─────────────
        this._activate();

        // ── Step 3: One-time global inits (idempotent / guarded) ─────────────
        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        if (!ShaderLib.isInitialized) ShaderLib.init();
        if (!ShaderUtil.renderShaderModulePool) ShaderUtil.init();

        // ── Step 4: Per-engine subsystems (GPU device now ready) ─────────────
        this._globalBindGroup = new GlobalBindGroup();
        GlobalBindGroup.setActive(this._globalBindGroup);

        // Pre-compute reflection G-buffer sizes
        this.setting.reflectionSetting.width =
            this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // ── Step 5: Resources and input ──────────────────────────────────────
        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this._context.canvas);
    }

    /**
     * Activate this engine instance: update all static singleton delegates so
     * that webGPUContext, ComponentCollect, GlobalBindGroup, etc. all refer to
     * this instance's per-engine state. Called at the start of every render
     * frame so multi-instance switching is safe.
     * @internal
     */
    public _activate(): void {
        Engine3D.current = this;
        setActiveGPUContext(this._context);

        if (!this._componentCollect) {
            this._componentCollect = new ComponentCollect();
        }
        ComponentCollect.setActive(this._componentCollect);

        if (!this._rtResourceMap) {
            this._rtResourceMap = new RTResourceMap();
        }
        RTResourceMap.setActive(this._rtResourceMap);

        if (!this._shadowLightsCollect) {
            this._shadowLightsCollect = new ShadowLightsCollect();
        }
        ShadowLightsCollect.setActive(this._shadowLightsCollect);

        if (!this._gpuContext) {
            this._gpuContext = new GPUContext();
        }
        GPUContext.setActive(this._gpuContext);

        GBufferFrame.setActiveMap(this._gBufferMap);

        if (this._globalBindGroup) {
            GlobalBindGroup.setActive(this._globalBindGroup);
        }
    }

    /**
     * Add a view and start rendering. Returns the created RendererJob.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Add multiple views and start rendering.
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
        return this.renderJobs?.get(view);
    }

    /** Pause rendering for this engine instance. */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume rendering for this engine instance. */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
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

    private async _render(time: number): Promise<void> {
        // Activate this engine's context before doing any work this frame
        this._activate();

        if (this._frameRateValue > 0) {
            let delta = time - this._time;
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
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = webGPUContext.presentationSize;
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

        let command = webGPUContext.device.createCommandEncoder();
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

        webGPUContext.device.queue.submit([command.finish()]);

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
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
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

    // ─────────────────────────────────────────────────────────────────────────
    // STATIC API (backward-compatible — all calls delegate to Engine3D.current)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * The currently active Engine3D instance. Updated at the start of each
     * render frame by the active engine. For single-instance code this always
     * refers to the one engine created by `Engine3D.init()`.
     */
    public static current: Engine3D;

    // Pre-init setting template: the static `Engine3D.setting` accessor reads
    // this until the first engine is created. Users can modify it before
    // calling `Engine3D.init()` as they did before.
    private static _globalSetting: EngineSetting = Engine3D._createDefaultSetting();

    /** @internal */
    public static get res(): Res { return Engine3D.current?.res; }
    public static set res(v: Res) { if (Engine3D.current) Engine3D.current.res = v; }

    /** @internal */
    public static get inputSystem(): InputSystem { return Engine3D.current?.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D.current) Engine3D.current.inputSystem = v; }

    /** @internal */
    public static get views(): View3D[] { return Engine3D.current?.views; }
    public static set views(v: View3D[]) { if (Engine3D.current) Engine3D.current.views = v; }

    /** @internal */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D.current?.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { if (Engine3D.current) Engine3D.current.renderJobs = v; }

    /**
     * Engine settings. Before `Engine3D.init()` is called this returns the
     * global pre-init template that users can modify. After init it returns
     * the active engine's own settings object.
     */
    public static get setting(): EngineSetting {
        return Engine3D.current ? Engine3D.current.setting : Engine3D._globalSetting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D.current) {
            Engine3D.current.setting = v;
        } else {
            Engine3D._globalSetting = v;
        }
    }

    public static get frameRate(): number { return Engine3D.current?._frameRate ?? 360; }
    public static set frameRate(value: number) {
        if (Engine3D.current) Engine3D.current.frameRate = value;
    }

    public static get size(): number[] { return Engine3D.current?._context?.presentationSize; }
    public static get aspect(): number { return Engine3D.current?._context?.aspect; }
    public static get width(): number { return Engine3D.current?._context?.windowWidth; }
    public static get height(): number { return Engine3D.current?._context?.windowHeight; }

    /**
     * Create a new Engine3D instance, initialise it, and set it as the active
     * engine. Equivalent to `new Engine3D(); await engine.init(descriptor)`.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        // Set current early so async code in init() can access Engine3D.current
        Engine3D.current = engine;
        await engine.init(descriptor);
    }

    public static startRenderView(view: View3D): RendererJob {
        return Engine3D.current.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        Engine3D.current.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.current?.getRenderJob(view);
    }

    public static pause(): void {
        Engine3D.current?.pause();
    }

    public static resume(): void {
        Engine3D.current?.resume();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

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

    /**
     * Shallow-clone the top-level setting object. Sub-objects are shared by
     * reference, which is correct for single-engine usage and acceptable for
     * multi-engine setups where users supply per-instance settings explicitly.
     */
    private static _cloneSetting(src: EngineSetting): EngineSetting {
        return { ...src };
    }
}
