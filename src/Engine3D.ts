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

/**
 * Orillusion 3D Engine
 *
 * Supports multiple independent instances. Each instance owns its own canvas,
 * render targets, component collections, and timing state.
 *
 * **Single-engine (original API)** — still works unchanged:
 * ```ts
 * await Engine3D.init({ canvasConfig: { ... } });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-engine** — create explicit instances:
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

    // =========================================================================
    // Static active-engine management
    // =========================================================================

    /**
     * The currently active Engine3D instance.
     * Updated automatically when an engine renders or initialises.
     * @internal
     */
    public static _activeEngine: Engine3D | null = null;

    /**
     * Activate this engine: update all subsystem _current pointers and the
     * global webGPUContext binding so that static facades resolve correctly.
     * Called automatically during init() and at the start of every render frame.
     */
    public activate(): void {
        Engine3D._activeEngine = this;
        setWebGPUContext(this.context);
        ComponentCollect._current = this.componentCollect;
        GlobalBindGroup._current = this.globalBindGroup;
        RTResourceMap._current = this.rtResourceMap;
        ShadowLightsCollect._current = this.shadowLightsCollect;
        EntityCollect._current = this.entityCollect;
        GBufferFrame._currentMap = this.gBufferMap;
        Time._current = this.time;
    }

    // =========================================================================
    // Per-instance subsystems
    // =========================================================================

    /** Per-engine WebGPU canvas context */
    public context: Context3D;

    /** Per-engine component lifecycle manager */
    public componentCollect: ComponentCollect;

    /** Per-engine global GPU bind-group manager */
    public globalBindGroup: GlobalBindGroup;

    /** Per-engine render-texture resource map */
    public rtResourceMap: RTResourceMap;

    /** Per-engine shadow-light collection */
    public shadowLightsCollect: ShadowLightsCollect;

    /** Per-engine entity/render-node collection */
    public entityCollect: EntityCollect;

    /** Per-engine GBuffer frame map */
    public gBufferMap: Map<string, GBufferFrame>;

    /** Per-engine frame timing */
    public time: Time;

    // =========================================================================
    // Per-instance public API (mirrors the original static API)
    // =========================================================================

    /** Resource manager */
    public res: Res;

    /** Input system */
    public inputSystem: InputSystem;

    /** Active views */
    public views: View3D[];

    /** Render jobs keyed by View3D */
    public renderJobs: Map<View3D, RendererJob>;

    /** Engine settings */
    public setting: EngineSetting = {
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

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _internalTime: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // =========================================================================
    // Instance getters/setters
    // =========================================================================

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    public get size(): number[] { return this.context.presentationSize; }
    public get aspect(): number { return this.context.aspect; }
    public get width(): number { return this.context.windowWidth; }
    public get height(): number { return this.context.windowHeight; }

    // =========================================================================
    // Instance lifecycle
    // =========================================================================

    /**
     * Initialise this engine instance.
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

        // --- Create per-engine subsystems ---
        this.context = new Context3D();
        this.componentCollect = new ComponentCollect();
        this.globalBindGroup = new GlobalBindGroup();
        this.rtResourceMap = new RTResourceMap();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.entityCollect = new EntityCollect();
        this.gBufferMap = new Map<string, GBufferFrame>();
        this.time = new Time();

        // Make this engine active so all static facades resolve to these instances
        this.activate();

        // --- Shared WASM matrix (initialised once across all engines) ---
        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        // --- Per-instance WebGPU canvas init (shares the GPU device) ---
        await this.context.init(descriptor.canvasConfig);
        setWebGPUContext(this.context); // re-set after canvas init

        // --- Reflection GBuffer (pre-compute, uses canvas size) ---
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        ShaderLib.init();
        ShaderUtil.init();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.res = new Res();
        this.res.initDefault();

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);
    }

    private startRenderJob(view: View3D): RendererJob {
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
     * Set render view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        const renderJob = this.startRenderJob(view);
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
            this.startRenderJob(view);
        }
        this.resume();
    }

    /**
     * Get the render job for a given view.
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

    /** Resume (or start) the render loop. */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    private async _render(time: number): Promise<void> {
        if (this._frameRateValue > 0) {
            const delta = time - this._internalTime;
            if (delta < this._frameRateValue) {
                const t = performance.now();
                await new Promise<void>(res => {
                    setTimeout(() => {
                        time += (performance.now() - t);
                        res();
                    }, this._frameRateValue - delta);
                });
            }
            this._internalTime = time;
        }
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        // Make this engine the active one before processing the frame
        this.activate();

        this.time.delta = time - this.time.time;
        this.time.time = time;
        this.time.frame += 1;
        Interpolator.tick(this.time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        /****** beforeUpdate *****/
        for (const [view, componentMap] of this.componentCollect.componentsBeforeUpdateList) {
            for (const [component, call] of componentMap) {
                if (component.enable) call(view);
            }
        }

        const command = this.context.device.createCommandEncoder();
        for (const [view, componentMap] of this.componentCollect.componentsComputeList) {
            for (const [component, call] of componentMap) {
                if (component.enable) call(view, command);
            }
        }
        this.context.device.queue.submit([command.finish()]);

        /****** update *****/
        for (const [view, componentMap] of this.componentCollect.componentsUpdateList) {
            for (const [component, call] of componentMap) {
                if (component.enable) call(view);
            }
        }

        /****** graphic update *****/
        for (const [view, componentMap] of this.componentCollect.graphicComponent) {
            for (const [component, call] of componentMap) {
                if (view && component.enable) call(view);
            }
        }

        if (this._renderLoop)
            await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);

        const globalMatrixBindGroup = this.globalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((renderJob) => {
            if (!renderJob.renderState) renderJob.start();
            renderJob.renderFrame();
        });

        /****** lateUpdate *****/
        for (const [view, componentMap] of this.componentCollect.componentsLateUpdateList) {
            for (const [component, call] of componentMap) {
                if (component.enable) call(view);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // =========================================================================
    // Static facade API  ── backward compatible, delegates to _activeEngine
    // =========================================================================

    /** Backward-compatible static init. Creates and activates a new Engine3D instance. */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<Engine3D> {
        const engine = new Engine3D();
        // Merge any pre-set static setting into the new instance
        if (Engine3D._staticSetting) {
            engine.setting = { ...engine.setting, ...Engine3D._staticSetting };
            Engine3D._staticSetting = null;
        }
        await engine.init(descriptor);
        return engine;
    }

    /** @internal used by the static setting setter before init() is called */
    private static _staticSetting: Partial<EngineSetting> | null = null;

    public static get res(): Res { return Engine3D._activeEngine?.res; }
    public static get inputSystem(): InputSystem { return Engine3D._activeEngine?.inputSystem; }
    public static get views(): View3D[] { return Engine3D._activeEngine?.views; }
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._activeEngine?.renderJobs; }

    public static get frameRate(): number { return Engine3D._activeEngine?.frameRate ?? 360; }
    public static set frameRate(value: number) { if (Engine3D._activeEngine) Engine3D._activeEngine.frameRate = value; }

    public static get size(): number[] { return Engine3D._activeEngine?.size; }
    public static get aspect(): number { return Engine3D._activeEngine?.aspect; }
    public static get width(): number { return Engine3D._activeEngine?.width; }
    public static get height(): number { return Engine3D._activeEngine?.height; }

    public static get setting(): EngineSetting { return Engine3D._activeEngine?.setting; }
    public static set setting(value: EngineSetting) {
        if (Engine3D._activeEngine) {
            Engine3D._activeEngine.setting = value;
        } else {
            Engine3D._staticSetting = value;
        }
    }

    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._activeEngine?.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        Engine3D._activeEngine?.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._activeEngine?.getRenderJob(view);
    }

    public static pause(): void { Engine3D._activeEngine?.pause(); }
    public static resume(): void { Engine3D._activeEngine?.resume(); }
}
