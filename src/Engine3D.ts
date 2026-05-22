import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setWebGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap } from './gfx/renderJob/frame/RTResourceMap';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';

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

/**
 * Default engine settings template — used as the initial value for new Engine3D instances
 * and for pre-init static access via Engine3D.setting.
 * @group engine3D
 */
const _defaultSetting: EngineSetting = {
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
        lerpHysteresis: 0.01,//The smaller the value, the slower the reaction, which can counteract flickering
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
        defaultFar: 65536,//can't be too big
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

/**
 * Orillusion 3D Engine — supports multiple simultaneous instances.
 *
 * **Single-instance (backward-compatible) usage:**
 * ```ts
 * await Engine3D.init({ canvasConfig: { ... } });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-instance usage:**
 * ```ts
 * const engine1 = new Engine3D();
 * const engine2 = new Engine3D();
 * await engine1.init({ canvasConfig: { canvas: canvas1 } });
 * await engine2.init({ canvasConfig: { canvas: canvas2 } });
 * engine1.startRenderView(view1);
 * engine2.startRenderView(view2);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // =========================================================================
    // STATIC: active-instance tracking for backward-compat static API
    // =========================================================================

    /**
     * The engine instance currently executing its render loop.
     * Set to `this` at the start of each frame so that static accessors
     * (Engine3D.setting, Engine3D.res, etc.) return the right values.
     * @internal
     */
    private static _current: Engine3D | null = null;

    /**
     * All registered Engine3D instances.
     */
    public static readonly instances: Engine3D[] = [];

    // =========================================================================
    // STATIC: backward-compat property accessors (delegate to _current)
    // =========================================================================

    /**
     * Engine settings.
     * Before any `init()` call, returns the shared default template.
     * During/after rendering returns the active instance's setting.
     * @group engine3D
     */
    public static get setting(): EngineSetting {
        return Engine3D._current ? Engine3D._current.setting : _defaultSetting;
    }
    public static set setting(value: EngineSetting) {
        if (Engine3D._current) {
            Engine3D._current.setting = value;
        } else {
            Object.assign(_defaultSetting, value);
        }
    }

    /** Resource manager of the active engine. */
    public static get res(): Res { return Engine3D._current?.res; }

    /** Input system of the active engine. */
    public static get inputSystem(): InputSystem { return Engine3D._current?.inputSystem; }

    /** Active views of the active engine. */
    public static get views(): View3D[] { return Engine3D._current?.views; }

    /** Render jobs map of the active engine. */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._current?.renderJobs; }

    /** Frame rate of the active engine. */
    public static get frameRate(): number { return Engine3D._current?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (Engine3D._current) Engine3D._current.frameRate = value; }

    /** Presentation size [width, height] of the active engine. */
    public static get size(): number[] { return Engine3D._current?.context?.presentationSize; }

    /** Aspect ratio of the active engine. */
    public static get aspect(): number { return Engine3D._current?.context?.aspect; }

    /** Window width of the active engine. */
    public static get width(): number { return Engine3D._current?.context?.windowWidth; }

    /** Window height of the active engine. */
    public static get height(): number { return Engine3D._current?.context?.windowHeight; }

    // =========================================================================
    // STATIC: backward-compat methods (delegate to _current)
    // =========================================================================

    /**
     * Initialize the engine (creates and returns the primary Engine3D instance).
     * Subsequent calls create additional independent instances.
     * @param descriptor Engine initialization options.
     * @returns The initialized Engine3D instance.
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
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)')
        }
        const engine = new Engine3D();
        Engine3D.instances.push(engine);
        await engine.init(descriptor);
        return engine;
    }

    /**
     * Set a render view and start the render loop for the active engine.
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._current?.startRenderView(view);
    }

    /**
     * Set multiple render views and start the render loop for the active engine.
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._current?.startRenderViews(views);
    }

    /**
     * Get the render job for the given view from the active engine.
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._current?.renderJobs?.get(view);
    }

    /**
     * Pause the active engine's render loop.
     */
    public static pause(): void { Engine3D._current?.pause(); }

    /**
     * Resume the active engine's render loop.
     */
    public static resume(): void { Engine3D._current?.resume(); }

    // =========================================================================
    // INSTANCE STATE — each Engine3D instance owns these
    // =========================================================================

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine instance. */
    public inputSystem: InputSystem;

    /** Active render views for this engine instance. */
    public views: View3D[];

    /** Render jobs indexed by View3D for this engine instance. */
    public renderJobs: Map<View3D, RendererJob>;

    /** WebGPU context (canvas, device ref, size) for this engine instance. */
    public context: Context3D;

    private _setting: EngineSetting;
    private _rtResourceMap: RTResourceMap;
    private _gBufferMap: Map<string, GBufferFrame>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /** Engine settings for this instance. */
    public get setting(): EngineSetting { return this._setting; }
    public set setting(value: EngineSetting) { this._setting = value; }

    /** Frame rate for this instance (fps). */
    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) {
            this._frameRateValue = 0;
        }
    }

    /** Presentation size [width, height] for this instance. */
    public get size(): number[] { return this.context?.presentationSize; }

    /** Aspect ratio for this instance. */
    public get aspect(): number { return this.context?.aspect; }

    /** Window width for this instance. */
    public get width(): number { return this.context?.windowWidth; }

    /** Window height for this instance. */
    public get height(): number { return this.context?.windowHeight; }

    // =========================================================================
    // INSTANCE: initialization
    // =========================================================================

    /**
     * Initialize this Engine3D instance with its own canvas, WebGPU context, and subsystems.
     * @param descriptor Initialization options.
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

        // Make this the active instance so subsystem init calls resolve correctly
        Engine3D._current = this;

        // Merge setting from default template + descriptor override
        this._setting = { ..._defaultSetting, ...descriptor.engineSetting };

        // Create and configure this instance's WebGPU context (canvas)
        this.context = new Context3D();
        setWebGPUContext(this.context);
        await this.context.init(descriptor.canvasConfig);

        // Initialize per-engine render resource maps
        this._rtResourceMap = new RTResourceMap();
        RTResourceMap.setActive(this._rtResourceMap);

        this._gBufferMap = new Map<string, GBufferFrame>();
        GBufferFrame.setActiveMap(this._gBufferMap);

        // Pre-compute reflection GBuffer setting
        this._setting.reflectionSetting.width = this._setting.reflectionSetting.reflectionProbeSize * 6;
        this._setting.reflectionSetting.height = this._setting.reflectionSetting.reflectionProbeSize * this._setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this._setting.reflectionSetting.width,
            this._setting.reflectionSetting.height,
            false
        );

        // One-time global inits (guarded internally or by the shared device check)
        await WasmMatrix.init(Matrix4.allocCount, this._setting.doublePrecision);
        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        ShadowLightsCollect.init();

        // Per-engine resources
        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);

        this.renderJobs = new Map<View3D, RendererJob>();
    }

    // =========================================================================
    // INSTANCE: render view management
    // =========================================================================

    private _startRenderJob(view: View3D): RendererJob {
        // Tag the view with this engine instance
        view.engine = this;

        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this._setting.pick.mode == `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this._setting.pick.mode == `pixel` || this._setting.pick.mode == `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Set a render view and start the render loop for this engine instance.
     * @param view
     */
    public startRenderView(view: View3D): RendererJob {
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop for this engine instance.
     * @param views
     */
    public startRenderViews(views: View3D[]): void {
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the render job for the given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    // =========================================================================
    // INSTANCE: render loop
    // =========================================================================

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
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
    }

    private async _render(time: number): Promise<void> {
        if (this._frameRateValue > 0) {
            let delta = time - this._time;
            if (delta < this._frameRateValue) {
                let t = performance.now()
                await new Promise(res => {
                    setTimeout(() => {
                        time += (performance.now() - t)
                        res(true)
                    }, this._frameRateValue - delta)
                })
            }
            this._time = time;
        }
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        // Set this instance as the active engine so static accessors resolve correctly
        Engine3D._current = this;
        setWebGPUContext(this.context);
        RTResourceMap.setActive(this._rtResourceMap);
        GBufferFrame.setActiveMap(this._gBufferMap);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        /* update all transforms for this engine's views */
        let views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        /****** before-update components — only for this engine's views *****/
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const list = ComponentCollect.componentsBeforeUpdateList?.get(view);
            if (list) {
                for (const [component, fn] of list) {
                    if (component.enable) fn(view);
                }
            }
        }

        let command = this.context.device.createCommandEncoder();
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const list = ComponentCollect.componentsComputeList?.get(view);
            if (list) {
                for (const [component, fn] of list) {
                    if (component.enable) fn(view, command);
                }
            }
        }
        this.context.device.queue.submit([command.finish()]);

        /****** update components — only for this engine's views *****/
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const list = ComponentCollect.componentsUpdateList?.get(view);
            if (list) {
                for (const [component, fn] of list) {
                    if (component.enable) fn(view);
                }
            }
        }

        /****** graphic components — only for this engine's views *****/
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const list = ComponentCollect.graphicComponent?.get(view);
            if (list) {
                for (const [component, fn] of list) {
                    if (view && component.enable) fn(view);
                }
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        /****** write global matrix buffer to GPU *****/
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        /****** late-update components — only for this engine's views *****/
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const list = ComponentCollect.componentsLateUpdateList?.get(view);
            if (list) {
                for (const [component, fn] of list) {
                    if (component.enable) fn(view);
                }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
