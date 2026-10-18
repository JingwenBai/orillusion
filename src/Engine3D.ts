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
import { EngineContext } from './core/EngineContext';

// ---------------------------------------------------------------------------
// Default setting factory – called per instance so each Engine3D has its own
// independent copy of the setting object.
// ---------------------------------------------------------------------------
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
 * Orillusion 3D Engine
 *
 * Supports multiple independent instances, each rendering to its own canvas
 * while sharing the underlying WebGPU device.
 *
 * **Multi-instance usage:**
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
 * **Single-instance (backward-compatible) usage:**
 * ```ts
 * Engine3D.setting.render.hdrExposure = 2;
 * await Engine3D.init({ canvasConfig: ... });
 * Engine3D.startRenderView(view);
 * ```
 *
 * -- Engine3D.setting.*
 * -- await Engine3D.init();
 * @group engine3D
 */
export class Engine3D {

    // -----------------------------------------------------------------------
    // Static multi-instance registry
    // -----------------------------------------------------------------------

    /**
     * All Engine3D instances that have been created.
     */
    public static readonly instances: Engine3D[] = [];

    /**
     * The Engine3D instance that is currently initializing or rendering.
     * Rendering subsystems read this to resolve per-instance resources.
     */
    public static current: Engine3D | null = null;

    /** Unique numeric counter used to assign instanceId values. @internal */
    private static _instanceCount: number = 0;

    /** Whether the one-time global subsystem init (shaders, wasm, etc.) is done. @internal */
    private static _globalInitDone: boolean = false;

    /**
     * Pre-init setting store used when Engine3D.setting is accessed before any
     * instance is created (backward-compat: users set Engine3D.setting.x = y
     * before calling Engine3D.init()).
     * @internal
     */
    private static _preInitSetting: EngineSetting = createDefaultEngineSetting();

    // -----------------------------------------------------------------------
    // Instance fields
    // -----------------------------------------------------------------------

    /** A unique identifier for this instance, e.g. "engine_0". */
    public readonly instanceId: string;

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine instance. */
    public inputSystem: InputSystem;

    /** Active views being rendered by this instance. */
    public views: View3D[];

    /** Render job map for this instance. @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /** Per-instance rendering / shadow / GI / sky settings. */
    public setting: EngineSetting;

