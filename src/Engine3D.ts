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

let _wasmInitialized = false;
let _shadersInitialized = false;

function createDefaultEngineSetting(): EngineSetting {
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
                godRay: { blendColor: true, rayMarchCount: 16, scatteringExponent: 5, intensity: 0.5 },
                ssao: { enable: false, radius: 0.15, bias: -0.1, aoPower: 2.0, debug: true },
                outline: {
                    enable: false, strength: 1, groupCount: 4, outlinePixel: 2,
                    fadeOutlinePixel: 4, textureScale: 1, useAddMode: false, debug: true,
                },
                taa: {
                    enable: false, jitterSeedCount: 8, blendFactor: 0.1, sharpFactor: 0.6,
                    sharpPreBlurFactor: 0.5, temporalJitterScale: 0.13, debug: true,
                },
                gtao: {
                    enable: false, darkFactor: 1.0, maxDistance: 5.0, maxPixel: 50.0,
                    rayMarchSegment: 6, multiBounce: false, usePosFloat32: true,
                    blendColor: true, debug: true,
                },
                ssr: {
                    enable: false, pixelRatio: 1, fadeEdgeRatio: 0.2, rayMarchRatio: 0.5,
                    fadeDistanceMin: 600, fadeDistanceMax: 2000, roughnessThreshold: 0.5,
                    powDotRN: 0.2, mixThreshold: 0.1, debug: true,
                },
                fxaa: { enable: false },
                depthOfView: { enable: false, iterationCount: 3, pixelOffset: 1.0, near: 150, far: 300 },
            },
        },
        shadow: {
            enable: true, type: 'HARD', pointShadowBias: 0.0005, shadowSize: 2048,
            pointShadowSize: 1024, shadowSoft: 0.005, shadowBound: 100, shadowBias: 0.05,
            needUpdate: true, autoUpdate: true, updateFrameRate: 2,
            csmMargin: 0.1, csmScatteringExp: 0.7, csmAreaScale: 0.4, debug: false,
        },
        gi: {
            enable: false, offsetX: 0, offsetY: 0, offsetZ: 0, probeSpace: 64,
            probeXCount: 4, probeYCount: 2, probeZCount: 4, probeSize: 32,
            probeSourceTextureSize: 2048, octRTMaxSize: 2048, octRTSideSize: 16,
            maxDistance: 64 * 1.73, normalBias: 0.25, depthSharpness: 1,
            hysteresis: 0.98, lerpHysteresis: 0.01, irradianceChebyshevBias: 0.01,
            rayNumber: 144, irradianceDistanceBias: 32, indirectIntensity: 1.0,
            ddgiGamma: 2.2, bounceIntensity: 0.025, probeRoughness: 1,
            realTimeGI: false, debug: false, autoRenderProbe: false,
        },
        sky: { type: 'HDRSKY', sky: null, skyExposure: 1.0, defaultFar: 65536, defaultNear: 1 },
        light: { maxLight: 4096 },
        material: { materialChannelDebug: false, materialDebug: false },
        loader: { numConcurrent: 20 },
        reflectionSetting: {
            reflectionProbeMaxCount: 8, reflectionProbeSize: 256,
            width: 256 * 6, height: 8 * 256, enable: true,
        },
    };
}

// Pending setting: allows Engine3D.setting.xxx = yyy BEFORE init() is called (backward compat)
let _pendingSetting: EngineSetting = createDefaultEngineSetting();

/**
 * Orillusion 3D Engine
 *
 * Single-instance (backward compat):
 *   Engine3D.setting.xxx = yyy;
 *   await Engine3D.init({ canvasConfig });
 *   Engine3D.startRenderView(view);
 *
 * Multi-instance (new API):
 *   const engine1 = new Engine3D();
 *   await engine1.init({ canvasConfig: { canvas: canvas1 } });
 *   engine1.startRenderView(view1);
 *
 *   const engine2 = new Engine3D();
 *   await engine2.init({ canvasConfig: { canvas: canvas2 } });
 *   engine2.startRenderView(view2);
 *
 * @group engine3D
 */
export class Engine3D {

