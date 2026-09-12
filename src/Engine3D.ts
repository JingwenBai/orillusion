import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { setActiveEngine } from './core/EngineRegistry';

// ─── Default EngineSetting ────────────────────────────────────────────────────

function createDefaultSetting(): EngineSetting {
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

// ─── Engine3D ─────────────────────────────────────────────────────────────────

/**
 * Orillusion 3D Engine
 *
 * Can be used as a class instance for multi-instance setups, or via the
 * backward-compatible static API which operates on Engine3D.defaultInstance.
 *
 * @example Multi-instance usage:
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
 * @example Legacy single-instance usage (unchanged):
 * ```ts
 * await Engine3D.init({ canvasConfig: { canvas } });
 * Engine3D.startRenderView(view);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // ─── Registry of all live Engine3D instances ──────────────────────────────

    /** All active Engine3D instances. */
    public static readonly instances: Engine3D[] = [];

    /** The default instance, created by the first call to the static Engine3D.init(). */
    public static defaultInstance: Engine3D | null = null;

    // ─── Per-instance public state ────────────────────────────────────────────

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine instance. */
    public inputSystem: InputSystem;

    /** Active views being rendered by this instance. */
    public views: View3D[];

    /** Map of View3D → RendererJob for this instance. @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /** Engine settings for this instance. */
    public setting: EngineSetting;

    /** WebGPU context (canvas + device) for this instance. */
    public webGPUContext: Context3D;

    /** Component lifecycle collector for this instance. */
    public componentCollect: ComponentCollect;

    /** GPU bind groups manager for this instance. */
    public globalBindGroup: GlobalBindGroup;

    /** Render-texture resource map for this instance. */
    public rtResourceMap: RTResourceMap;

    /** Shadow-lights collector for this instance. */
    public shadowLightsCollect: ShadowLightsCollect;

    /** Per-instance time tracking. */
    public time: Time;

    // ─── Private render loop state ────────────────────────────────────────────

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _lastTime: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ─── Frame rate ───────────────────────────────────────────────────────────

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

    // ─── Convenience accessors (delegate to webGPUContext) ───────────────────

    public get size(): number[] {
        return this.webGPUContext.presentationSize;
    }

    public get aspect(): number {
        return this.webGPUContext.aspect;
    }

    public get width(): number {
        return this.webGPUContext.windowWidth;
    }

    public get height(): number {
        return this.webGPUContext.windowHeight;
    }

    // ─── Instance initialisation ──────────────────────────────────────────────

    /**
     * Create a new Engine3D instance.
     * Call `await engine.init(...)` to fully initialise it.
     */
    constructor() {
        this.setting = createDefaultSetting();
        this.webGPUContext = new Context3D();
        this.componentCollect = new ComponentCollect();
        this.globalBindGroup = new GlobalBindGroup();
        this.rtResourceMap = new RTResourceMap();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.time = new Time();
    }

    /**
     * Initialise the engine: sets up WebGPU, WASM matrix pool, shaders,
     * bind groups, resource manager, and input system.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        // Register this instance
        setActiveEngine(this);
        if (!Engine3D.defaultInstance) {
            Engine3D.defaultInstance = this;
        }
        if (!Engine3D.instances.includes(this)) {
            Engine3D.instances.push(this);
        }

        // Activate context so all subsystems use this engine during init
        setActiveContext(this.webGPUContext);

        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // WasmMatrix is global (single WASM module shared across all instances)
        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        await this.webGPUContext.init(descriptor.canvasConfig);

        // Pre-compute reflection settings
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // ShaderLib and ShaderUtil are shared across instances (same device + shader code)
        ShaderLib.init();
        ShaderUtil.init();

        // Per-instance GPU bind group + render texture init
        this.globalBindGroup.initInstance();
        this.rtResourceMap.init();
        this.shadowLightsCollect.initInstance();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.webGPUContext.canvas);
    }

    // ─── Render job management ────────────────────────────────────────────────

    private _startRenderJob(view: View3D): RendererJob {
        // Activate this engine's context before creating render resources
        setActiveEngine(this);
        setActiveContext(this.webGPUContext);

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
        view._engine = this;
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
            views[i]._engine = this;
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the RendererJob for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    // ─── Render loop ──────────────────────────────────────────────────────────

    /** Pause rendering for this engine instance. */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume rendering for this engine instance. */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    private async _render(time: number): Promise<void> {
        if (this._frameRateValue > 0) {
            let delta = time - this._lastTime;
            if (delta < this._frameRateValue) {
                let t = performance.now();
                await new Promise(res => {
                    setTimeout(() => {
                        time += (performance.now() - t);
                        res(true);
                    }, this._frameRateValue - delta);
                });
            }
            this._lastTime = time;
        }
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    /** @internal */
    private async _updateFrame(time: number): Promise<void> {
        // Activate this engine so all subsystem static calls route here
        setActiveEngine(this);
        setActiveContext(this.webGPUContext);

        // Update per-instance time
        this.time.delta = time - this.time.time;
        this.time.time = time;
        this.time.frame += 1;

        // Keep the shared static Time in sync with the default engine
        if (this === Engine3D.defaultInstance) {
            Time.delta = this.time.delta;
            Time.time = this.time.time;
            Time.frame = this.time.frame;
        }

        Interpolator.tick(this.time.delta);

        let views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        for (const iterator of this.componentCollect.componentsBeforeUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k); }
            }
        }

        let command = this.webGPUContext.device.createCommandEncoder();
        for (const iterator of this.componentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k, command); }
            }
        }
        this.webGPUContext.device.queue.submit([command.finish()]);

        for (const iterator of this.componentCollect.componentsUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k); }
            }
        }

        for (const iterator of this.componentCollect.graphicComponent) {
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

        // Write world matrix buffer for this engine's bind group
        let globalMatrixBindGroup = this.globalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, _k) => {
            if (!v.renderState) { v.start(); }
            v.renderFrame();
        });

        for (const iterator of this.componentCollect.componentsLateUpdateList) {
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

    // ─── Static backward-compatible API ──────────────────────────────────────
    // All static methods proxy to Engine3D.defaultInstance.
    // Legacy single-engine code using Engine3D.init() / Engine3D.startRenderView()
    // continues to work unchanged.

    /** @deprecated Use `new Engine3D()` for multi-instance. */
    public static get res(): Res {
        return Engine3D.defaultInstance?.res;
    }
    public static set res(v: Res) {
        if (Engine3D.defaultInstance) Engine3D.defaultInstance.res = v;
    }

    /** @deprecated Use instance property. */
    public static get inputSystem(): InputSystem {
        return Engine3D.defaultInstance?.inputSystem;
    }
    public static set inputSystem(v: InputSystem) {
        if (Engine3D.defaultInstance) Engine3D.defaultInstance.inputSystem = v;
    }

    /** @deprecated Use instance property. */
    public static get views(): View3D[] {
        return Engine3D.defaultInstance?.views;
    }
    public static set views(v: View3D[]) {
        if (Engine3D.defaultInstance) Engine3D.defaultInstance.views = v;
    }

    /** @deprecated Use instance property. */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D.defaultInstance?.renderJobs;
    }
    public static set renderJobs(v: Map<View3D, RendererJob>) {
        if (Engine3D.defaultInstance) Engine3D.defaultInstance.renderJobs = v;
    }

    /** @deprecated Use instance property. */
    public static get frameRate(): number {
        return Engine3D.defaultInstance?._frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (Engine3D.defaultInstance) Engine3D.defaultInstance.frameRate = value;
    }

    /** @deprecated Use instance property. */
    public static get size(): number[] {
        return Engine3D.defaultInstance?.size;
    }

    /** @deprecated Use instance property. */
    public static get aspect(): number {
        return Engine3D.defaultInstance?.aspect;
    }

    /** @deprecated Use instance property. */
    public static get width(): number {
        return Engine3D.defaultInstance?.width;
    }

    /** @deprecated Use instance property. */
    public static get height(): number {
        return Engine3D.defaultInstance?.height;
    }

    /** Engine settings for the default instance. */
    public static setting: EngineSetting = createDefaultSetting();

    /** @internal */
    public static renderJobsMap: Map<View3D, RendererJob>;

    /**
     * Create and initialise the default Engine3D instance (legacy single-engine API).
     *
     * -- Engine3D.setting.*
     * -- await Engine3D.init();
     * @group engine3D
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        if (!Engine3D.defaultInstance) {
            Engine3D.defaultInstance = new Engine3D();
        }
        // Merge static setting into the descriptor
        Engine3D.defaultInstance.setting = { ...Engine3D.setting, ...descriptor.engineSetting };
        await Engine3D.defaultInstance.init({
            ...descriptor,
            engineSetting: Engine3D.defaultInstance.setting,
        });
        // Sync static setting back
        Engine3D.setting = Engine3D.defaultInstance.setting;
    }

    /** Start a single render view (legacy API). */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D.defaultInstance.startRenderView(view);
    }

    /** Start multiple render views (legacy API). */
    public static startRenderViews(views: View3D[]): void {
        Engine3D.defaultInstance.startRenderViews(views);
    }

    /** Get the render job for a view (legacy API). */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.defaultInstance?.getRenderJob(view);
    }

    /** Pause the default engine. */
    public static pause(): void {
        Engine3D.defaultInstance?.pause();
    }

    /** Resume the default engine. */
    public static resume(): void {
        Engine3D.defaultInstance?.resume();
    }
}
