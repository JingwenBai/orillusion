import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setWebGPUContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { DeviceContext } from './gfx/graphics/webGpu/DeviceContext';

// ---------------------------------------------------------------------------
// Default engine configuration — copied per Engine3D instance.
// ---------------------------------------------------------------------------
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
 * Orillusion 3D Engine.
 *
 * Can be used as a traditional all-static singleton (backward-compatible):
 * ```ts
 * await Engine3D.init({ canvasConfig });
 * Engine3D.startRenderView(view);
 * ```
 *
 * Or instantiated directly for multi-instance rendering (multiple canvases):
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

    // -----------------------------------------------------------------------
    // PER-INSTANCE STATE
    // -----------------------------------------------------------------------

    /** Resource manager for this engine instance */
    public res: Res;

    /** Input system for this engine instance */
    public inputSystem: InputSystem;

    /** Active views for this engine instance */
    public views: View3D[];

    /** Render jobs keyed by View3D for this engine instance */
    public renderJobs: Map<View3D, RendererJob>;

    /** Entity collect for this engine instance */
    public entityCollect: EntityCollect;

    /** Per-instance engine settings */
    public setting: EngineSetting;

    // -----------------------------------------------------------------------
    // PRIVATE PER-INSTANCE STATE
    // -----------------------------------------------------------------------

    /** @internal */
    public _context: Context3D;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // -----------------------------------------------------------------------
    // STATIC REGISTRY
    // -----------------------------------------------------------------------

    /**
     * All Engine3D instances currently alive.
     * Index 0 is always the first (default) instance.
     */
    public static readonly instances: Engine3D[] = [];

    /**
     * The engine instance whose render frame is currently executing.
     * Set at the start of every frame; used by backward-compat static getters
     * (Engine3D.setting, EntityCollect.instance, webGPUContext, …) so that
     * existing code continues to work without modification.
     * @internal
     */
    public static _active: Engine3D | null = null;

    // -----------------------------------------------------------------------
    // BACKWARD-COMPAT STATIC API
    // -----------------------------------------------------------------------
    // All static members delegate to the active (or first/default) instance.

    private static get _default(): Engine3D | null {
        return this.instances[0] ?? null;
    }

    /** @deprecated Use instance `.setting` instead. */
    public static get setting(): EngineSetting {
        return (this._active ?? this._default)?.setting;
    }
    public static set setting(v: EngineSetting) {
        const target = this._active ?? this._default;
        if (target) target.setting = v;
    }

    /** @deprecated Use instance `.res` instead. */
    public static get res(): Res {
        return (this._active ?? this._default)?.res;
    }
    public static set res(v: Res) {
        const target = this._active ?? this._default;
        if (target) target.res = v;
    }

    /** @deprecated Use instance `.inputSystem` instead. */
    public static get inputSystem(): InputSystem {
        return (this._active ?? this._default)?.inputSystem;
    }
    public static set inputSystem(v: InputSystem) {
        const target = this._active ?? this._default;
        if (target) target.inputSystem = v;
    }

    /** @deprecated Use instance `.views` instead. */
    public static get views(): View3D[] {
        return (this._active ?? this._default)?.views;
    }

    /** @deprecated Use instance `.renderJobs` instead. */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return (this._active ?? this._default)?.renderJobs;
    }

    /** get render window size [width, height] */
    public static get size(): number[] {
        return (this._active ?? this._default)?._context?.presentationSize ?? [0, 0];
    }

    /** get render window aspect ratio */
    public static get aspect(): number {
        return (this._active ?? this._default)?._context?.aspect ?? 1;
    }

    /** get render window width */
    public static get width(): number {
        return (this._active ?? this._default)?._context?.windowWidth ?? 0;
    }

    /** get render window height */
    public static get height(): number {
        return (this._active ?? this._default)?._context?.windowHeight ?? 0;
    }

    /** set/get engine render frame rate (fps) */
    public static get frameRate(): number {
        return (this._active ?? this._default)?._frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        const target = this._active ?? this._default;
        if (target) target.frameRate = value;
    }

    // -----------------------------------------------------------------------
    // STATIC FACTORY / DELEGATE METHODS  (backward compat)
    // -----------------------------------------------------------------------

    /**
     * Create and initialise the default single Engine3D instance.
     * Equivalent to `new Engine3D().init(descriptor)`.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        let instance = this.instances[0];
        if (!instance) {
            instance = new Engine3D();
        }
        return instance.init(descriptor);
    }

    /** @see instance `startRenderView` */
    public static startRenderView(view: View3D): RendererJob {
        return this._default!.startRenderView(view);
    }

    /** @see instance `startRenderViews` */
    public static startRenderViews(views: View3D[]): void {
        return this._default!.startRenderViews(views);
    }

    /**
     * Return the RendererJob for a given view across any engine instance.
     */
    public static getRenderJob(view: View3D): RendererJob {
        return view.engine?.getRenderJob(view) ?? null;
    }

    /** Pause default engine render loop */
    public static pause(): void { this._default?.pause(); }

    /** Resume default engine render loop */
    public static resume(): void { this._default?.resume(); }

    // -----------------------------------------------------------------------
    // PER-INSTANCE ACCESSORS
    // -----------------------------------------------------------------------

    /** get render window size [width, height] */
    public get size(): number[] { return this._context?.presentationSize ?? [0, 0]; }

    /** get render window aspect ratio */
    public get aspect(): number { return this._context?.aspect ?? 1; }

    /** get render window width */
    public get width(): number { return this._context?.windowWidth ?? 0; }

    /** get render window height */
    public get height(): number { return this._context?.windowHeight ?? 0; }

    /** set/get engine render frame rate (fps) */
    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    // -----------------------------------------------------------------------
    // INSTANCE INIT
    // -----------------------------------------------------------------------

    /**
     * Initialise this Engine3D instance.
     * Creates a new WebGPU canvas context; the underlying GPU device is shared
     * with any other Engine3D instances that were already initialised.
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

        this.setting = { ...createDefaultSetting(), ...descriptor.engineSetting };

        const isFirstEngine = !DeviceContext.initialized;

        if (isFirstEngine) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        this._context = new Context3D();
        await this._context.init(descriptor.canvasConfig);

        // One-time global GPU-resource initialisation
        if (isFirstEngine) {
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

            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            RTResourceMap.init();
            ShadowLightsCollect.init();
        }

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this._context.canvas);

        this.entityCollect = new EntityCollect();
        this.renderJobs = new Map<View3D, RendererJob>();
        this.views = [];

        Engine3D.instances.push(this);

        // First init also sets _active so that code running before the render
        // loop (e.g. Scene3D constructor) sees a valid active engine.
        if (!Engine3D._active) {
            Engine3D._active = this;
        }

        // Expose this engine's context for code that imported webGPUContext
        setWebGPUContext(this._context);
    }

    // -----------------------------------------------------------------------
    // INSTANCE RENDER CONTROL
    // -----------------------------------------------------------------------

    private _startRenderJob(view: View3D): RendererJob {
        view.engine = this;
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
     * Set a single render view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        // Activate this engine so static getters (Engine3D.inputSystem, etc.)
        // return the correct values during setup of pick, GUI, etc.
        Engine3D._active = this;
        setWebGPUContext(this._context);
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop.
     */
    public startRenderViews(views: View3D[]): void {
        Engine3D._active = this;
        setWebGPUContext(this._context);
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Return the RendererJob for a view owned by this engine instance.
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
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    // -----------------------------------------------------------------------
    // RENDER LOOP
    // -----------------------------------------------------------------------

    private async _render(time: number): Promise<void> {
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
        // Set this engine as the active one for this frame.
        // All backward-compat static getters (Engine3D.setting, EntityCollect.instance, …)
        // and the module-level webGPUContext export will now return this engine's values.
        Engine3D._active = this;
        setWebGPUContext(this._context);

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

        // Before-update pass — only this engine's views
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            const map = ComponentCollect.componentsBeforeUpdateList.get(view);
            if (map) {
                for (const [component, call] of map) {
                    if (component.enable) call(view);
                }
            }
        }

        // Compute pass — only this engine's views
        let command = this._context.device.createCommandEncoder();
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            const map = ComponentCollect.componentsComputeList.get(view);
            if (map) {
                for (const [component, call] of map) {
                    if (component.enable) call(view, command);
                }
            }
        }
        this._context.device.queue.submit([command.finish()]);

        // Update pass — only this engine's views
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            const map = ComponentCollect.componentsUpdateList.get(view);
            if (map) {
                for (const [component, call] of map) {
                    if (component.enable) call(view);
                }
            }
        }

        // Graphic components — only this engine's views
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            const map = ComponentCollect.graphicComponent.get(view);
            if (map) {
                for (const [component, call] of map) {
                    if (view && component.enable) call(view);
                }
            }
        }

        if (this._renderLoop) await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);

        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((job, view) => {
            if (!job.renderState) job.start();
            job.renderFrame();
        });

        // Late-update pass — only this engine's views
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            const map = ComponentCollect.componentsLateUpdateList.get(view);
            if (map) {
                for (const [component, call] of map) {
                    if (component.enable) call(view);
                }
            }
        }

        if (this._lateRender) await this._lateRender();
    }
}
