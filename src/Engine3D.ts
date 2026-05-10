import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setCurrentContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap, setRTResourceMapFactory } from './gfx/renderJob/frame/RTResourceMap';
import { ForwardRenderJob } from './gfx/renderJob/jobs/ForwardRenderJob';
import { GlobalBindGroup } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { Interpolator } from './math/TimeInterpolator';
import { RendererJob } from './gfx/renderJob/jobs/RendererJob';
import { Res } from './assets/Res';
import { ShaderLib } from './assets/shader/ShaderLib';
import { ShaderUtil } from './gfx/graphics/webGpu/shader/util/ShaderUtil';
import { ComponentCollect, setComponentCollectFactory } from './gfx/renderJob/collect/ComponentCollect';
import { ShadowLightsCollect } from './gfx/renderJob/collect/ShadowLightsCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';
import { EntityCollect } from './gfx/renderJob/collect/EntityCollect';

// Re-export webGPUContext proxy so other files importing from Engine3D still work
export { webGPUContext };

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

/**
 * Orillusion 3D Engine
 *
 * Supports multiple instances. Each instance manages its own canvas, render loop,
 * and component/entity collections.
 *
 * Single-instance (backward-compatible) usage:
 * -- Engine3D.setting.*
 * -- await Engine3D.init();
 *
 * Multi-instance usage:
 * -- const engine = new Engine3D();
 * -- await engine.init({ canvasConfig: { canvas: myCanvas } });
 * -- engine.startRenderView(view);
 *
 * @group engine3D
 */
export class Engine3D {

    // =========================================================
    // Static: current active engine + shared state
    // =========================================================

    /**
     * The currently active engine instance.
     * During rendering this is set to the engine executing the current frame.
     * @internal
     */
    public static _current: Engine3D | null = null;

    /**
     * All registered engine instances (for shared render loop).
     * @internal
     */
    private static _engineList: Engine3D[] = [];

    /**
     * Shared requestAnimationFrame ID for the central render loop.
     * @internal
     */
    private static _sharedRAFID: number = 0;

    /**
     * Guard to run one-time global GPU initialization only once.
     * @internal
     */
    private static _globalInitDone: boolean = false;

    /**
     * Pre-init settings object (used before any engine instance is created).
     * @internal
     */
    private static _pendingSetting: EngineSetting = createDefaultSetting();

    // =========================================================
    // Static backward-compat accessors (delegate to _current)
    // =========================================================

    /** resource manager in engine3d */
    public static get res(): Res { return Engine3D._current?.res; }

    /** input system in engine3d */
    public static get inputSystem(): InputSystem { return Engine3D._current?.inputSystem; }

    /** active views in engine3d */
    public static get views(): View3D[] { return Engine3D._current?.views; }

