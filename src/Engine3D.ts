import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { setActiveEngine } from './EngineRegistry';
import { RenderTexture } from './textures/RenderTexture';
import { ViewQuad } from './core/ViewQuad';

/**
 * Create a fresh default EngineSetting object.
 * Each Engine3D instance receives its own copy so settings are fully isolated.
 */
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
 * Orillusion 3D Engine
 *
 * Supports multiple concurrent instances – each instance owns its own canvas,
 * render loop, resource maps and entity collection.  Shared infrastructure
 * (WebGPU device, shader library, matrix buffer) is initialised once and
 * reused across all instances.
 *
 * **Single-instance usage (unchanged API):**
 * ```ts
 * await Engine3D.init({ canvasConfig });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-instance usage:**
 * ```ts
 * const engine1 = new Engine3D();
 * const engine2 = new Engine3D();
 * await engine1.init({ canvasConfig: canvas1 });
 * await engine2.init({ canvasConfig: canvas2 });
 * engine1.startRenderView(view1);
 * engine2.startRenderView(view2);
 * ```
 * @group engine3D
 */
export class Engine3D {

    // ─── Instance state ────────────────────────────────────────────────────────

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine instance. */
    public inputSystem: InputSystem;

    /** Active views managed by this engine instance. */
    public views: View3D[];

    /** Per-instance engine settings. */
    public setting: EngineSetting;

    /** WebGPU canvas context owned by this engine instance. */
    public context: Context3D;

    /** Entity collection for this engine instance. */
    public entityCollect: EntityCollect;

    /**
     * Per-instance GBuffer map.
     * Accessed by GBufferFrame to store render targets without conflicts between instances.
     * @internal
     */
    public gBufferMap: Map<string, GBufferFrame> = new Map();

    /**
     * Per-instance render-texture map.
     * Accessed by RTResourceMap to store textures without conflicts between instances.
     * @internal
     */
    public rtTextureMap: Map<string, RenderTexture> = new Map();

    /**
     * Per-instance ViewQuad map.
     * Accessed by RTResourceMap to store view quads without conflicts between instances.
     * @internal
     */
    public rtViewQuad: Map<string, ViewQuad> = new Map();

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ─── Static multi-instance registry ────────────────────────────────────────

    /** @internal – The engine instance that is currently initialised / rendering. */
    public static _activeEngine: Engine3D | null = null;

    /**
     * The currently-active engine instance.
     * In single-instance setups this is always the one engine.
     * In multi-instance setups it reflects whichever engine is currently
     * executing its render frame.
     */
    public static get activeEngine(): Engine3D | null {
        return Engine3D._activeEngine;
    }

    // ─── Static default settings (pre-init configuration target) ───────────────

    /**
     * Global default engine settings.
     * Can be modified before calling `Engine3D.init()` to configure the engine
     * before construction.  Each new Engine3D instance receives an independent
     * copy of these defaults at init time.
     * @group engine3D
     */
    public static setting: EngineSetting = createDefaultEngineSetting();

    // ─── Static backward-compat accessors ──────────────────────────────────────
    // These delegate to the active engine so existing single-instance code
    // continues to work without modification.

    /** @deprecated Access via engine instance: `engine.res` */
    public static get res(): Res { return Engine3D._activeEngine?.res; }

    /** @deprecated Access via engine instance: `engine.inputSystem` */
    public static get inputSystem(): InputSystem { return Engine3D._activeEngine?.inputSystem; }

    /** @deprecated Access via engine instance: `engine.views` */
    public static get views(): View3D[] { return Engine3D._activeEngine?.views; }

    /** @deprecated Access via engine instance: `engine.renderJobs` */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._activeEngine?.renderJobs; }

    /** Get render window size [width, height]. */
    public static get size(): number[] { return Engine3D._activeEngine?.context.presentationSize; }

    /** Get render window aspect ratio. */
    public static get aspect(): number { return Engine3D._activeEngine?.context.aspect; }

    /** Get render window width. */
    public static get width(): number { return Engine3D._activeEngine?.context.windowWidth; }

    /** Get render window height. */
    public static get height(): number { return Engine3D._activeEngine?.context.windowHeight; }

    /** Get/set engine render frame rate (24/30/60/120/144/240/360 fps). */
    public static get frameRate(): number {
        return Engine3D._activeEngine?._frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.frameRate = value;
    }

    // ─── Instance frame-rate accessors ─────────────────────────────────────────

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    // ─── Instance size accessors ────────────────────────────────────────────────

    public get size(): number[] { return this.context?.presentationSize; }
    public get aspect(): number { return this.context?.aspect; }
    public get width(): number { return this.context?.windowWidth; }
    public get height(): number { return this.context?.windowHeight; }

    // ─── Constructor ────────────────────────────────────────────────────────────

    constructor() {
        // Each instance starts with a fresh copy of the global defaults.
        this.setting = createDefaultEngineSetting();
    }

    // ─── Instance lifecycle ─────────────────────────────────────────────────────

    /**
     * Initialise this engine instance.
     *
     * The first call also initialises the shared WebGPU device.
     * Subsequent calls (for additional instances) reuse the same device but
     * create a new canvas context.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<this> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Merge any descriptor-level overrides into this instance's settings.
        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // Register as the active engine BEFORE initialising subsystems that
        // call GBufferFrame.getGBufferFrame(), RTResourceMap, etc.
        Engine3D._activeEngine = this;
        setActiveEngine(this);

        // Initialise shared WASM matrix library (idempotent after first call).
        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        // Create and initialise per-instance canvas context.
        // The underlying GPU device is shared and initialised only once.
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);
        setActiveGPUContext(this.context);

        // Compute derived reflection settings.
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

        // Shared systems – each is idempotent (no-op if already initialised).
        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();

        // Per-engine systems.
        ShadowLightsCollect.init();
        RTResourceMap.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);

        // Create per-engine entity collection.
        this.entityCollect = new EntityCollect();

        return this;
    }

    // ─── Render management ──────────────────────────────────────────────────────

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
     * Set a single render view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop.
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
     * Get the RendererJob associated with a view.
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
        // Mark this instance as the active engine for all subsystem calls
        // that still use the static Engine3D.setting / EntityCollect.instance
        // accessors.  In single-threaded JS each render frame completes before
        // the next one starts, so this context-switch is safe.
        Engine3D._activeEngine = this;
        setActiveEngine(this);
        setActiveGPUContext(this.context);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        let views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.context.presentationSize;
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
                if (f.enable) c(k);
            }
        }

        let command = this.context.device.createCommandEncoder();
        for (const iterator of ComponentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k, command);
            }
        }
        this.context.device.queue.submit([command.finish()]);

        for (const iterator of ComponentCollect.componentsUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        for (const iterator of ComponentCollect.graphicComponent) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop)
            await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const iterator of ComponentCollect.componentsLateUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // ─── Static convenience API (backward compatibility) ───────────────────────
    // All static methods below delegate to the active engine instance so that
    // single-instance code written against the old static API continues to work.

    /**
     * Create and initialise a new engine instance.
     *
     * This is the single-instance backward-compatible entry point.
     * For multi-instance usage, create instances directly:
     * ```ts
     * const engine = new Engine3D();
     * await engine.init({ canvasConfig });
     * ```
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<Engine3D> {
        const engine = new Engine3D();
        // Merge the static pre-configured settings into the new instance.
        engine.setting = { ...Engine3D.setting, ...descriptor.engineSetting };
        // Clear engineSetting from descriptor to avoid double-merge in instance init.
        const { engineSetting: _, ...rest } = descriptor;
        await engine.init(rest);
        return engine;
    }

    /** @deprecated Use `engine.startRenderView(view)` */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._activeEngine?.startRenderView(view);
    }

    /** @deprecated Use `engine.startRenderViews(views)` */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._activeEngine?.startRenderViews(views);
    }

    /** @deprecated Use `engine.getRenderJob(view)` */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._activeEngine?.getRenderJob(view);
    }

    /** @deprecated Use `engine.pause()` */
    public static pause(): void {
        Engine3D._activeEngine?.pause();
    }

    /** @deprecated Use `engine.resume()` */
    public static resume(): void {
        Engine3D._activeEngine?.resume();
    }
}