    /** WebGPU canvas context owned by this instance. @internal */
    private _context: Context3D;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.instanceId = `engine_${Engine3D._instanceCount++}`;
        // Copy any pre-init modifications to this instance's own setting object
        this.setting = { ...Engine3D._preInitSetting };
        Engine3D.instances.push(this);
    }

    // -----------------------------------------------------------------------
    // Static backward-compatible property accessors
    // These delegate to Engine3D.current so that all existing code that writes
    // Engine3D.setting.x, reads Engine3D.res, etc. continues to work unchanged.
    // -----------------------------------------------------------------------

    /** @deprecated Use instance.res instead for multi-instance setups. */
    public static get res(): Res { return Engine3D.current?.res ?? null; }
    public static set res(v: Res) { if (Engine3D.current) Engine3D.current.res = v; }

    /** @deprecated Use instance.inputSystem instead for multi-instance setups. */
    public static get inputSystem(): InputSystem { return Engine3D.current?.inputSystem ?? null; }
    public static set inputSystem(v: InputSystem) { if (Engine3D.current) Engine3D.current.inputSystem = v; }

    /** @deprecated Use instance.views instead for multi-instance setups. */
    public static get views(): View3D[] { return Engine3D.current?.views ?? []; }
    public static set views(v: View3D[]) { if (Engine3D.current) Engine3D.current.views = v; }

    /** @deprecated Use instance.renderJobs instead for multi-instance setups. */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D.current?.renderJobs ?? null; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { if (Engine3D.current) Engine3D.current.renderJobs = v; }

    /**
     * Engine setting.
     * Before any instance is created, accesses the pre-init setting store.
     * After init, delegates to the currently active instance.
     */
    public static get setting(): EngineSetting {
        return Engine3D.current?.setting ?? Engine3D._preInitSetting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D.current) {
            Engine3D.current.setting = v;
        } else {
            Engine3D._preInitSetting = v;
        }
    }

    /**
     * set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
     */
    public static get frameRate(): number {
        return Engine3D.current?._frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (Engine3D.current) Engine3D.current.frameRate = value;
    }

    /**
     * get render window size width and height
     */
    public static get size(): number[] {
        return Engine3D.current?._context?.presentationSize ?? [0, 0];
    }

    /**
     * get render window aspect
     */
    public static get aspect(): number {
        return Engine3D.current?._context?.aspect ?? 1;
    }

    /**
     * get render window size width
     */
    public static get width(): number {
        return Engine3D.current?._context?.windowWidth ?? 0;
    }

    /**
     * get render window size height
     */
    public static get height(): number {
        return Engine3D.current?._context?.windowHeight ?? 0;
    }

    // -----------------------------------------------------------------------
    // Instance property accessors
    // -----------------------------------------------------------------------

    /** Per-instance frameRate getter. */
    public get frameRate(): number { return this._frameRate; }
    /** Per-instance frameRate setter. */
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) {
            this._frameRateValue = 0;
        }
    }

    /** Render canvas size [w, h] for this instance. */
    public get size(): number[] { return this._context?.presentationSize ?? [0, 0]; }
    /** Render canvas aspect ratio for this instance. */
    public get aspect(): number { return this._context?.aspect ?? 1; }
    /** Render canvas width for this instance. */
    public get width(): number { return this._context?.windowWidth ?? 0; }
    /** Render canvas height for this instance. */
    public get height(): number { return this._context?.windowHeight ?? 0; }

    // -----------------------------------------------------------------------
    // Static backward-compatible init/render methods
    // These create (or reuse) a default instance and delegate to it.
    // -----------------------------------------------------------------------

    /**
     * Create and initialise a new Engine3D instance.
     * Backward-compatible static entry point: equivalent to
     * `const e = new Engine3D(); await e.init(descriptor);`.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const instance = new Engine3D();
        Engine3D.current = instance;
        return instance.init(descriptor);
    }

    /**
     * Set render view and start renderer (backward-compat static method).
     */
    public static startRenderView(view: View3D) {
        return Engine3D.current?.startRenderView(view);
    }

    /**
     * Set render views and start renderer (backward-compat static method).
     */
    public static startRenderViews(views: View3D[]) {
        Engine3D.current?.startRenderViews(views);
    }

    /**
     * Get view render job instance (backward-compat static method).
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.current?.getRenderJob(view);
    }

    /**
     * Pause the engine render (backward-compat static method).
     */
    public static pause() {
        Engine3D.current?.pause();
    }

    /**
     * Resume the engine render (backward-compat static method).
     */
    public static resume() {
        Engine3D.current?.resume();
    }

    // -----------------------------------------------------------------------
    // Instance init / render methods
    // -----------------------------------------------------------------------

    /**
     * Initialise this Engine3D instance.
     * @param descriptor Configuration for canvas, callbacks, and engine settings.
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

        // Activate this instance as current
        Engine3D.current = this;
        EngineContext.currentInstanceId = this.instanceId;

        // Merge any engineSetting overrides
        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // ----------------------------------------------------------------
        // One-time global subsystem initialisation (shared across instances)
        // ----------------------------------------------------------------
        if (!Engine3D._globalInitDone) {
            Engine3D._globalInitDone = true;

            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            RTResourceMap.init();
            ShadowLightsCollect.init();
        }

        // ----------------------------------------------------------------
        // Per-instance canvas / context initialisation
        // ----------------------------------------------------------------
        this._context = new Context3D();
        await this._context.init(descriptor.canvasConfig);
        setWebGPUContext(this._context);

        // Per-instance reflection GBuffer (uses EngineContext.currentInstanceId for scoping)
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this._context.canvas);
    }

    // -----------------------------------------------------------------------
    // Instance render-view management
    // -----------------------------------------------------------------------

    private _startRenderJob(view: View3D): RendererJob {
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
     * Set render view and start renderer.
     * @param view
     * @returns
     */
    public startRenderView(view: View3D): RendererJob {
        Engine3D.current = this;
        EngineContext.currentInstanceId = this.instanceId;
        setWebGPUContext(this._context);

        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set render views and start renderer.
     * @param views
     */
    public startRenderViews(views: View3D[]): void {
        Engine3D.current = this;
        EngineContext.currentInstanceId = this.instanceId;
        setWebGPUContext(this._context);

        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get view render job instance.
     * @param view
     * @returns
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

    // -----------------------------------------------------------------------
    // Internal render loop
    // -----------------------------------------------------------------------

    private async _render(time: number): Promise<void> {
        if (this._frameRateValue > 0) {
            let delta = time - this._time;
            if (delta < this._frameRateValue) {
                let t = performance.now();
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
        // Activate this instance so all rendering subsystems use the correct context
        Engine3D.current = this;
        EngineContext.currentInstanceId = this.instanceId;
        setWebGPUContext(this._context);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        /* update all transform */
        let views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this._context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        /****** auto before update with component list *****/
        for (const iterator of ComponentCollect.componentsBeforeUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                };
            }
        }

        let command = this._context.device.createCommandEncoder();
        for (const iterator of ComponentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k, command);
                };
            }
        }

        this._context.device.queue.submit([command.finish()]);

        /****** auto update with component list *****/
        for (const iterator of ComponentCollect.componentsUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                };
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
                };
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        /****** auto update global matrix share buffer write to gpu *****/
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        /****** auto late update with component list *****/
        for (const iterator of ComponentCollect.componentsLateUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                };
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
