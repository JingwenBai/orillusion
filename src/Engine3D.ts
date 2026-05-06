import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D } from './gfx/graphics/webGpu/Context3D';
import { setActiveContext } from './gfx/graphics/webGpu/contextRegistry';
import { setCurrentEngine } from './engineRegistry';
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
 * Returns a fresh EngineSetting object with default values.
 * Each Engine3D instance owns its own settings to prevent cross-instance mutation.
 */
function createDefaultSetting(): EngineSetting {
    return {
        doublePrecision: false,
        occlusionQuery: { enable: true, debug: false },
        pick: { enable: true, mode: `bound`, detail: `mesh` },
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
                godRay: { blendColor: true, rayMarchCount: 16, scatteringExponent: 5, intensity: 0.5 },
                ssao: { enable: false, radius: 0.15, bias: -0.1, aoPower: 2.0, debug: true },
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
                fxaa: { enable: false },
                depthOfView: { enable: false, iterationCount: 3, pixelOffset: 1.0, near: 150, far: 300 },
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
        light: { maxLight: 4096 },
        material: { materialChannelDebug: false, materialDebug: false },
        loader: { numConcurrent: 20 },
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
 * Orillusion 3D Engine — supports multiple independent instances.
 *
 * **New (multi-instance) API:**
 * ```ts
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas } });
 * const renderJob = engine.startRenderView(view);
 * ```
 *
 * **Legacy (single-instance) static API — still fully supported:**
 * ```ts
 * await Engine3D.init();
 * Engine3D.startRenderView(view);
 * ```
 * Static accessors delegate to `Engine3D.current` (the most recently
 * activated engine).
 *
 * @group engine3D
 */
export class Engine3D {

    // ─────────────────────────────────────────────────────────────────────────
    // Static: active-engine tracking
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * The engine instance that is currently executing a frame (or the last one
     * to call init()).  All static API accessors delegate here.
     */
    public static current: Engine3D | null = null;

    /** All Engine3D instances that have been successfully initialised. */
    public static readonly instances: Engine3D[] = [];

    // ─────────────────────────────────────────────────────────────────────────
    // Instance: per-engine state
    // ─────────────────────────────────────────────────────────────────────────

    /** WebGPU device/canvas context owned by this engine. */
    public context: Context3D;

    /** Resource manager. */
    public res: Res;

    /** Keyboard/pointer input handler. */
    public inputSystem: InputSystem;

    /** Views currently being rendered by this engine. */
    public views: View3D[] = [];

    /** Per-view render jobs. */
    public renderJobs: Map<View3D, RendererJob> = new Map();

    /** Engine configuration. */
    public setting: EngineSetting = createDefaultSetting();

    // Per-engine subsystems (previously all-static singletons)
    /** @internal */ public componentCollect: ComponentCollect;
    /** @internal */ public globalBindGroup: GlobalBindGroup;
    /** @internal */ public rtResourceMap: RTResourceMap;
    /** @internal */ public shadowLightsCollect: ShadowLightsCollect;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ─────────────────────────────────────────────────────────────────────────
    // Instance getters
    // ─────────────────────────────────────────────────────────────────────────

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    public get size(): number[] { return this.context.presentationSize; }
    public get aspect(): number { return this.context.aspect; }
    public get width(): number { return this.context.windowWidth; }
    public get height(): number { return this.context.windowHeight; }

    // ─────────────────────────────────────────────────────────────────────────
    // Instance API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Initialise this engine instance.
     * Activates the engine as `Engine3D.current` for the duration of setup.
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

        // Merge custom settings
        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // Activate this engine so subsystem calls (e.g. ShaderLib.init) resolve correctly
        Engine3D.current = this;
        setCurrentEngine(this);

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        // Create and activate this engine's WebGPU context
        this.context = new Context3D();
        setActiveContext(this.context);

        await this.context.init(descriptor.canvasConfig);

        // Pre-compute reflection settings
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

        // Initialise per-engine subsystems
        this.componentCollect = new ComponentCollect();
        this.globalBindGroup = new GlobalBindGroup();
        this.globalBindGroup.init();
        this.rtResourceMap = new RTResourceMap();
        this.rtResourceMap.init();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.shadowLightsCollect.init();

        ShaderLib.init();
        ShaderUtil.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);

        Engine3D.instances.push(this);
    }

    private _startRenderJob(view: View3D): RendererJob {
        const renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this.setting.pick.mode === `pixel`) {
            const postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }
        if (this.setting.pick.mode === `pixel` || this.setting.pick.mode === `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Set a single render view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        view.engine = this;
        this.views = [view];
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop.
     */
    public startRenderViews(views: View3D[]): void {
        for (const view of views) view.engine = this;
        this.views = views;
        for (const view of views) this._startRenderJob(view);
        this.resume();
    }

    /**
     * Get the RendererJob associated with a view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /** Pause the render loop. */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume the render loop. */
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
        // Activate this engine for the duration of this frame so all static
        // subsystem shims resolve to the correct per-engine instances.
        Engine3D.current = this;
        setCurrentEngine(this);
        setActiveContext(this.context);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        const [w, h] = this.context.presentationSize;
        for (const view of views) {
            view.scene.waitUpdate();
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        // Before-update components
        for (const [view, componentMap] of this.componentCollect.componentsBeforeUpdateList) {
            for (const [component, callback] of componentMap) {
                if (component.enable) callback(view);
            }
        }

        // Compute pass
        const command = this.context.device.createCommandEncoder();
        for (const [view, componentMap] of this.componentCollect.componentsComputeList) {
            for (const [component, callback] of componentMap) {
                if (component.enable) callback(view, command);
            }
        }
        this.context.device.queue.submit([command.finish()]);

        // Update components
        for (const [view, componentMap] of this.componentCollect.componentsUpdateList) {
            for (const [component, callback] of componentMap) {
                if (component.enable) callback(view);
            }
        }

        // Graphic components
        for (const [view, componentMap] of this.componentCollect.graphicComponent) {
            for (const [component, callback] of componentMap) {
                if (view && component.enable) callback(view);
            }
        }

        if (this._renderLoop) await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        this.globalBindGroup.modelMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((job) => {
            if (!job.renderState) job.start();
            job.renderFrame();
        });

        // Late-update components
        for (const [view, componentMap] of this.componentCollect.componentsLateUpdateList) {
            for (const [component, callback] of componentMap) {
                if (component.enable) callback(view);
            }
        }

        if (this._lateRender) await this._lateRender();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Static compatibility API  (delegates to Engine3D.current)
    // ─────────────────────────────────────────────────────────────────────────
    //
    // These mirror the original all-static API so that existing user code
    // requires zero changes.  Each accessor is a thin proxy to `Engine3D.current`.

    /** @deprecated Use `new Engine3D()` then `engine.init()` for multi-instance support. */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        await engine.init(descriptor);
        // current is already set inside init()
    }

    /** Resource manager of the active engine. */
    public static get res(): Res { return Engine3D.current?.res; }

    /** Input system of the active engine. */
    public static get inputSystem(): InputSystem { return Engine3D.current?.inputSystem; }

    /** Views of the active engine. */
    public static get views(): View3D[] { return Engine3D.current?.views ?? []; }

    /** Render jobs of the active engine. */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D.current?.renderJobs;
    }

    /** Engine setting of the active engine. */
    public static get setting(): EngineSetting { return Engine3D.current?.setting; }
    public static set setting(v: EngineSetting) { if (Engine3D.current) Engine3D.current.setting = v; }

    /** Presentation size [width, height] of the active engine. */
    public static get size(): number[] { return Engine3D.current?.size ?? [0, 0]; }

    /** Canvas aspect ratio of the active engine. */
    public static get aspect(): number { return Engine3D.current?.aspect ?? 1; }

    /** Canvas width of the active engine. */
    public static get width(): number { return Engine3D.current?.width ?? 0; }

    /** Canvas height of the active engine. */
    public static get height(): number { return Engine3D.current?.height ?? 0; }

    /** Frame-rate of the active engine. */
    public static get frameRate(): number { return Engine3D.current?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (Engine3D.current) Engine3D.current.frameRate = value; }

    /** @see Engine3D#startRenderView */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D.current?.startRenderView(view);
    }

    /** @see Engine3D#startRenderViews */
    public static startRenderViews(views: View3D[]): void {
        Engine3D.current?.startRenderViews(views);
    }

    /** @see Engine3D#getRenderJob */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.current?.getRenderJob(view);
    }

    /** @see Engine3D#pause */
    public static pause(): void { Engine3D.current?.pause(); }

    /** @see Engine3D#resume */
    public static resume(): void { Engine3D.current?.resume(); }
}
