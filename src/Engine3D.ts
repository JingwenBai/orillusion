import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setCurrentWebGPUContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
 * Orillusion 3D Engine
 *
 * The engine can now be used in two ways:
 *
 * **Single-instance (original API – unchanged):**
 * ```ts
 * await Engine3D.init();
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-instance:**
 * ```ts
 * const engine1 = new Engine3D();
 * const engine2 = new Engine3D();
 * await engine1.init({ canvasConfig: { canvas: canvas1 } });
 * await engine2.init({ canvasConfig: { canvas: canvas2 } });
 * engine1.startRenderView(view1);
 * engine2.startRenderView(view2);
 * ```
 *
 * The GPUDevice is shared across all instances on the same page.
 *
 * @group engine3D
 */
export class Engine3D {

    // ==============================================================
    // Static registry — tracks all living instances
    // ==============================================================

    /** All Engine3D instances created in this page context. */
    public static readonly instances: Engine3D[] = [];

    /**
     * The Engine3D instance whose render frame is currently executing.
     * All subsystem statics (RTResourceMap, GBufferFrame, etc.) delegate
     * to this instance's per-engine resources.
     */
    public static get current(): Engine3D {
        return Engine3D._current;
    }
    private static _current: Engine3D = null;

    // ==============================================================
    // Static initialisation flags (shared across all instances)
    // ==============================================================
    private static _sharedInit: boolean = false;

    // ==============================================================
    // Per-instance state
    // ==============================================================

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine instance. */
    public inputSystem: InputSystem;

    /** Active views for this engine instance. */
    public views: View3D[];

    /** Per-view render jobs for this engine instance. */
    public renderJobs: Map<View3D, RendererJob>;

    /** Per-instance engine settings. */
    public setting: EngineSetting;

    /** Per-instance render-texture pool. */
    public rtResourceMap: RTResourceMap;

    /** Per-instance GBuffer frame map. */
    public gBufferMap: Map<string, GBufferFrame>;

    /** Per-instance WebGPU canvas context. */
    public context3D: Context3D;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.setting = Engine3D._makeDefaultSetting();
        Engine3D.instances.push(this);
    }

    // ==============================================================
    // Instance API
    // ==============================================================

    /** Frame-rate cap for this engine instance (frames per second). */
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

    /** Canvas size [width, height] for this engine instance. */
    public get size(): number[] {
        return this.context3D?.presentationSize ?? [0, 0];
    }

    /** Canvas aspect ratio for this engine instance. */
    public get aspect(): number {
        return this.context3D?.aspect ?? 1;
    }

    /** Canvas width for this engine instance. */
    public get width(): number {
        return this.context3D?.windowWidth ?? 0;
    }

    /** Canvas height for this engine instance. */
    public get height(): number {
        return this.context3D?.windowHeight ?? 0;
    }

    /**
     * Initialise this engine instance.
     * On the very first call the WebGPU adapter + device are requested and shared
     * with all subsequent instances.  Every call creates its own canvas context.
     */
    public async init(
        descriptor: {
            canvasConfig?: CanvasConfig;
            beforeRender?: Function;
            renderLoop?: Function;
            lateRender?: Function;
            engineSetting?: EngineSetting;
        } = {},
    ): Promise<void> {
        // Set current so subsystems initialised below can use this engine's resources.
        Engine3D._current = this;

        if (Engine3D.instances.indexOf(this) === -1) {
            Engine3D.instances.push(this);
        }

        if (!Engine3D._sharedInit) {
            console.log('Engine Version', version);
            if (!window.isSecureContext) {
                console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
            }
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // Per-engine resource pools — must be created before any GBuffer/RTResource calls.
        this.rtResourceMap = new RTResourceMap();
        this.gBufferMap = new Map<string, GBufferFrame>();

        // Each engine gets its own canvas / GPU-canvas-context.
        // The shared GPUDevice is created inside Context3D.init() on the first call;
        // subsequent engines reuse it automatically.
        this.context3D = new Context3D();
        await this.context3D.init(descriptor.canvasConfig);

        // Redirect the module-level webGPUContext live-binding to this engine's canvas.
        setCurrentWebGPUContext(this.context3D);

        // One-time shared initialisation (WasmMatrix, shaders, GPU bind groups, …).
        // These must NOT be re-run for additional engine instances because they reset
        // global state (shader registry, camera bind group map, etc.).
        if (!Engine3D._sharedInit) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            ShadowLightsCollect.init();
            Engine3D._sharedInit = true;
        }

        //****pre compute setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false,
        );
        //****pre compute setting****/

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context3D.canvas);
    }

    private _startRenderJob(view: View3D): RendererJob {
        // Bind the view to this engine instance.
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

    /** Start rendering a single view. */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /** Start rendering multiple views. */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /** Get the RendererJob for a specific view. */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

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

    private async _render(time: number): Promise<void> {
        // Activate this engine instance so all subsystem statics resolve to its resources.
        Engine3D._current = this;
        setCurrentWebGPUContext(this.context3D);

        if (this._frameRateValue > 0) {
            let delta = time - this._time;
            if (delta < this._frameRateValue) {
                let t = performance.now();
                await new Promise((res) => {
                    setTimeout(() => {
                        time += performance.now() - t;
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

        let views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.context3D.presentationSize;
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

        let command = Context3D.sharedDevice.createCommandEncoder();
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
        Context3D.sharedDevice.queue.submit([command.finish()]);

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

    // ==============================================================
    // Static backward-compatible API
    // ==============================================================
    // All static members below delegate to the most-recently-active
    // Engine3D instance (Engine3D._current).  This preserves full
    // compatibility with existing single-engine code that calls
    // Engine3D.init(), Engine3D.startRenderView(), etc.
    // ==============================================================

    private static _defaultInstance: Engine3D | null = null;

    private static _getOrCreateDefault(): Engine3D {
        if (!Engine3D._defaultInstance) {
            Engine3D._defaultInstance = new Engine3D();
        }
        return Engine3D._defaultInstance;
    }

    // ---- Static setting ----

    public static get setting(): EngineSetting {
        return Engine3D._current?.setting ?? Engine3D._getOrCreateDefault().setting;
    }
    public static set setting(v: EngineSetting) {
        const inst = Engine3D._current ?? Engine3D._getOrCreateDefault();
        inst.setting = v;
    }

    // ---- Static resource helpers ----

    public static get res(): Res {
        return Engine3D._current?.res;
    }
    public static set res(v: Res) {
        const inst = Engine3D._current ?? Engine3D._getOrCreateDefault();
        inst.res = v;
    }

    public static get inputSystem(): InputSystem {
        return Engine3D._current?.inputSystem;
    }
    public static set inputSystem(v: InputSystem) {
        const inst = Engine3D._current ?? Engine3D._getOrCreateDefault();
        inst.inputSystem = v;
    }

    public static get views(): View3D[] {
        return Engine3D._current?.views;
    }
    public static set views(v: View3D[]) {
        const inst = Engine3D._current ?? Engine3D._getOrCreateDefault();
        inst.views = v;
    }

    /** @internal */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._current?.renderJobs;
    }
    public static set renderJobs(v: Map<View3D, RendererJob>) {
        const inst = Engine3D._current ?? Engine3D._getOrCreateDefault();
        inst.renderJobs = v;
    }

    // ---- Static size helpers ----

    public static get size(): number[] {
        return Engine3D._current?.size ?? webGPUContext.presentationSize;
    }

    public static get aspect(): number {
        return Engine3D._current?.aspect ?? webGPUContext.aspect;
    }

    public static get width(): number {
        return Engine3D._current?.width ?? webGPUContext.windowWidth;
    }

    public static get height(): number {
        return Engine3D._current?.height ?? webGPUContext.windowHeight;
    }

    // ---- Static frameRate ----

    public static get frameRate(): number {
        return (Engine3D._current ?? Engine3D._getOrCreateDefault())._frameRate;
    }
    public static set frameRate(value: number) {
        (Engine3D._current ?? Engine3D._getOrCreateDefault()).frameRate = value;
    }

    // ---- Static lifecycle ----

    /**
     * Initialise the engine (static/single-instance API).
     * Equivalent to `new Engine3D().init(descriptor)` but also stores
     * the instance as the default, preserving backward compatibility.
     */
    public static async init(
        descriptor: {
            canvasConfig?: CanvasConfig;
            beforeRender?: Function;
            renderLoop?: Function;
            lateRender?: Function;
            engineSetting?: EngineSetting;
        } = {},
    ): Promise<void> {
        const inst = Engine3D._getOrCreateDefault();
        Engine3D._current = inst;
        await inst.init(descriptor);
    }

    /** Static startRenderView: creates/uses the default instance. */
    public static startRenderView(view: View3D): RendererJob {
        const inst = Engine3D._current ?? Engine3D._getOrCreateDefault();
        return inst.startRenderView(view);
    }

    /** Static startRenderViews: creates/uses the default instance. */
    public static startRenderViews(views: View3D[]): void {
        const inst = Engine3D._current ?? Engine3D._getOrCreateDefault();
        inst.startRenderViews(views);
    }

    /** Static getRenderJob: delegates to current instance. */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._current?.getRenderJob(view);
    }

    /** Static pause: pauses the current/default instance. */
    public static pause(): void {
        (Engine3D._current ?? Engine3D._getOrCreateDefault()).pause();
    }

    /** Static resume: resumes the current/default instance. */
    public static resume(): void {
        (Engine3D._current ?? Engine3D._getOrCreateDefault()).resume();
    }

    // ==============================================================
    // Static class initialiser — runs once when the module is loaded
    // ==============================================================

    static {
        // Register callback providers so that RTResourceMap and GBufferFrame's
        // static-facade methods always delegate to the currently-rendering engine
        // instance.  Closures intentionally capture Engine3D._current at call
        // time so a single registration works for all engine instances.
        RTResourceMap.setContextProvider(() => Engine3D._current?.rtResourceMap ?? null);
        GBufferFrame.setGBufferMapProvider(() => Engine3D._current?.gBufferMap ?? null);
    }

    // ==============================================================
    // Helpers
    // ==============================================================

    private static _makeDefaultSetting(): EngineSetting {
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
}
