import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { RenderTexture } from './textures/RenderTexture';
import { ViewQuad } from './core/ViewQuad';
import { setCurrentEngine } from './util/EngineContext';

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
                bloom: { downSampleStep: 3, downSampleBlurSize: 9, downSampleBlurSigma: 1.0, upSampleBlurSize: 9, upSampleBlurSigma: 1.0, luminanceThreshole: 1.0, bloomIntensity: 1.0, hdr: 1.0 },
                globalFog: { debug: false, enable: false, fogType: 0.0, fogHeightScale: 0.1, start: 400, end: 10, density: 0.02, ins: 0.5, skyFactor: 0.5, skyRoughness: 0.4, overrideSkyFactor: 0.8, fogColor: new Color(96 / 255, 117 / 255, 133 / 255, 1), falloff: 0.7, rayLength: 200.0, scatteringExponent: 2.7, dirHeightLine: 10.0 },
                godRay: { blendColor: true, rayMarchCount: 16, scatteringExponent: 5, intensity: 0.5 },
                ssao: { enable: false, radius: 0.15, bias: -0.1, aoPower: 2.0, debug: true },
                outline: { enable: false, strength: 1, groupCount: 4, outlinePixel: 2, fadeOutlinePixel: 4, textureScale: 1, useAddMode: false, debug: true },
                taa: { enable: false, jitterSeedCount: 8, blendFactor: 0.1, sharpFactor: 0.6, sharpPreBlurFactor: 0.5, temporalJitterScale: 0.13, debug: true },
                gtao: { enable: false, darkFactor: 1.0, maxDistance: 5.0, maxPixel: 50.0, rayMarchSegment: 6, multiBounce: false, usePosFloat32: true, blendColor: true, debug: true },
                ssr: { enable: false, pixelRatio: 1, fadeEdgeRatio: 0.2, rayMarchRatio: 0.5, fadeDistanceMin: 600, fadeDistanceMax: 2000, roughnessThreshold: 0.5, powDotRN: 0.2, mixThreshold: 0.1, debug: true },
                fxaa: { enable: false },
                depthOfView: { enable: false, iterationCount: 3, pixelOffset: 1.0, near: 150, far: 300 },
            },
        },
        shadow: { enable: true, type: 'HARD', pointShadowBias: 0.0005, shadowSize: 2048, pointShadowSize: 1024, shadowSoft: 0.005, shadowBound: 100, shadowBias: 0.05, needUpdate: true, autoUpdate: true, updateFrameRate: 2, csmMargin: 0.1, csmScatteringExp: 0.7, csmAreaScale: 0.4, debug: false },
        gi: { enable: false, offsetX: 0, offsetY: 0, offsetZ: 0, probeSpace: 64, probeXCount: 4, probeYCount: 2, probeZCount: 4, probeSize: 32, probeSourceTextureSize: 2048, octRTMaxSize: 2048, octRTSideSize: 16, maxDistance: 64 * 1.73, normalBias: 0.25, depthSharpness: 1, hysteresis: 0.98, lerpHysteresis: 0.01, irradianceChebyshevBias: 0.01, rayNumber: 144, irradianceDistanceBias: 32, indirectIntensity: 1.0, ddgiGamma: 2.2, bounceIntensity: 0.025, probeRoughness: 1, realTimeGI: false, debug: false, autoRenderProbe: false },
        sky: { type: 'HDRSKY', sky: null, skyExposure: 1.0, defaultFar: 65536, defaultNear: 1 },
        light: { maxLight: 4096 },
        material: { materialChannelDebug: false, materialDebug: false },
        loader: { numConcurrent: 20 },
        reflectionSetting: { reflectionProbeMaxCount: 8, reflectionProbeSize: 256, width: 256 * 6, height: 8 * 256, enable: true }
    };
}

/**
 * Orillusion 3D Engine
 *
 * -- Engine3D.setting.*
 *
 * -- await Engine3D.init();
 * @group engine3D
 */
export class Engine3D {
    // ─── Shared GPU state (used by all Engine3D instances) ───────────────────
    /** @internal Shared GPUAdapter across all engine instances */
    private static _sharedAdapter: GPUAdapter | null = null;
    /** @internal Shared GPUDevice across all engine instances */
    private static _sharedDevice: GPUDevice | null = null;
    /** @internal Whether one-time global resources have been initialized */
    private static _globalInitDone: boolean = false;

    // ─── Static backward-compat: tracks the "default" engine instance ─────────
    /** @internal The default single engine instance for backward-compatible static API */
    private static _default: Engine3D | null = null;

    private static get _d(): Engine3D {
        if (!Engine3D._default) Engine3D._default = new Engine3D();
        return Engine3D._default;
    }

    /** The currently rendering Engine3D instance. Set automatically each frame. */
    public static current: Engine3D | null = null;

    // ─── Static backward-compat property forwarders ──────────────────────────
    public static get res(): Res { return Engine3D._d.res; }
    public static set res(v: Res) { Engine3D._d.res = v; }

    public static get inputSystem(): InputSystem { return Engine3D._d.inputSystem; }
    public static set inputSystem(v: InputSystem) { Engine3D._d.inputSystem = v; }

    public static get views(): View3D[] { return Engine3D._d.views; }
    public static set views(v: View3D[]) { Engine3D._d.views = v; }

    /** @internal */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._d.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { Engine3D._d.renderJobs = v; }

    public static get setting(): EngineSetting { return Engine3D._d.setting; }
    public static set setting(v: EngineSetting) { Engine3D._d.setting = v; }

