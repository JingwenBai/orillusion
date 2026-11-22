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
import { EngineContext } from './core/EngineContext';

/**
 * Orillusion 3D Engine
 *
 * Can be used as a singleton (backward-compatible static API) or instantiated
 * multiple times for multi-canvas / multi-instance scenarios:
 *
 * ```ts
 * // Single instance (classic API — unchanged)
 * await Engine3D.init({ canvasConfig: { canvas } });
 * Engine3D.startRenderView(view);
 *
 * // Multiple instances
 * const engine1 = new Engine3D();
 * await engine1.init({ canvasConfig: { canvas: canvas1 } });
 *
 * const engine2 = new Engine3D();
 * await engine2.init({
 *   canvasConfig: { canvas: canvas2 },
 *   sharedDevice: engine1.sharedDeviceInfo,  // reuse GPU device
 * });
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // ── Static registry ─────────────────────────────────────────────────────

    /**
     * All Engine3D instances created so far, in creation order.
     */
    public static readonly instances: Engine3D[] = [];

    // ── Per-instance state ───────────────────────────────────────────────────

    /** WebGPU canvas context for this engine instance */
    public webGPUContext: Context3D;

    /** Per-engine render-texture registry */
    public rtResourceMap: RTResourceMap;

    /** Per-engine GBuffer frame registry (keyed by name string) */
    public gBufferMap: Map<string, GBufferFrame>;

    /** Resource manager */
    public res: Res;

    /** Input system */
    public inputSystem: InputSystem;

    /** Active views */
    public views: View3D[];

    /** Engine setting */
    public setting: EngineSetting;

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        Engine3D.instances.push(this);
        this.setting = Engine3D._defaultSetting();
        this.gBufferMap = new Map<string, GBufferFrame>();
        this.rtResourceMap = new RTResourceMap();
    }

    // ── Static backward-compat accessors ────────────────────────────────────
    // These delegate to the first (or current) engine instance so that
    // existing code using `Engine3D.init(...)` / `Engine3D.setting` etc.
    // continues to work without modification.

    /**
     * The primary (first) Engine3D instance.
     * Used by the static backward-compat API.
     */
    private static get _primary(): Engine3D {
        return Engine3D.instances[0];
    }

    public static get res(): Res { return Engine3D._primary?.res; }
    public static set res(v: Res) { if (Engine3D._primary) Engine3D._primary.res = v; }

    public static get inputSystem(): InputSystem { return Engine3D._primary?.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D._primary) Engine3D._primary.inputSystem = v; }

    public static get views(): View3D[] { return Engine3D._primary?.views; }
    public static set views(v: View3D[]) { if (Engine3D._primary) Engine3D._primary.views = v; }

    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._primary?.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { if (Engine3D._primary) Engine3D._primary.renderJobs = v; }

    public static get setting(): EngineSetting { return Engine3D._primary?.setting ?? Engine3D._defaultSetting(); }
    public static set setting(v: EngineSetting) { if (Engine3D._primary) Engine3D._primary.setting = v; }

    public static get frameRate(): number { return Engine3D._primary?._frameRate ?? 360; }
    public static set frameRate(value: number) {
        if (Engine3D._primary) {
            Engine3D._primary._frameRate = value;
            Engine3D._primary._frameRateValue = value >= 360 ? 0 : 1000 / value;
        }
    }

    public static get size(): number[] { return Engine3D._primary?.webGPUContext?.presentationSize ?? [0, 0]; }
    public static get aspect(): number { return Engine3D._primary?.webGPUContext?.aspect ?? 1; }
    public static get width(): number { return Engine3D._primary?.webGPUContext?.windowWidth ?? 0; }
    public static get height(): number { return Engine3D._primary?.webGPUContext?.windowHeight ?? 0; }

    // ── Instance accessors ────────────────────────────────────────────────────

    get frameRate(): number { return this._frameRate; }
    set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    get size(): number[] { return this.webGPUContext?.presentationSize ?? [0, 0]; }
    get aspect(): number { return this.webGPUContext?.aspect ?? 1; }
    get width(): number { return this.webGPUContext?.windowWidth ?? 0; }
    get height(): number { return this.webGPUContext?.windowHeight ?? 0; }

    /**
     * GPU adapter + device that can be passed to a second Engine3D instance
     * so they share the same GPU device (avoids creating duplicate devices).
     */
    get sharedDeviceInfo(): { adapter: GPUAdapter; device: GPUDevice } | undefined {
        if (!this.webGPUContext) return undefined;
        return { adapter: this.webGPUContext.adapter, device: this.webGPUContext.device };
    }

    // ── Static init / render helpers (backward-compat) ───────────────────────

    /**
     * Create the first Engine3D instance and initialise it.
     * Equivalent to `new Engine3D().init(descriptor)`.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        // Lazily create primary instance
        if (Engine3D.instances.length === 0) {
            new Engine3D();
        }
        await Engine3D._primary.init(descriptor);
    }

    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._primary.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        Engine3D._primary.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._primary?.getRenderJob(view);
    }

    public static pause(): void { Engine3D._primary?.pause(); }
    public static resume(): void { Engine3D._primary?.resume(); }

    // ── Instance methods ──────────────────────────────────────────────────────

    /**
     * Initialise this engine instance.
     * @param descriptor  Configuration including canvas, callbacks and settings.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
        /**
         * Pass `sharedDevice` from an existing engine to reuse its GPU device.
         * Useful for multi-canvas scenarios — avoids creating a second GPU device.
         */
        sharedDevice?: { adapter: GPUAdapter; device: GPUDevice };
    } = {}): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Merge settings
        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // Set this as the current engine so init-time manager calls land here
        EngineContext.current = this;

        // Create per-engine WebGPU context
        this.webGPUContext = new Context3D();
        setActiveWebGPUContext(this.webGPUContext);

        const isFirstEngine = Engine3D.instances[0] === this || !descriptor.sharedDevice;
        if (isFirstEngine) {
            // Only the first engine initialises global-once subsystems
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        await this.webGPUContext.init(descriptor.canvasConfig, descriptor.sharedDevice);

        // Pre-compute reflection buffer size
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

        if (isFirstEngine) {
            ShaderLib.init();
            ShaderUtil.init();
        }

        GlobalBindGroup.init();
        ShadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.webGPUContext.canvas);
    }

    private _startRenderJob(view: View3D): RendererJob {
        view.engine = this;  // let the view find its owner
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
     * Assign a single view and start rendering.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Assign multiple views and start rendering.
     */
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
            let delta = time - this._time;
            if (delta < this._frameRateValue) {
                let t = performance.now();
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
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        // Activate this engine's context for the duration of the frame
        EngineContext.current = this;
        setActiveWebGPUContext(this.webGPUContext);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        // Before-update: iterate only this engine's views
        for (const view of views) {
            const compMap = ComponentCollect.componentsBeforeUpdateList?.get(view);
            if (!compMap) continue;
            for (const [f, c] of compMap) {
                if (f.enable) c(view);
            }
        }

        let command = this.webGPUContext.device.createCommandEncoder();
        for (const view of views) {
            const compMap = ComponentCollect.componentsComputeList?.get(view);
            if (!compMap) continue;
            for (const [f, c] of compMap) {
                if (f.enable) c(view, command);
            }
        }
        this.webGPUContext.device.queue.submit([command.finish()]);

        // Update: iterate only this engine's views
        for (const view of views) {
            const compMap = ComponentCollect.componentsUpdateList?.get(view);
            if (!compMap) continue;
            for (const [f, c] of compMap) {
                if (f.enable) c(view);
            }
        }

        for (const view of views) {
            const compMap = ComponentCollect.graphicComponent?.get(view);
            if (!compMap) continue;
            for (const [f, c] of compMap) {
                if (f && f.enable) c(view);
            }
        }

        if (this._renderLoop)
            await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);

        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        // Late-update: iterate only this engine's views
        for (const view of views) {
            const compMap = ComponentCollect.componentsLateUpdateList?.get(view);
            if (!compMap) continue;
            for (const [f, c] of compMap) {
                if (f.enable) c(view);
            }
        }

        if (this._lateRender)
            await this._lateRender();

        EngineContext.current = null;
    }

    // ── Default settings factory ─────────────────────────────────────────────

    private static _defaultSetting(): EngineSetting {
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
}
