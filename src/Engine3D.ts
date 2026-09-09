import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setWebGPUContext } from './gfx/graphics/webGpu/Context3D';
import { setCurrentHandle } from './gfx/EngineContext';
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
 * Orillusion 3D Engine — supports multiple independent instances.
 *
 * **Single-instance (backward-compatible) API:**
 * ```ts
 * await Engine3D.init({ canvasConfig });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-instance API:**
 * ```ts
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas: myCanvas } });
 * engine.startRenderView(view);
 * ```
 * @group engine3D
 */
export class Engine3D {

    // ─── Static registry ───────────────────────────────────────────────────────

    /** Currently active engine (set automatically during each render frame). */
    public static current: Engine3D;

    /** All Engine3D instances created in this session. */
    public static instances: Engine3D[] = [];

    // ─── Static backward-compatible API ────────────────────────────────────────
    // These properties and methods delegate to Engine3D.current so that code
    // written for the original single-instance API continues to work unchanged.

    public static get res(): Res { return Engine3D.current?.res; }
    public static set res(v: Res) { if (Engine3D.current) Engine3D.current.res = v; }

    public static get inputSystem(): InputSystem { return Engine3D.current?.inputSystem; }

    public static get views(): View3D[] { return Engine3D.current?.views; }
    public static set views(v: View3D[]) { if (Engine3D.current) Engine3D.current.views = v; }

    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D.current?.renderJobs; }

    public static get frameRate(): number { return Engine3D.current?._frameRate ?? 360; }
    public static set frameRate(v: number) { if (Engine3D.current) Engine3D.current.frameRate = v; }

    public static get size(): number[] { return Engine3D.current?.context.presentationSize; }
    public static get aspect(): number { return Engine3D.current?.context.aspect; }
    public static get width(): number { return Engine3D.current?.context.windowWidth; }
    public static get height(): number { return Engine3D.current?.context.windowHeight; }

    /**
     * Engine settings — shared between the static accessor and the current
     * engine instance.  Modify before calling init() to override defaults.
     */
    public static setting: EngineSetting = {
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

    // ─── Static backward-compatible methods ────────────────────────────────────

    /**
     * Create and initialize a default engine instance.
     * Backward-compatible entry point — equivalent to `new Engine3D(); await engine.init(...)`.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<Engine3D> {
        const engine = new Engine3D();
        Engine3D.instances.push(engine);
        Engine3D.current = engine;
        await engine.init(descriptor);
        // Keep the static setting in sync with the new instance's setting object.
        Engine3D.setting = engine.setting;
        return engine;
    }

    /** @see Engine3D#startRenderView */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D.current.startRenderView(view);
    }

    /** @see Engine3D#startRenderViews */
    public static startRenderViews(views: View3D[]): void {
        Engine3D.current.startRenderViews(views);
    }

    /** @see Engine3D#getRenderJob */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.current.getRenderJob(view);
    }

    /** @see Engine3D#pause */
    public static pause(): void {
        Engine3D.current.pause();
    }

    /** @see Engine3D#resume */
    public static resume(): void {
        Engine3D.current.resume();
    }

    // ─── Instance fields ───────────────────────────────────────────────────────

    /** Per-instance GPU context (canvas + device). */
    public context: Context3D;

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine instance. */
    public inputSystem: InputSystem;

    /** Active views being rendered by this engine instance. */
    public views: View3D[];

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /** Engine configuration for this instance. */
    public setting: EngineSetting;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // Unique opaque handle used by GPU subsystems (GlobalBindGroup, RTResourceMap,
    // etc.) to store their per-engine state without importing Engine3D directly.
    private readonly _handle: object = {};

    // ─── Instance getters ──────────────────────────────────────────────────────

    /** Target frames-per-second for this instance. */
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

    // ─── Instance methods ──────────────────────────────────────────────────────

    /**
     * Initialize this engine instance against a canvas element.
     * @param descriptor  Optional configuration.
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

        // Activate this engine so subsystems initialised below use its state.
        Engine3D.current = this;
        setCurrentHandle(this._handle);

        this.setting = { ...Engine3D.setting, ...descriptor.engineSetting };

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        // Create and initialise a GPU context dedicated to this engine instance.
        this.context = new Context3D();
        setWebGPUContext(this.context);
        await this.context.init(descriptor.canvasConfig);

        // Pre-compute reflection setting dimensions.
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
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
    }

    private startRenderJob(view: View3D): RendererJob {
        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this.setting.pick.mode === `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this.setting.pick.mode === `pixel` || this.setting.pick.mode === `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Set the render view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this.startRenderJob(view);
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
            this.startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Return the RendererJob associated with a view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause the render loop for this engine instance.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume (or start) the render loop for this engine instance.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
        }
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
        // Activate this engine's GPU context and subsystem state for the frame.
        Engine3D.current = this;
        setCurrentHandle(this._handle);
        setWebGPUContext(this.context);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        // Process only views belonging to this engine instance.
        const ownViews = new Set(views);

        for (const [view, viewComponents] of ComponentCollect.componentsBeforeUpdateList) {
            if (!ownViews.has(view)) continue;
            for (const [component, fn] of viewComponents) {
                if (component.enable) fn(view);
            }
        }

        let command = this.context.device.createCommandEncoder();
        for (const [view, viewComponents] of ComponentCollect.componentsComputeList) {
            if (!ownViews.has(view)) continue;
            for (const [component, fn] of viewComponents) {
                if (component.enable) fn(view, command);
            }
        }
        this.context.device.queue.submit([command.finish()]);

        for (const [view, viewComponents] of ComponentCollect.componentsUpdateList) {
            if (!ownViews.has(view)) continue;
            for (const [component, fn] of viewComponents) {
                if (component.enable) fn(view);
            }
        }

        for (const [view, viewComponents] of ComponentCollect.graphicComponent) {
            if (!ownViews.has(view)) continue;
            for (const [component, fn] of viewComponents) {
                if (view && component.enable) fn(view);
            }
        }

        if (this._renderLoop)
            await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        for (const [view, viewComponents] of ComponentCollect.componentsLateUpdateList) {
            if (!ownViews.has(view)) continue;
            for (const [component, fn] of viewComponents) {
                if (component.enable) fn(view);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