    /** render jobs map */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._current?.renderJobs; }

    /**
     * Engine settings. Before init(), returns shared pending settings.
     * After init(), returns the active engine instance's settings.
     */
    public static get setting(): EngineSetting {
        return Engine3D._current?.setting ?? Engine3D._pendingSetting;
    }

    public static set setting(value: EngineSetting) {
        if (Engine3D._current) {
            Engine3D._current.setting = value;
        } else {
            Engine3D._pendingSetting = value;
        }
    }

    public static get size(): number[] { return Engine3D._current?.context?.presentationSize; }
    public static get aspect(): number { return Engine3D._current?.context?.aspect; }
    public static get width(): number { return Engine3D._current?.context?.windowWidth; }
    public static get height(): number { return Engine3D._current?.context?.windowHeight; }

    public static get frameRate(): number { return Engine3D._current?._frameRate ?? 360; }
    public static set frameRate(value: number) {
        if (Engine3D._current) Engine3D._current.frameRate = value;
    }

    // =========================================================
    // Static backward-compat methods (create/delegate to instance)
    // =========================================================

    /**
     * Initialize a new engine instance and set it as the active engine.
     * This is the backward-compatible static entry point.
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
        return;
    }

    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._current?.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        Engine3D._current?.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._current?.getRenderJob(view);
    }

    public static pause(): void {
        Engine3D._current?.pause();
    }

    public static resume(): void {
        Engine3D._current?.resume();
    }

    // =========================================================
    // Instance properties (per-engine state)
    // =========================================================

    /** resource manager */
    public res: Res;

    /** input system */
    public inputSystem: InputSystem;

    /** active views */
    public views: View3D[];

    /** render jobs map */
    public renderJobs: Map<View3D, RendererJob>;

    /** per-engine settings (copy of defaults, can diverge per instance) */
    public setting: EngineSetting;

    /** WebGPU context for this engine's canvas */
    public context: Context3D;

    /** component lifecycle collection for this engine */
    public componentCollect: ComponentCollect;

    /** scene entity collection for this engine */
    public entityCollect: EntityCollect;

    /** render texture resource map for this engine */
    public rtResourceMap: RTResourceMap;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _active: boolean = false;

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

    // =========================================================
    // Instance lifecycle
    // =========================================================

    /**
     * Initialize this engine instance with a canvas and optional configuration.
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

        // Apply settings: merge pending (pre-init) settings with constructor overrides
        this.setting = { ...Engine3D._pendingSetting, ...descriptor.engineSetting };

        // Create per-engine context and connect to canvas
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);

        // Activate this engine as current (needed by global init code below)
        this._activate();

        // Register factories so static compat methods can resolve the current engine's
        // collections without importing Engine3D (avoids circular dependency)
        setComponentCollectFactory(() => Engine3D._current?.componentCollect ?? null);
        setRTResourceMapFactory(() => Engine3D._current?.rtResourceMap ?? null);

        // One-time global GPU initialization (shared across all instances)
        if (!Engine3D._globalInitDone) {
            Engine3D._globalInitDone = true;

            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

            this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
            this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
            GBufferFrame.getGBufferFrame(
                GBufferFrame.reflections_GBuffer,
                this.setting.reflectionSetting.width,
                this.setting.reflectionSetting.height,
                false
            );

            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            ShadowLightsCollect.init();
        }

        // Per-engine initialization
        this.componentCollect = new ComponentCollect();
        this.entityCollect = new EntityCollect();
        this.rtResourceMap = new RTResourceMap();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);
    }

    /**
     * Set render view and start renderer
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        view.engine = this;
        const renderJob = this._startRenderJob(view);
        this._active = true;
        Engine3D._registerAndStartLoop(this);
        return renderJob;
    }

    /**
     * Set multiple render views and start renderer
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            views[i].engine = this;
            this._startRenderJob(views[i]);
        }
        this._active = true;
        Engine3D._registerAndStartLoop(this);
    }

    /**
     * Get view render job instance
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
    }

    /**
     * Pause this engine's rendering
     */
    public pause(): void {
        this._active = false;
    }

    /**
     * Resume this engine's rendering
     */
    public resume(): void {
        this._active = true;
        Engine3D._registerAndStartLoop(this);
    }

    /**
     * Destroy this engine instance and release resources
     */
    public destroy(): void {
        this._active = false;
        const idx = Engine3D._engineList.indexOf(this);
        if (idx !== -1) Engine3D._engineList.splice(idx, 1);
        if (Engine3D._current === this) Engine3D._current = Engine3D._engineList[0] ?? null;
    }

    // =========================================================
    // Private instance methods
    // =========================================================

    private _activate() {
        Engine3D._current = this;
        setCurrentContext(this.context);
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

    private async _renderFrame(time: number): Promise<void> {
        // Frame rate limiting
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
            let [w, h] = this.context.presentationSize;
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

        let command = this.context.device.createCommandEncoder();
        for (const iterator of this.componentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k, command); }
            }
        }
        this.context.device.queue.submit([command.finish()]);

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
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
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

    // =========================================================
    // Static: central shared render loop
    // =========================================================

    private static _registerAndStartLoop(engine: Engine3D): void {
        if (!Engine3D._engineList.includes(engine)) {
            Engine3D._engineList.push(engine);
        }
        if (Engine3D._sharedRAFID === 0) {
            Engine3D._sharedRAFID = requestAnimationFrame(t => Engine3D._sharedRender(t));
        }
    }

    private static async _sharedRender(time: number): Promise<void> {
        Engine3D._sharedRAFID = 0;

        const engines = Engine3D._engineList;
        for (let i = 0; i < engines.length; i++) {
            const engine = engines[i];
            if (!engine._active) continue;

            // Activate this engine as the current context for the duration of its frame
            engine._activate();
            await engine._renderFrame(time);
        }

        // Schedule next frame if any engine is still active
        if (engines.some(e => e._active)) {
            Engine3D._sharedRAFID = requestAnimationFrame(t => Engine3D._sharedRender(t));
        }
    }
}
