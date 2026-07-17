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
 * Supports multiple independent instances, each with its own canvas and GPU context.
 *
 * Single-instance usage (backward compatible):
 * ```ts
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas } });
 * engine.startRenderView(view);
 * // Legacy accessors still work:
 * Engine3D.res.load(...);
 * Engine3D.setting.shadow.enable = false;
 * ```
 *
 * Multi-instance usage:
 * ```ts
 * const engineA = new Engine3D();
 * await engineA.init({ canvasConfig: { canvas: canvasA } });
 * engineA.startRenderView(viewA);
 *
 * const engineB = new Engine3D();
 * await engineB.init({ canvasConfig: { canvas: canvasB }, shareDeviceWith: engineA });
 * engineB.startRenderView(viewB);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // =========================================================
    // STATIC — backward-compat accessors
    // Before each frame these are swapped to the currently-rendering engine's state.
    // =========================================================

    /**
     * Resource manager. In multi-engine mode reflects whichever engine is currently rendering.
     */
    public static res: Res;

    /**
     * Input system. In multi-engine mode reflects whichever engine is currently rendering.
     */
    public static inputSystem: InputSystem;

    /**
     * Active views. In multi-engine mode reflects whichever engine is currently rendering.
     */
    public static views: View3D[];

    /**
     * Render jobs. In multi-engine mode reflects whichever engine is currently rendering.
     */
    public static renderJobs: Map<View3D, RendererJob>;

    /**
     * Engine-wide setting object.
     * In multi-instance mode this is automatically swapped to the currently-rendering
     * engine's settings before each frame.
     */
    public static setting: EngineSetting = createDefaultEngineSetting();

    /** @internal currently active engine instance */
    private static _activeEngine: Engine3D | null = null;

    /** @internal monotonic counter for assigning engine IDs */
    private static _instanceCount: number = 0;

    /** Render frame rate (delegates to the active engine). */
    public static get frameRate(): number {
        return Engine3D._activeEngine?._frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (Engine3D._activeEngine) {
            Engine3D._activeEngine._frameRate = value;
            Engine3D._activeEngine._frameRateValue = value >= 360 ? 0 : 1000 / value;
        }
    }

    /** Current canvas presentation size [width, height]. */
    public static get size(): number[] {
        return webGPUContext.presentationSize;
    }

    /** Current canvas aspect ratio. */
    public static get aspect(): number {
        return webGPUContext.aspect;
    }

    /** Current canvas width in pixels. */
    public static get width(): number {
        return webGPUContext.windowWidth;
    }

    /** Current canvas height in pixels. */
    public static get height(): number {
        return webGPUContext.windowHeight;
    }

    // =========================================================
    // INSTANCE — per-engine state
    // =========================================================

    /** Unique ID for this engine instance (assigned at construction time). */
    public readonly engineId: number;

    /** WebGPU context (canvas + device) owned by this engine instance. */
    public readonly context: Context3D;

    // Per-engine copies of the static globals (private; exposed via _activateContext)
    private _res: Res;
    private _inputSystem: InputSystem;
    private _views: View3D[];
    private _renderJobs: Map<View3D, RendererJob>;
    private _setting: EngineSetting;
    private _frameRate: number = 360;
    private _frameRateValue: number = 0;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _rafId: number = 0;

    constructor() {
        this.engineId = Engine3D._instanceCount++;
        this.context = new Context3D();
        this._setting = createDefaultEngineSetting();
    }

    // =========================================================
    // INSTANCE GETTERS — access per-engine state without activation
    // =========================================================

    /** Per-engine resource manager. */
    public get engineRes(): Res { return this._res; }

    /** Per-engine input system. */
    public get engineInputSystem(): InputSystem { return this._inputSystem; }

    /** Per-engine active views. */
    public get engineViews(): View3D[] { return this._views; }

    /** Per-engine render jobs. */
    public get engineRenderJobs(): Map<View3D, RendererJob> { return this._renderJobs; }

    /** Per-engine settings. Modifying this object only affects this engine instance. */
    public get engineSetting(): EngineSetting { return this._setting; }

    // =========================================================
    // INITIALISATION
    // =========================================================

    /**
     * Initialise this engine instance.
     *
     * @param descriptor.shareDeviceWith  Pass another Engine3D instance to reuse its GPU device
     *   (the second canvas still gets its own GPUCanvasContext, but avoids creating a new GPUDevice).
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
        shareDeviceWith?: Engine3D;
    } = {}): Promise<void> {
        console.log('Engine Version', version, `(engine ${this.engineId})`);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        if (descriptor.engineSetting) {
            this._setting = { ...this._setting, ...descriptor.engineSetting };
        }

        // Swap static globals so that code running during init sees this engine's state
        this._activateContext();

        await WasmMatrix.init(Matrix4.allocCount, this._setting.doublePrecision);

        const shared = descriptor.shareDeviceWith;
        await this.context.init(
            descriptor.canvasConfig,
            shared?.context.adapter,
            shared?.context.device
        );
        // After context.init the WebGPU device is ready — re-activate to point webGPUContext here
        setWebGPUContext(this.context);

        this._setting.reflectionSetting.width =
            this._setting.reflectionSetting.reflectionProbeSize * 6;
        this._setting.reflectionSetting.height =
            this._setting.reflectionSetting.reflectionProbeSize *
            this._setting.reflectionSetting.reflectionProbeMaxCount;

        GBufferFrame.setEnginePrefix(this.engineId);
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this._setting.reflectionSetting.width,
            this._setting.reflectionSetting.height,
            false
        );

        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        RTResourceMap.init();
        ShadowLightsCollect.init();

        this._res = new Res();
        this._res.initDefault();
        Engine3D.res = this._res;

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this._inputSystem = new InputSystem();
        this._inputSystem.initCanvas(this.context.canvas);
        Engine3D.inputSystem = this._inputSystem;
    }

    // =========================================================
    // RENDER-VIEW MANAGEMENT
    // =========================================================

    private _startRenderJob(view: View3D): RendererJob {
        const renderJob = new ForwardRenderJob(view);
        this._renderJobs.set(view, renderJob);

        if (Engine3D.setting.pick.mode === `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (Engine3D.setting.pick.mode === `pixel` || Engine3D.setting.pick.mode === `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Register a single view and start the render loop for this engine instance.
     */
    public startRenderView(view: View3D): RendererJob {
        this._renderJobs ||= new Map<View3D, RendererJob>();
        this._views = [view];
        view.engine = this;
        this._activateContext();
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Register multiple views and start the render loop for this engine instance.
     */
    public startRenderViews(views: View3D[]): void {
        this._renderJobs ||= new Map<View3D, RendererJob>();
        this._views = views;
        this._activateContext();
        for (let i = 0; i < views.length; i++) {
            views[i].engine = this;
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the RendererJob for a given view belonging to this engine instance.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this._renderJobs?.get(view);
    }

    // =========================================================
    // LOOP CONTROL
    // =========================================================

    /** Pause rendering for this engine instance. */
    public pause(): void {
        if (this._rafId !== 0) {
            cancelAnimationFrame(this._rafId);
            this._rafId = 0;
        }
    }

    /** Resume rendering for this engine instance. */
    public resume(): void {
        if (this._rafId === 0) {
            this._rafId = requestAnimationFrame((t) => this._render(t));
        }
    }

    // =========================================================
    // INTERNAL
    // =========================================================

    /**
     * Make this engine the globally-visible active engine.
     * Swaps the module-level `webGPUContext`, `Engine3D.setting`, `Engine3D.res` etc.
     * to point to this instance's state.  Safe because JS is single-threaded and
     * render frames from different instances never overlap.
     */
    private _activateContext(): void {
        Engine3D._activeEngine = this;
        Engine3D.setting = this._setting;
        if (this._res) Engine3D.res = this._res;
        if (this._inputSystem) Engine3D.inputSystem = this._inputSystem;
        if (this._views) Engine3D.views = this._views;
        if (this._renderJobs) Engine3D.renderJobs = this._renderJobs;
        setWebGPUContext(this.context);
        GBufferFrame.setEnginePrefix(this.engineId);
    }

    private async _render(time: number): Promise<void> {
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
        await this._updateFrame(time);
        this._rafId = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        this._activateContext();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this._views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        for (const iterator of ComponentCollect.componentsBeforeUpdateList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        let command = webGPUContext.device.createCommandEncoder();
        for (const iterator of ComponentCollect.componentsComputeList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k, command);
            }
        }
        webGPUContext.device.queue.submit([command.finish()]);

        for (const iterator of ComponentCollect.componentsUpdateList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        for (const iterator of ComponentCollect.graphicComponent) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop)
            await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this._renderJobs.forEach((v) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const iterator of ComponentCollect.componentsLateUpdateList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
