import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMapInstance } from './gfx/renderJob/frame/RTResourceMap';
import { ForwardRenderJob } from './gfx/renderJob/jobs/ForwardRenderJob';
import { GlobalBindGroupInstance } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { Interpolator } from './math/TimeInterpolator';
import { RendererJob } from './gfx/renderJob/jobs/RendererJob';
import { Res } from './assets/Res';
import { ShaderLib } from './assets/shader/ShaderLib';
import { ShaderUtil } from './gfx/graphics/webGpu/shader/util/ShaderUtil';
import { ComponentCollectInstance } from './gfx/renderJob/collect/ComponentCollect';
import { ShadowLightsCollectInstance } from './gfx/renderJob/collect/ShadowLightsCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';
import { EngineContext } from './core/EngineContext';

const defaultSetting: EngineSetting = {
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

/** @internal — shared WasmMatrix is initialized once for all engine instances */
let _wasmInitialized = false;

/**
 * Orillusion 3D Engine
 *
 * Supports multiple independent instances running simultaneously:
 *
 * ```typescript
 * const engine1 = new Engine3D();
 * await engine1.init({ canvasConfig: { canvas: canvas1 } });
 * engine1.startRenderView(view1);
 *
 * const engine2 = new Engine3D();
 * await engine2.init({ canvasConfig: { canvas: canvas2 } });
 * engine2.startRenderView(view2);
 * ```
 *
 * For single-engine apps the static API is still available and delegates to the
 * last-initialised engine instance:
 *
 * ```typescript
 * await Engine3D.init({ canvasConfig: ... });
 * Engine3D.startRenderView(view);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // ─── Per-instance state ────────────────────────────────────────────────

    /** WebGPU canvas context for this engine instance */
    public context: Context3D;

    /** Resource manager */
    public res: Res;

    /** Input system bound to this engine's canvas */
    public inputSystem: InputSystem;

    /** Active views rendered by this engine */
    public views: View3D[];

    /** Render job map (View3D → RendererJob) */
    public renderJobs: Map<View3D, RendererJob>;

    /** Per-engine settings (each instance has independent settings) */
    public setting: EngineSetting;

    /** @internal Per-engine component update collections */
    public _componentCollect: ComponentCollectInstance;

    /** @internal Per-engine global bind groups */
    public _globalBindGroup: GlobalBindGroupInstance;

    /** @internal Per-engine render texture cache */
    public _rtResourceMap: RTResourceMapInstance;

    /** @internal Per-engine shadow light collection */
    public _shadowLightsCollect: ShadowLightsCollectInstance;

    /** @internal Per-engine GBuffer frame map */
    public _gBufferFrameMap: Map<string, GBufferFrame>;

    // Per-instance render-loop state
    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.setting = JSON.parse(JSON.stringify(defaultSetting));
        // Restore non-serialisable objects (e.g. Color instances)
        this.setting.render.postProcessing.globalFog.fogColor = new Color(96 / 255, 117 / 255, 133 / 255, 1);
    }

    // ─── Per-instance accessors ────────────────────────────────────────────

    /** Canvas presentation size [width, height] */
    public get size(): number[] { return this.context.presentationSize; }

    /** Canvas aspect ratio */
    public get aspect(): number { return this.context.aspect; }

    /** Canvas pixel width */
    public get width(): number { return this.context.windowWidth; }

    /** Canvas pixel height */
    public get height(): number { return this.context.windowHeight; }

    /** Engine render frame rate */
    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    // ─── Initialisation ───────────────────────────────────────────────────

    /**
     * Initialise this engine instance. Creates a WebGPU context bound to the
     * specified canvas (or a full-page canvas when none is provided).
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

        // Merge user settings into this instance's settings
        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // WasmMatrix is initialised once globally (shared memory pool)
        if (!_wasmInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            _wasmInitialized = true;
        }

        // Create and initialise per-engine sub-systems
        this._componentCollect = new ComponentCollectInstance();
        this._globalBindGroup = new GlobalBindGroupInstance();
        this._rtResourceMap = new RTResourceMapInstance();
        this._shadowLightsCollect = new ShadowLightsCollectInstance();
        this._gBufferFrameMap = new Map<string, GBufferFrame>();

        // Create the WebGPU context for this engine's canvas
        this.context = new Context3D();

        // Register this engine as the active one (activates webGPUContext Proxy)
        EngineContext.register(this);
        setActiveContext(this.context);

        await this.context.init(descriptor.canvasConfig);

        // Pre-compute reflection settings
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Init sub-systems (they read from EngineContext.current which points to this engine)
        this._globalBindGroup.init();
        this._rtResourceMap.init();
        this._shadowLightsCollect.init();

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        ShaderLib.init();
        ShaderUtil.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);

        return this;
    }

    // ─── View management ──────────────────────────────────────────────────

    private _startRenderJob(view: View3D): RendererJob {
        const renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this.setting.pick.mode === `pixel`) {
            const postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this.setting.pick.mode === `pixel` || this.setting.pick.mode === `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Set a single render view and start the render loop for this engine.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        view.engine = this;
        this.views = [view];
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop for this engine.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (const view of views) {
            view.engine = this;
            this._startRenderJob(view);
        }
        this.resume();
    }

    /**
     * Get the RendererJob associated with a view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    // ─── Render loop ──────────────────────────────────────────────────────

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

    /** Make this engine the active one (switches webGPUContext and EngineContext). */
    public setActive(): void {
        EngineContext.setActive(this);
        setActiveContext(this.context);
    }

    private async _render(time: number): Promise<void> {
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

        // Activate this engine's context before rendering
        this.setActive();

        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        // Before-update component pass
        for (const [k, v] of this._componentCollect.componentsBeforeUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        // Compute pass (GPU commands)
        const command = this.context.device.createCommandEncoder();
        for (const [k, v] of this._componentCollect.componentsComputeList) {
            for (const [f, c] of v) {
                if (f.enable) c(k, command);
            }
        }
        this.context.device.queue.submit([command.finish()]);

        // Update component pass
        for (const [k, v] of this._componentCollect.componentsUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        // Graphic component pass
        for (const [k, v] of this._componentCollect.graphicComponent) {
            for (const [f, c] of v) {
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop) await this._renderLoop();

        // Update world matrices and write to GPU
        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        const globalMatrixBindGroup = this._globalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        // Late-update component pass
        for (const [k, v] of this._componentCollect.componentsLateUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        if (this._lateRender) await this._lateRender();
    }

    // ─── Static API (backward compat — delegates to the active engine) ────

    /**
     * The currently active Engine3D instance.
     * Set automatically to the last-initialized engine; use engine.setActive() to switch.
     */
    public static get current(): Engine3D {
        return EngineContext.current as Engine3D;
    }

    /** @deprecated Use `new Engine3D()` and call `engine.setting` instead. Delegates to the active engine. */
    public static get setting(): EngineSetting {
        return Engine3D.current?.setting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D.current) Engine3D.current.setting = v;
    }

    /** @deprecated Delegates to the active engine. */
    public static get res(): Res { return Engine3D.current?.res; }

    /** @deprecated Delegates to the active engine. */
    public static get inputSystem(): InputSystem { return Engine3D.current?.inputSystem; }

    /** @deprecated Delegates to the active engine. */
    public static get views(): View3D[] { return Engine3D.current?.views; }

    /** @deprecated Delegates to the active engine. */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D.current?.renderJobs; }

    /** @deprecated Delegates to the active engine. */
    public static get size(): number[] { return Engine3D.current?.size; }

    /** @deprecated Delegates to the active engine. */
    public static get aspect(): number { return Engine3D.current?.aspect; }

    /** @deprecated Delegates to the active engine. */
    public static get width(): number { return Engine3D.current?.width; }

    /** @deprecated Delegates to the active engine. */
    public static get height(): number { return Engine3D.current?.height; }

    /** @deprecated Delegates to the active engine. */
    public static get frameRate(): number { return Engine3D.current?.frameRate; }
    public static set frameRate(v: number) { if (Engine3D.current) Engine3D.current.frameRate = v; }

    /**
     * Convenience static init — creates a new Engine3D instance, initialises it,
     * and sets it as the active engine. Equivalent to `new Engine3D().init(descriptor)`.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<Engine3D> {
        const engine = new Engine3D();
        await engine.init(descriptor);
        return engine;
    }

    /** @deprecated Delegates to the active engine. */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D.current?.startRenderView(view);
    }

    /** @deprecated Delegates to the active engine. */
    public static startRenderViews(views: View3D[]): void {
        Engine3D.current?.startRenderViews(views);
    }

    /** @deprecated Delegates to the active engine. */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.current?.getRenderJob(view);
    }

    /** @deprecated Delegates to the active engine. */
    public static pause(): void { Engine3D.current?.pause(); }

    /** @deprecated Delegates to the active engine. */
    public static resume(): void { Engine3D.current?.resume(); }
}