    public static get frameRate(): number { return Engine3D._d.frameRate; }
    public static set frameRate(v: number) { Engine3D._d.frameRate = v; }

    /**
     * get render window size width and height
     */
    public static get size(): number[] { return Engine3D._d.size; }
    /**
     * get render window aspect
     */
    public static get aspect(): number { return Engine3D._d.aspect; }
    /**
     * get render window size width
     */
    public static get width(): number { return Engine3D._d.width; }
    /**
     * get render window size height
     */
    public static get height(): number { return Engine3D._d.height; }

    // ─── Static backward-compat method forwarders ────────────────────────────
    /**
     * create webgpu 3d engine
     * @param descriptor  {@link CanvasConfig}
     * @returns
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function; engineSetting?: EngineSetting } = {}): Promise<void> {
        return Engine3D._d.init(descriptor);
    }

    /**
     * set render view and start renderer
     * @param view
     * @returns
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._d.startRenderView(view);
    }

    /**
     * set render views and start renderer
     * @param views
     */
    public static startRenderViews(views: View3D[]): void {
        return Engine3D._d.startRenderViews(views);
    }

    /**
     * get view render job instance
     * @param view
     * @returns
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._d.getRenderJob(view);
    }

    /**
     * Pause the engine render
     */
    public static pause(): void {
        Engine3D._d.pause();
    }

    /**
     * Resume the engine render
     */
    public static resume(): void {
        Engine3D._d.resume();
    }

    // ─── Instance members ─────────────────────────────────────────────────────
    /** Per-engine GPU context (canvas + device reference) */
    public gpuContext: Context3D;

    /**
     * resource manager in engine3d
     */
    public res: Res;

    /**
     * input system in engine3d
     */
    public inputSystem: InputSystem;

    /**
     * more view in engine3d
     */
    public views: View3D[];

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /** Per-engine GBufferFrame cache (avoids key collisions between instances) */
    public _gBufferFrameMap: Map<string, GBufferFrame> = new Map();

    /** Per-engine render texture cache */
    public _rtTextureMap: Map<string, RenderTexture> = new Map();

    /** Per-engine view-quad cache */
    public _rtViewQuad: Map<string, ViewQuad> = new Map();

    private _setting: EngineSetting = createDefaultSetting();

    /**
     * engine setting
     */
    public get setting(): EngineSetting { return this._setting; }
    public set setting(v: EngineSetting) { this._setting = v; }

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /**
     * set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
     */
    public get frameRate(): number { return this._frameRate; }
    /**
     * get engine render frameRate
     */
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    public get size(): number[] { return this.gpuContext?.presentationSize ?? [0, 0]; }
    public get aspect(): number { return this.gpuContext?.aspect ?? 1; }
    public get width(): number { return this.gpuContext?.windowWidth ?? 0; }
    public get height(): number { return this.gpuContext?.windowHeight ?? 0; }

    /**
     * Initialize this Engine3D instance.
     * Multiple independent instances can be created and initialized on different canvases.
     * All instances share the same GPU device for efficiency.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function; engineSetting?: EngineSetting } = {}): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this._setting = { ...createDefaultSetting(), ...descriptor.engineSetting };

        this.gpuContext = new Context3D();
        this._setCurrent();

        if (Engine3D._sharedDevice) {
            // Subsequent engines share the existing GPU device
            await this.gpuContext.initSharedDevice(Engine3D._sharedAdapter, Engine3D._sharedDevice, descriptor.canvasConfig);
        } else {
            // First engine: create the GPU adapter and device
            await this.gpuContext.init(descriptor.canvasConfig);
            Engine3D._sharedAdapter = this.gpuContext.adapter;
            Engine3D._sharedDevice = this.gpuContext.device;
        }

        // One-time global resource initialization (shared across all engine instances)
        if (!Engine3D._globalInitDone) {
            Engine3D._globalInitDone = true;
            await WasmMatrix.init(Matrix4.allocCount, this._setting.doublePrecision);
            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            ShadowLightsCollect.init();
        }

        // Per-engine initialization
        this._setting.reflectionSetting.width = this._setting.reflectionSetting.reflectionProbeSize * 6;
        this._setting.reflectionSetting.height = this._setting.reflectionSetting.reflectionProbeSize * this._setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this._setting.reflectionSetting.width,
            this._setting.reflectionSetting.height,
            false
        );

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.gpuContext.canvas);
    }

    private _setCurrent(): void {
        Engine3D.current = this;
        setCurrentEngine(this);
    }

    private _startRenderJob(view: View3D): RendererJob {
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

    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
    }

    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    public resume(): void {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
    }

    /**
     * start engine render
     * @internal
     */
    private async _render(time: number): Promise<void> {
        this._setCurrent();
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
        this._setCurrent();
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
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
            let [w, h] = this.gpuContext.presentationSize;
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
                if (f.enable) { c(k); }
            }
        }

        let command = this.gpuContext.device.createCommandEncoder();
        for (const iterator of ComponentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k, command); }
            }
        }
        this.gpuContext.device.queue.submit([command.finish()]);

        /****** auto update with component list *****/
        for (const iterator of ComponentCollect.componentsUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k); }
            }
        }

        for (const iterator of ComponentCollect.graphicComponent) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (k && f.enable) { c(k); }
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
            if (!v.renderState) { v.start(); }
            v.renderFrame();
        });

        /****** auto late update with component list *****/
        for (const iterator of ComponentCollect.componentsLateUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k); }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
