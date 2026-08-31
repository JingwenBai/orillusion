import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D } from './gfx/graphics/webGpu/Context3D';
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
import { OutlinePostData } from './io/OutlinePostData';
import { OutlinePostManager } from './io/OutlineManager';
import { setActiveEngine, setActiveContext } from './core/EngineRegistry';

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
 * Can be used as a single instance (via the static convenience API that mirrors
 * the legacy API) or as multiple independent instances:
 *
 * ```ts
 * // Single instance – backward-compatible
 * await Engine3D.init({ canvasConfig: { canvas } });
 * Engine3D.startRenderView(view);
 *
 * // Multiple instances
 * const engineA = new Engine3D();
 * await engineA.init({ canvasConfig: { canvas: canvasA } });
 * engineA.startRenderView(viewA);
 *
 * const engineB = new Engine3D();
 * await engineB.init({ canvasConfig: { canvas: canvasB } });
 * engineB.startRenderView(viewB);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // ─── Instance state ────────────────────────────────────────────────────────

    /**
     * WebGPU context owned by this engine instance.
     */
    public context: Context3D;

    /**
     * Resource manager for this engine instance.
     */
    public res: Res;

    /**
     * Input system for this engine instance.
     */
    public inputSystem: InputSystem;

    /**
     * Active views for this engine instance.
     */
    public views: View3D[];

    /**
     * Render jobs keyed by view, for this engine instance.
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * Engine settings for this instance.
     */
    public setting: EngineSetting;

    // Per-engine frame-resource maps (avoid key conflicts between instances)
    /** @internal */ public _gBufferMap: Map<string, GBufferFrame> = new Map();
    /** @internal */ public _rtTextureMap: Map<string, any> = new Map();
    /** @internal */ public _rtViewQuad: Map<string, any> = new Map();
    /** @internal */ public _outlinePostData: OutlinePostData | null = null;
    /** @internal */ public _outlinePostManager: OutlinePostManager | null = null;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.setting = createDefaultEngineSetting();
    }

    // ─── Instance getters / setters ────────────────────────────────────────────

    /**
     * Set engine render frameRate 24/30/60/114/120/144/240/360 fps or other.
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

    /** Render window size [width, height]. */
    public get size(): number[] {
        return this.context.presentationSize;
    }

    /** Render window aspect ratio. */
    public get aspect(): number {
        return this.context.aspect;
    }

    /** Render window width. */
    public get width(): number {
        return this.context.windowWidth;
    }

    /** Render window height. */
    public get height(): number {
        return this.context.windowHeight;
    }

    // ─── Instance methods ──────────────────────────────────────────────────────

    /**
     * Initialise this engine instance.
     * Creates its own WebGPU context (canvas + device) and all per-engine
     * subsystems.  After init() returns, this instance becomes the
     * "active engine" used by `webGPUContext`, `GBufferFrame`, etc.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // Register this engine as active so that webGPUContext proxy and
        // per-engine maps resolve correctly from here on.
        setActiveEngine(this);

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        this.context = new Context3D();
        setActiveContext(this.context);
        setActiveEngine(this); // refresh registry after context is created
        await this.context.init(descriptor.canvasConfig);

        // Pre-compute reflection GBuffer dimensions
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

        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        RTResourceMap.init();
        ShadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);

        // Create per-engine outline resources
        this._outlinePostData = new OutlinePostData(
            this.setting.render.postProcessing.outline.groupCount
        );
        this._outlinePostManager = new OutlinePostManager();

        // Update registry with outline resources
        setActiveEngine(this);
    }

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
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start renderer.
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
     * Get the render job for a given view.
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
        // Activate this engine's resources before every frame so subsystems
        // resolve to the correct per-engine maps.
        setActiveEngine(this);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

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

        let command = this.context.device.createCommandEncoder();
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

        this.context.device.queue.submit([command.finish()]);

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
                };
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // ─── Static backward-compatible API ────────────────────────────────────────
    // All static members delegate to the currently active Engine3D instance.
    // The static init() creates a new instance and activates it, preserving the
    // legacy single-instance usage pattern.

    private static _activeEngine: Engine3D | null = null;

    /**
     * The currently active Engine3D instance.
     * Set automatically by init() and by startRenderView() / resume().
     */
    public static get current(): Engine3D | null {
        return Engine3D._activeEngine;
    }

    // Static property proxies ─────────────────────────────────────────────────

    /** @see Engine3D#setting */
    public static get setting(): EngineSetting {
        return Engine3D._activeEngine?.setting ?? createDefaultEngineSetting();
    }
    public static set setting(value: EngineSetting) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.setting = value;
    }

    /** @see Engine3D#res */
    public static get res(): Res {
        return Engine3D._activeEngine?.res;
    }
    public static set res(value: Res) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.res = value;
    }

    /** @see Engine3D#inputSystem */
    public static get inputSystem(): InputSystem {
        return Engine3D._activeEngine?.inputSystem;
    }
    public static set inputSystem(value: InputSystem) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.inputSystem = value;
    }

    /** @see Engine3D#views */
    public static get views(): View3D[] {
        return Engine3D._activeEngine?.views;
    }
    public static set views(value: View3D[]) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.views = value;
    }

    /** @see Engine3D#renderJobs */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._activeEngine?.renderJobs;
    }
    public static set renderJobs(value: Map<View3D, RendererJob>) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.renderJobs = value;
    }

    /** Render window size [width, height]. */
    public static get size(): number[] {
        return Engine3D._activeEngine?.size;
    }

    /** Render window aspect ratio. */
    public static get aspect(): number {
        return Engine3D._activeEngine?.aspect;
    }

    /** Render window width. */
    public static get width(): number {
        return Engine3D._activeEngine?.width;
    }

    /** Render window height. */
    public static get height(): number {
        return Engine3D._activeEngine?.height;
    }

    /** @see Engine3D#frameRate */
    public static get frameRate(): number {
        return Engine3D._activeEngine?._frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.frameRate = value;
    }

    // Static method proxies ───────────────────────────────────────────────────

    /**
     * Create and initialise a new Engine3D instance (legacy static entry point).
     * Returns the new instance; also accessible via `Engine3D.current`.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<Engine3D> {
        const engine = new Engine3D();
        Engine3D._activeEngine = engine;
        await engine.init(descriptor);
        return engine;
    }

    /**
     * Set render view and start renderer (delegates to active instance).
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._activeEngine.startRenderView(view);
    }

    /**
     * Set multiple render views and start renderer (delegates to active instance).
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._activeEngine.startRenderViews(views);
    }

    /**
     * Get view render job instance (delegates to active instance).
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._activeEngine.getRenderJob(view);
    }

    /**
     * Pause the engine render (delegates to active instance).
     */
    public static pause(): void {
        Engine3D._activeEngine?.pause();
    }

    /**
     * Resume the engine render (delegates to active instance).
     */
    public static resume(): void {
        Engine3D._activeEngine?.resume();
    }
}