    // =========================================================
    // MULTI-INSTANCE MANAGEMENT
    // =========================================================

    /** @internal Unique ID for each engine instance */
    public readonly id: number;
    private static _idCounter: number = 0;

    /** All active Engine3D instances */
    public static readonly instances: Engine3D[] = [];

    /** @internal Currently active engine (used by GBufferFrame, RTResourceMap, static API) */
    public static _current: Engine3D | null = null;

    // =========================================================
    // PER-INSTANCE STATE
    // =========================================================

    /** WebGPU context for this engine's canvas */
    public context: Context3D;

    private _res: Res;
    private _inputSystem: InputSystem;
    private _views: View3D[] = [];
    private _renderJobs: Map<View3D, RendererJob> = new Map();
    private _setting: EngineSetting;
    private _frameRate: number = 360;
    private _frameRateValue: number = 0;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.id = Engine3D._idCounter++;
        this._setting = createDefaultEngineSetting();
    }

    // =========================================================
    // STATIC BACKWARD-COMPAT API (delegates to _current)
    // =========================================================

    /**
     * resource manager - delegates to current active engine
     */
    public static get res(): Res { return Engine3D._current?._res; }
    public static set res(v: Res) { if (Engine3D._current) Engine3D._current._res = v; }

    /**
     * input system - delegates to current active engine
     */
    public static get inputSystem(): InputSystem { return Engine3D._current?._inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D._current) Engine3D._current._inputSystem = v; }

    /**
     * views - delegates to current active engine
     */
    public static get views(): View3D[] { return Engine3D._current?._views; }

    /**
     * render jobs - delegates to current active engine
     * @internal
     */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._current?._renderJobs; }

    /**
     * engine setting - delegates to current active engine (or pending setting before init)
     */
    public static get setting(): EngineSetting {
        return Engine3D._current?._setting ?? _pendingSetting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D._current) Engine3D._current._setting = v;
        else _pendingSetting = v;
    }

    /**
     * frame rate - delegates to current active engine
     */
    public static get frameRate(): number {
        return Engine3D._current?._frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (Engine3D._current) Engine3D._current.frameRate = value;
    }

    /** render window size [width, height] */
    public static get size(): number[] { return webGPUContext?.presentationSize ?? [0, 0]; }

    /** render window aspect ratio */
    public static get aspect(): number { return webGPUContext?.aspect ?? 1; }

    /** render window width */
    public static get width(): number { return webGPUContext?.windowWidth ?? 0; }

    /** render window height */
    public static get height(): number { return webGPUContext?.windowHeight ?? 0; }

    // =========================================================
    // STATIC BACKWARD-COMPAT METHODS
    // =========================================================

    /**
     * Create WebGPU 3D engine (single-instance backward-compat API).
     * Creates a new Engine3D instance, sets it as active, and initializes it.
     * @param descriptor {@link CanvasConfig}
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        await engine.init(descriptor);
    }

    /**
     * Set render view and start renderer
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._current!.startRenderView(view);
    }

    /**
     * Set render views and start renderer
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._current!.startRenderViews(views);
    }

    /**
     * Get view render job instance
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._current!.getRenderJob(view);
    }

    /**
     * Pause the engine render
     */
    public static pause(): void { Engine3D._current?.pause(); }

    /**
     * Resume the engine render
     */
    public static resume(): void { Engine3D._current?.resume(); }

    // =========================================================
    // INSTANCE PROPERTY ACCESSORS
    // =========================================================

    public get res(): Res { return this._res; }
    public set res(v: Res) { this._res = v; }

    public get inputSystem(): InputSystem { return this._inputSystem; }

    public get views(): View3D[] { return this._views; }

    public get renderJobs(): Map<View3D, RendererJob> { return this._renderJobs; }

    public get setting(): EngineSetting { return this._setting; }
    public set setting(v: EngineSetting) { this._setting = v; }

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    public get size(): number[] { return this.context?.presentationSize ?? [0, 0]; }
    public get aspect(): number { return this.context?.aspect ?? 1; }
    public get width(): number { return this.context?.windowWidth ?? 0; }
    public get height(): number { return this.context?.windowHeight ?? 0; }

    // =========================================================
    // INSTANCE METHODS
    // =========================================================

    /**
     * Initialize this engine instance
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

        // Merge settings: pending (user pre-init changes) + descriptor override
        this._setting = { ..._pendingSetting, ...descriptor.engineSetting };

        // Set this engine as active before any subsystem init
        Engine3D._current = this;
        Engine3D.instances.push(this);

        // Initialize WASM matrix library (shared, only once)
        if (!_wasmInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, this._setting.doublePrecision);
            _wasmInitialized = true;
        }

        // Create per-instance WebGPU context (shares adapter/device with other instances)
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);

        // Activate this engine's context and resource maps
        this._setActive();

        // Pre-compute reflection settings
        this._setting.reflectionSetting.width =
            this._setting.reflectionSetting.reflectionProbeSize * 6;
        this._setting.reflectionSetting.height =
            this._setting.reflectionSetting.reflectionProbeSize *
            this._setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this._setting.reflectionSetting.width,
            this._setting.reflectionSetting.height,
            false
        );

        // Initialize shared shader/GPU resources (idempotent - safe to call multiple times)
        if (!_shadersInitialized) {
            ShaderLib.init();
            ShaderUtil.init();
            _shadersInitialized = true;
        }

        GlobalBindGroup.init();
        RTResourceMap.init();
        ShadowLightsCollect.init();

        this._res = new Res();
        this._res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this._inputSystem = new InputSystem();
        this._inputSystem.initCanvas(this.context.canvas);
    }

    /**
     * Set render view and start renderer for this engine instance
     */
    public startRenderView(view: View3D): RendererJob {
        this._renderJobs ||= new Map<View3D, RendererJob>();
        this._views = [view];
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start renderer for this engine instance
     */
    public startRenderViews(views: View3D[]): void {
        this._renderJobs ||= new Map<View3D, RendererJob>();
        this._views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the render job for a view
     */
    public getRenderJob(view: View3D): RendererJob {
        return this._renderJobs.get(view);
    }

    /**
     * Pause this engine's render loop
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume this engine's render loop
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    // =========================================================
    // PRIVATE INSTANCE METHODS
    // =========================================================

    private _setActive(): void {
        Engine3D._current = this;
        setActiveWebGPUContext(this.context);
        GBufferFrame.setActiveEngine(this.id);
        RTResourceMap.setActiveEngine(this.id);
    }

    private _startRenderJob(view: View3D): RendererJob {
        const renderJob = new ForwardRenderJob(view);
        this._renderJobs.set(view, renderJob);

        if (this._setting.pick.mode === 'pixel') {
            const postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this._setting.pick.mode === 'pixel' || this._setting.pick.mode === 'bound') {
            view.enablePick = true;
        }
        return renderJob;
    }

    private async _render(time: number): Promise<void> {
        // Activate this engine's context and resource maps for this frame
        this._setActive();

        if (this._frameRateValue > 0) {
            const delta = time - this._time;
            if (delta < this._frameRateValue) {
                const t = performance.now();
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
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        // Update all transforms for this engine's views
        const views = this._views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        // Only process components belonging to this engine's views
        const viewSet = new Set(this._views);

        for (const [k, v] of ComponentCollect.componentsBeforeUpdateList) {
            if (!viewSet.has(k)) continue;
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        const command = this.context.device.createCommandEncoder();
        for (const [k, v] of ComponentCollect.componentsComputeList) {
            if (!viewSet.has(k)) continue;
            for (const [f, c] of v) {
                if (f.enable) c(k, command);
            }
        }
        this.context.device.queue.submit([command.finish()]);

        for (const [k, v] of ComponentCollect.componentsUpdateList) {
            if (!viewSet.has(k)) continue;
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        for (const [k, v] of ComponentCollect.graphicComponent) {
            if (!viewSet.has(k)) continue;
            for (const [f, c] of v) {
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop) await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this._renderJobs.forEach((v, k) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const [k, v] of ComponentCollect.componentsLateUpdateList) {
            if (!viewSet.has(k)) continue;
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        if (this._lateRender) await this._lateRender();
    }
}
