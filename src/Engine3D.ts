import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveContext } from './gfx/graphics/webGpu/Context3D';
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
import { setActiveEngine } from './gfx/EngineContext';

/**
 * Orillusion 3D Engine — instantiable.
 *
 * Create one Engine3D per canvas / render target.  Multiple instances can run
 * concurrently on the same page; each owns its own WebGPU canvas context,
 * component update lists, shadow/light data, render textures and GBuffer frames
 * while sharing the same GPU device and shader/pipeline caches.
 *
 * ```ts
 * // Single engine (backward-compatible)
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { ... } });
 * engine.startRenderView(view);
 *
 * // Multiple engines
 * const engA = new Engine3D();
 * const engB = new Engine3D();
 * await engA.init({ canvasConfig: { canvas: canvasA } });
 * await engB.init({ canvasConfig: { canvas: canvasB } });
 * engA.startRenderView(viewA);
 * engB.startRenderView(viewB);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // ------------------------------------------------------------------ //
    // Per-instance subsystems                                              //
    // ------------------------------------------------------------------ //

    /** WebGPU canvas context for this engine instance. */
    public context: Context3D;

    /** Per-engine component update / lifecycle scheduler. */
    public componentCollect: ComponentCollect;

    /** Per-engine shadow light tracker. */
    public shadowLightsCollect: ShadowLightsCollect;

    /** Per-engine GPU camera / light / reflection bind groups. */
    public globalBindGroup: GlobalBindGroup;

    /** Per-engine render-texture registry. */
    public rtResourceMap: RTResourceMap;

    /** Per-engine scene entity / render-node registry. */
    public entityCollect: EntityCollect;

    /** Per-engine GBuffer frame registry (keyed by string name). */
    public gBufferFrames: Map<string, GBufferFrame> = new Map();

    /**
     * Resource / asset manager for this engine.
     */
    public res: Res;

    /**
     * Keyboard / mouse / touch input system for this engine.
     */
    public inputSystem: InputSystem;

    /**
     * Active render views.
     */
    public views: View3D[] = [];

    /**
     * Per-view render-job map.
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob> = new Map();

    /**
     * Engine settings for this instance.
     */
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

    // ------------------------------------------------------------------ //
    // Private frame-rate state                                             //
    // ------------------------------------------------------------------ //

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ------------------------------------------------------------------ //
    // Frame-rate control                                                   //
    // ------------------------------------------------------------------ //

    /**
     * Set target frames per second (e.g. 24 / 30 / 60 / 120 / 240 / 360).
     * Values ≥ 360 disable the frame limiter (maximum possible frame rate).
     */
    public get frameRate(): number {
        return this._frameRate;
    }

    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) {
            this._frameRateValue = 0;
        }
    }

    // ------------------------------------------------------------------ //
    // Canvas size helpers (delegate to this engine's context)              //
    // ------------------------------------------------------------------ //

    /** Presentation size [width, height] in device pixels. */
    public get size(): number[] {
        return this.context.presentationSize;
    }

    /** Aspect ratio (width / height). */
    public get aspect(): number {
        return this.context.aspect;
    }

    /** Canvas width in device pixels. */
    public get width(): number {
        return this.context.windowWidth;
    }

    /** Canvas height in device pixels. */
    public get height(): number {
        return this.context.windowHeight;
    }

    // ------------------------------------------------------------------ //
    // Initialisation                                                       //
    // ------------------------------------------------------------------ //

    /**
     * Initialise the engine: WebGPU adapter/device, WASM matrix library,
     * shaders, global bind groups, render resources and input system.
     *
     * @param descriptor.canvasConfig  Canvas and WebGPU configuration.
     * @param descriptor.beforeRender  Called once before component updates.
     * @param descriptor.renderLoop    Called after component updates.
     * @param descriptor.lateRender    Called after render jobs complete.
     * @param descriptor.engineSetting Override default engine settings.
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

        // Merge user settings
        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // Create per-engine subsystems
        this.context = new Context3D();
        this.componentCollect = new ComponentCollect();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.globalBindGroup = new GlobalBindGroup();
        this.rtResourceMap = new RTResourceMap();
        this.entityCollect = new EntityCollect();

        // Activate this engine so static-routing helpers find the right instance
        setActiveEngine(this);
        setActiveContext(this.context);

        // WASM matrix library (shared across all engine instances on first call)
        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        // Initialise shared GPU matrix bind group (idempotent)
        GlobalBindGroup.initMatrixBindGroup();

        // Initialise the WebGPU context bound to this engine's canvas
        await this.context.init(descriptor.canvasConfig);
        // Keep webGPUContext pointing to this context after init
        setActiveContext(this.context);

        // Pre-compute reflection settings
        this.setting.reflectionSetting.width =
            this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Pre-allocate the reflection GBuffer frame for this engine
        this.getGBufferFrame(
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

        // Register as the default static-API engine if this is the first one
        if (!Engine3D._default) {
            Engine3D._default = this;
        }
    }

    // ------------------------------------------------------------------ //
    // GBuffer frame helpers (per-engine)                                   //
    // ------------------------------------------------------------------ //

    /**
     * Get or create a GBuffer frame for this engine instance.
     * Equivalent to the old static GBufferFrame.getGBufferFrame() but scoped
     * to this engine so multiple engines don't share render textures.
     */
    public getGBufferFrame(
        key: string,
        fixedWidth: number = 0,
        fixedHeight: number = 0,
        outColor: boolean = true,
        depthTexture?: any
    ): GBufferFrame {
        if (!this.gBufferFrames.has(key)) {
            const gBuffer = new GBufferFrame();
            const size = this.context.presentationSize;
            gBuffer.createGBuffer(
                key,
                fixedWidth === 0 ? size[0] : fixedWidth,
                fixedHeight === 0 ? size[1] : fixedHeight,
                fixedWidth !== 0 && fixedHeight !== 0,
                outColor,
                depthTexture
            );
            this.gBufferFrames.set(key, gBuffer);
        }
        return this.gBufferFrames.get(key);
    }

    // ------------------------------------------------------------------ //
    // Render view management                                               //
    // ------------------------------------------------------------------ //

    private startRenderJob(view: View3D): RendererJob {
        view.engine = this;
        setActiveEngine(this);
        setActiveContext(this.context);
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
     * Attach a single view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.views = [view];
        this.startRenderJob(view);
        this.resume();
        return this.renderJobs.get(view);
    }

    /**
     * Attach multiple views and start the render loop.
     */
    public startRenderViews(views: View3D[]): void {
        this.views = views;
        for (const view of views) {
            this.startRenderJob(view);
        }
        this.resume();
    }

    /**
     * Retrieve the RendererJob associated with a view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    // ------------------------------------------------------------------ //
    // Render loop control                                                  //
    // ------------------------------------------------------------------ //

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
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
        }
    }

    private async render(time: number): Promise<void> {
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
        await this.updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async updateFrame(time: number): Promise<void> {
        // Mark this engine as active so subsystems using static routing (e.g.
        // EntityCollect.instance, GlobalBindGroup.getCameraGroup) find the right
        // per-engine data.
        setActiveEngine(this);
        setActiveContext(this.context);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        // Before-update component callbacks
        for (const [k, v] of this.componentCollect.componentsBeforeUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        // GPU compute callbacks
        const command = this.context.device.createCommandEncoder();
        for (const [k, v] of this.componentCollect.componentsComputeList) {
            for (const [f, c] of v) {
                if (f.enable) c(k, command);
            }
        }
        this.context.device.queue.submit([command.finish()]);

        // Update component callbacks
        for (const [k, v] of this.componentCollect.componentsUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        // Graphic component callbacks
        for (const [k, v] of this.componentCollect.graphicComponent) {
            for (const [f, c] of v) {
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop) await this._renderLoop();

        // Upload all world-transform matrices to the GPU (shared pool)
        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        GlobalBindGroup.modelMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        // Render each view
        this.renderJobs.forEach((v) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        // Late-update component callbacks
        for (const [k, v] of this.componentCollect.componentsLateUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        if (this._lateRender) await this._lateRender();
    }

    // ------------------------------------------------------------------ //
    // Static backward-compatibility layer                                  //
    //                                                                      //
    // Single-engine applications that call Engine3D.init() / .setting /   //
    // .res etc. continue to work unchanged.  The first Engine3D instance   //
    // created by init() is stored as Engine3D._default.                    //
    // ------------------------------------------------------------------ //

    private static _default: Engine3D = null;

    /**
     * The first Engine3D instance created in this session.
     * Used by the static convenience API for single-engine applications.
     */
    public static get default(): Engine3D {
        return Engine3D._default;
    }

    // ---- static property getters/setters ----

    public static get res(): Res { return this._default?.res; }
    public static set res(v: Res) { if (this._default) this._default.res = v; }

    public static get inputSystem(): InputSystem { return this._default?.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (this._default) this._default.inputSystem = v; }

    public static get views(): View3D[] { return this._default?.views; }
    public static set views(v: View3D[]) { if (this._default) this._default.views = v; }

    public static get renderJobs(): Map<View3D, RendererJob> { return this._default?.renderJobs; }

    public static get setting(): EngineSetting { return this._default?.setting ?? ({} as any); }
    public static set setting(v: EngineSetting) { if (this._default) this._default.setting = v; }

    public static get frameRate(): number { return this._default?._frameRate ?? 360; }
    public static set frameRate(v: number) { if (this._default) this._default.frameRate = v; }

    public static get size(): number[] { return this._default?.size; }
    public static get aspect(): number { return this._default?.aspect; }
    public static get width(): number { return this._default?.width; }
    public static get height(): number { return this._default?.height; }

    // ---- static lifecycle methods ----

    /**
     * @deprecated Create an Engine3D instance and call instance.init() instead.
     *
     * Kept for single-engine backward compatibility: creates the default
     * Engine3D instance and delegates to instance.init().
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        // Allow pre-init setting overrides: Engine3D.setting.x = y → merged below
        if (Engine3D._default) {
            engine.setting = { ...Engine3D._default.setting, ...descriptor.engineSetting };
        }
        await engine.init(descriptor);
        Engine3D._default = engine;
    }

    /** @deprecated Use engine.startRenderView(view) on an instance. */
    public static startRenderView(view: View3D): RendererJob {
        return this._default?.startRenderView(view);
    }

    /** @deprecated Use engine.startRenderViews(views) on an instance. */
    public static startRenderViews(views: View3D[]): void {
        this._default?.startRenderViews(views);
    }

    /** @deprecated Use engine.getRenderJob(view) on an instance. */
    public static getRenderJob(view: View3D): RendererJob {
        return this._default?.getRenderJob(view);
    }

    /** @deprecated Use engine.pause() on an instance. */
    public static pause(): void { this._default?.pause(); }

    /** @deprecated Use engine.resume() on an instance. */
    public static resume(): void { this._default?.resume(); }
}
