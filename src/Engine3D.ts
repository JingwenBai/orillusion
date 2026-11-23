import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveWebGPUContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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

/** Default engine settings */
const DEFAULT_SETTING: EngineSetting = {
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

/**
 * Orillusion 3D Engine
 *
 * Can be used as a classic single-instance engine via the static API:
 * ```ts
 * await Engine3D.init();
 * ```
 *
 * Or as multiple independent instances, each with its own canvas:
 * ```ts
 * const engine1 = new Engine3D();
 * await engine1.init({ canvasConfig: { canvas: canvas1 } });
 *
 * const engine2 = new Engine3D();
 * await engine2.init({ canvasConfig: { canvas: canvas2 } });
 * ```
 *
 * -- Engine3D.setting.*
 *
 * -- await Engine3D.init();
 * @group engine3D
 */
export class Engine3D {

    // ── per-instance state ────────────────────────────────────────────────

    /** Canvas / WebGPU canvas context for this engine instance. */
    public context: Context3D;

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine instance. */
    public inputSystem: InputSystem;

    /** Active views for this engine instance. */
    public views: View3D[];

    /** Render jobs keyed by view. */
    public renderJobs: Map<View3D, RendererJob>;

    /** Per-instance engine settings. */
    public setting: EngineSetting;

    /** Per-instance render-target texture registry. */
    public rtResourceMap: RTResourceMap;

    /** Per-instance GBuffer frame registry. */
    public gBufferMap: Map<string, GBufferFrame>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ── global registry ────────────────────────────────────────────────────

    /**
     * First Engine3D instance created — used by the backward-compat static API.
     * @internal
     */
    public static _default: Engine3D;

    /**
     * The Engine3D instance that is currently executing its render frame.
     * Engine3D.setting (static) always reads from this instance so that render-
     * pipeline code (RendererJob, ForwardRenderJob, post effects, …) sees the
     * correct per-instance settings without needing an explicit engine reference.
     * @internal
     */
    public static _active: Engine3D;

    // ── backward-compat static API ─────────────────────────────────────────

    /**
     * Engine settings (static accessor — delegates to the currently active or
     * default instance for backward compatibility).
     */
    public static get setting(): EngineSetting {
        return (Engine3D._active ?? Engine3D._default)?.setting;
    }
    public static set setting(v: EngineSetting) {
        const target = Engine3D._active ?? Engine3D._default;
        if (target) target.setting = v;
    }

    /**
     * set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
     */
    public static get frameRate(): number {
        return Engine3D._default?._frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (Engine3D._default) Engine3D._default.frameRate = value;
    }

    /** get render window size width and height */
    public static get size(): number[] {
        return Engine3D._default?.context?.presentationSize;
    }

    /** get render window aspect */
    public static get aspect(): number {
        return Engine3D._default?.context?.aspect;
    }

    /** get render window size width */
    public static get width(): number {
        return Engine3D._default?.context?.windowWidth;
    }

    /** get render window size height */
    public static get height(): number {
        return Engine3D._default?.context?.windowHeight;
    }

    /**
     * resource manager (static — delegates to default instance)
     */
    public static get res(): Res { return Engine3D._default?.res; }
    public static set res(v: Res) { if (Engine3D._default) Engine3D._default.res = v; }

    /**
     * input system (static — delegates to default instance)
     */
    public static get inputSystem(): InputSystem { return Engine3D._default?.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D._default) Engine3D._default.inputSystem = v; }

    /**
     * active views (static — delegates to default instance)
     */
    public static get views(): View3D[] { return Engine3D._default?.views; }
    public static set views(v: View3D[]) { if (Engine3D._default) Engine3D._default.views = v; }

    /**
     * @internal
     */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._default?.renderJobs;
    }

    // ── instance render-rate control ───────────────────────────────────────

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

    // ── static initialisation (backward compat) ────────────────────────────

    /**
     * Initialise the engine using the global default instance (backward-compat API).
     * To run multiple independent engines, create instances with `new Engine3D()` and
     * call `instance.init(...)` on each.
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {
        if (!Engine3D._default) {
            Engine3D._default = new Engine3D();
        }
        await Engine3D._default.init(descriptor);
    }

    /**
     * set render view and start renderer (static — operates on default instance)
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._default.startRenderView(view);
    }

    /**
     * set render views and start renderer (static — operates on default instance)
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._default.startRenderViews(views);
    }

    /**
     * get view render job instance (static — operates on default instance)
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._default?.getRenderJob(view);
    }

    /**
     * Pause the default engine render.
     */
    public static pause(): void {
        Engine3D._default?.pause();
    }

    /**
     * Resume the default engine render.
     */
    public static resume(): void {
        Engine3D._default?.resume();
    }

    // ── instance methods ───────────────────────────────────────────────────

    /**
     * Initialise this engine instance with its own canvas.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {

        // The first engine initialised becomes the global default.
        if (!Engine3D._default) {
            Engine3D._default = this;
            console.log('Engine Version', version);
            if (!window.isSecureContext) {
                console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)')
            }
        }

        // Per-instance settings (deep copy from defaults then merge).
        this.setting = { ...DEFAULT_SETTING };
        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // Shared one-time initialisations (safe to call multiple times).
        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        // Per-instance canvas context.
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);

        // Activate this instance's context so subsequent init calls to shared
        // systems see the correct presentationSize.
        setActiveWebGPUContext(this.context);

        // Pre-compute reflection settings.
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Per-instance resource maps.
        this.rtResourceMap = new RTResourceMap();
        this.gBufferMap = new Map<string, GBufferFrame>();
        RTResourceMap.current = this.rtResourceMap;
        GBufferFrame.currentMap = this.gBufferMap;

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // Shared one-time initialisations.
        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        RTResourceMap.init(); // sets RTResourceMap.current; we re-set below
        RTResourceMap.current = this.rtResourceMap; // keep our per-instance map active
        ShadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);

        this.renderJobs = new Map<View3D, RendererJob>();
        this.views = [];
    }

    private startRenderJob(view: View3D): RendererJob {
        view.engine = this;
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
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set render views and start renderer.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this.startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get view render job instance.
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
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
    }

    private async render(time: number): Promise<void> {
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
        await this.updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async updateFrame(time: number): Promise<void> {
        // Activate this instance's context and resources before rendering.
        // Since JavaScript is single-threaded, swapping here is safe even when
        // multiple Engine3D instances each have their own RAF loop.
        Engine3D._active = this;
        setActiveWebGPUContext(this.context);
        RTResourceMap.current = this.rtResourceMap;
        GBufferFrame.currentMap = this.gBufferMap;

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
}
