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
import { EntityCollect } from './gfx/renderJob/collect/EntityCollect';
import { engineRef } from './EngineRef';

/**
 * Orillusion 3D Engine
 *
 * Instantiable — create one Engine3D per canvas to support multiple independent
 * 3D viewports on the same page:
 *
 * ```ts
 * const engineA = new Engine3D();
 * await engineA.init({ canvasConfig: { canvas: canvasA } });
 * engineA.startRenderView(viewA);
 *
 * const engineB = new Engine3D();
 * await engineB.init({ canvasConfig: { canvas: canvasB } });
 * engineB.startRenderView(viewB);
 * ```
 *
 * Single-engine backward compatibility is preserved via static accessors that
 * delegate to the most recently initialized engine (`Engine3D._active`).
 *
 * @group engine3D
 */
export class Engine3D {

    // ================================================================
    // Multi-instance support
    // ================================================================

    /**
     * The engine instance that is currently rendering a frame, or the last one
     * that called init().  All static backward-compat accessors read from here.
     */
    public static _active: Engine3D | null = null;

    /** True once WasmMatrix has been initialized (shared across all instances). */
    private static _wasmInited: boolean = false;

    // ================================================================
    // Per-instance state  (previously static on Engine3D)
    // ================================================================

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system bound to this engine's canvas. */
    public inputSystem: InputSystem;

    /** Views being rendered by this engine. */
    public views: View3D[] = [];

    /** Render-job map: View3D → RendererJob. */
    public renderJobs: Map<View3D, RendererJob>;

    /** WebGPU context (canvas + swap-chain) for this engine. */
    public context: Context3D;

    // Per-instance subsystems
    public entityCollect: EntityCollect;
    public componentCollect: ComponentCollect;
    public globalBindGroup: GlobalBindGroup;
    public rtResourceMap: RTResourceMap;
    public shadowLightsCollect: ShadowLightsCollect;

    /**
     * Per-engine G-buffer frame cache.
     * Keyed by the same logical names used by GBufferFrame.colorPass_GBuffer etc.
     */
    public gBufferMap: Map<string, GBufferFrame> = new Map();

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _engineTime: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /**
     * Per-instance engine settings.  Initialized with sensible defaults; pass
     * overrides via the `engineSetting` parameter of `init()`.
     */
    public setting: EngineSetting = {
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

    // ================================================================
    // Instance getters / setters
    // ================================================================

    /** Current frame rate cap for this engine instance. */
    public get frameRate(): number {
        return this._frameRate;
    }

    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    public get size(): number[] {
        return this.context.presentationSize;
    }

    public get aspect(): number {
        return this.context.aspect;
    }

    public get width(): number {
        return this.context.windowWidth;
    }

    public get height(): number {
        return this.context.windowHeight;
    }

    // ================================================================
    // Static backward-compat accessors  (delegate to _active)
    // ================================================================

    public static get res(): Res { return Engine3D._active?.res; }
    public static set res(v: Res) { if (Engine3D._active) Engine3D._active.res = v; }

    public static get inputSystem(): InputSystem { return Engine3D._active?.inputSystem; }

    public static get views(): View3D[] { return Engine3D._active?.views; }

    /** @deprecated Use engine.setting on a specific Engine3D instance instead. */
    public static get setting(): EngineSetting { return Engine3D._active?.setting; }
    public static set setting(v: EngineSetting) { if (Engine3D._active) Engine3D._active.setting = v; }

    public static get size(): number[] { return Engine3D._active?.size; }
    public static get aspect(): number { return Engine3D._active?.aspect ?? 1; }
    public static get width(): number { return Engine3D._active?.width ?? 0; }
    public static get height(): number { return Engine3D._active?.height ?? 0; }

    public static get frameRate(): number { return Engine3D._active?.frameRate ?? 360; }
    public static set frameRate(v: number) { if (Engine3D._active) Engine3D._active.frameRate = v; }

    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._active?.renderJobs; }

    // ================================================================
    // Instance init
    // ================================================================

    /**
     * Initialize this Engine3D instance.
     * Creates a dedicated WebGPU context for the provided canvas (or auto-creates
     * one), then sets up all per-instance subsystems.
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

        // Mark this as the active engine so subsystems can resolve it
        Engine3D._active = this;
        engineRef.active = this;

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // WASM matrix library is a singleton: only initialize once per page
        if (!Engine3D._wasmInited) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            Engine3D._wasmInited = true;
        }

        // Create per-instance WebGPU context (shares adapter+device, own canvas)
        this.context = new Context3D();
        setWebGPUContext(this.context);
        await this.context.init(descriptor.canvasConfig);

        // Pre-compute reflection GBuffer dimensions
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Init per-instance subsystems in dependency order
        this.rtResourceMap = new RTResourceMap();

        GBufferFrame._getGBufferFrame(
            this,
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // Shaders are GPU-device-independent WGSL strings; safe to share across instances
        ShaderLib.init();
        // Compiled shader modules are device-specific but the device is shared, so share the pool
        ShaderUtil.init();

        this.globalBindGroup = new GlobalBindGroup();
        this.globalBindGroup._init();

        this.shadowLightsCollect = new ShadowLightsCollect();

        this.entityCollect = new EntityCollect();

        this.componentCollect = new ComponentCollect();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);
    }

    // ================================================================
    // Static backward-compat init (single-engine usage)
    // ================================================================

    /**
     * Convenience static initializer for single-engine applications.
     * Creates a new Engine3D instance, calls init(), sets Engine3D._active, and
     * returns the instance.  Existing single-engine code that calls
     * `await Engine3D.init({...})` continues to work without modification.
     */
    // @ts-ignore – static and instance 'init' coexist intentionally
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

    // ================================================================
    // Render management (instance)
    // ================================================================

    private _startRenderJob(view: View3D): RendererJob {
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
     * Attach a view to this engine and start rendering.
     */
    public startRenderView(view: View3D): RendererJob {
        view.engine = this;
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Attach multiple views to this engine and start rendering.
     */
    public startRenderViews(views: View3D[]) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            views[i].engine = this;
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the RendererJob for a given view owned by this engine.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause rendering for this engine instance.
     */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume rendering for this engine instance.
     */
    public resume() {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    // ================================================================
    // Static backward-compat render management
    // ================================================================

    // @ts-ignore – static and instance 'startRenderView' coexist intentionally
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._active?.startRenderView(view);
    }

    // @ts-ignore
    public static startRenderViews(views: View3D[]) {
        Engine3D._active?.startRenderViews(views);
    }

    // @ts-ignore
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._active?.getRenderJob(view);
    }

    // @ts-ignore
    public static pause() {
        Engine3D._active?.pause();
    }

    // @ts-ignore
    public static resume() {
        Engine3D._active?.resume();
    }

    // ================================================================
    // Frame render loop (private)
    // ================================================================

    private async _render(time: number) {
        if (this._frameRateValue > 0) {
            let delta = time - this._engineTime;
            if (delta < this._frameRateValue) {
                const t = performance.now();
                await new Promise(res => {
                    setTimeout(() => {
                        time += (performance.now() - t);
                        res(true);
                    }, this._frameRateValue - delta);
                });
            }
            this._engineTime = time;
        }
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number) {
        // Activate this engine for the duration of the frame so that all static
        // subsystem accessors route to our per-instance collections.
        Engine3D._active = this;
        engineRef.active = this;
        setWebGPUContext(this.context);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
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

        let globalMatrixBindGroup = this.globalBindGroup.modelMatrixBindGroup;
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
}
