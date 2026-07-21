import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveWebGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { ViewQuad } from './core/ViewQuad';
import { RenderTexture } from './textures/RenderTexture';

/**
 * Orillusion 3D Engine — supports multiple concurrent instances.
 *
 * **Single-instance (legacy / backward-compatible):**
 * ```ts
 * await Engine3D.init({ canvasConfig: { canvas } });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-instance:**
 * ```ts
 * const engine1 = new Engine3D();
 * await engine1.init({ canvasConfig: { canvas: canvas1 } });
 * engine1.startRenderView(view1);
 *
 * const engine2 = new Engine3D();
 * await engine2.init({ canvasConfig: { canvas: canvas2 } });
 * engine2.startRenderView(view2);
 * ```
 * @group engine3D
 */
export class Engine3D {

    // ─────────────────── Static registry ───────────────────

    /** All active Engine3D instances. */
    public static readonly instances: Engine3D[] = [];

    /** Default instance — set by the static Engine3D.init() for backward compat. */
    private static _default: Engine3D | null = null;

    /**
     * Pre-init settings object so that code that sets
     * `Engine3D.setting.xxx` before calling `Engine3D.init()` still works.
     */
    private static _preinitSetting: EngineSetting = Engine3D._buildDefaultSetting();

    /** True once WasmMatrix, ShaderLib, ShaderUtil, ShadowLightsCollect have been initialised. */
    private static _globalInitialized: boolean = false;

    // ─────────────────── Instance properties ───────────────────

    /** WebGPU context (canvas + device) for this engine instance. */
    public context3D: Context3D;

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine instance. */
    public inputSystem: InputSystem;

    /** Views managed by this engine instance. */
    public views: View3D[];

    /** Engine settings for this instance. */
    public setting: EngineSetting;

    /** Render jobs keyed by View3D for this instance. */
    public renderJobs: Map<View3D, RendererJob>;

    // Per-engine render-texture maps — swapped into RTResourceMap / GBufferFrame
    // static slots via activate() so all subsystems use the right resources.
    private _rtTextureMap: Map<string, RenderTexture>;
    private _rtViewQuad: Map<string, ViewQuad>;
    private _gBufferMap: Map<string, GBufferFrame>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ─────────────────── Instance getters ───────────────────

    /** Frame rate target for this engine instance (fps). */
    public get frameRate(): number {
        return this._frameRate;
    }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    public get size(): number[] { return this.context3D?.presentationSize; }
    public get aspect(): number { return this.context3D?.aspect; }
    public get width(): number { return this.context3D?.windowWidth; }
    public get height(): number { return this.context3D?.windowHeight; }

    // ─────────────────── Static backward-compat properties ───────────────────
    // These delegate to the default (first) engine instance so existing code
    // that accesses Engine3D.setting, Engine3D.res, etc. continues to work.

    public static get res(): Res { return Engine3D._default?.res; }
    public static set res(v: Res) { if (Engine3D._default) Engine3D._default.res = v; }

    public static get inputSystem(): InputSystem { return Engine3D._default?.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D._default) Engine3D._default.inputSystem = v; }

    public static get views(): View3D[] { return Engine3D._default?.views; }
    public static set views(v: View3D[]) { if (Engine3D._default) Engine3D._default.views = v; }

    /**
     * Engine settings.
     * Before Engine3D.init() is called this returns a pre-init settings object
     * so that `Engine3D.setting.xxx = value` patterns still work.
     */
    public static get setting(): EngineSetting {
        return Engine3D._default?.setting ?? Engine3D._preinitSetting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D._default) {
            Engine3D._default.setting = v;
        } else {
            Engine3D._preinitSetting = v;
        }
    }

    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._default?.renderJobs; }

    /** @deprecated Use an Engine3D instance's `frameRate` property instead. */
    public static get frameRate(): number { return Engine3D._default?._frameRate ?? 360; }
    public static set frameRate(v: number) { if (Engine3D._default) Engine3D._default.frameRate = v; }

    public static get size(): number[] { return Engine3D._default?.size; }
    public static get aspect(): number { return Engine3D._default?.aspect; }
    public static get width(): number { return Engine3D._default?.width; }
    public static get height(): number { return Engine3D._default?.height; }

    // ─────────────────── Static backward-compat methods ───────────────────

    /**
     * Initialise the engine with a single default instance.
     * For backward compatibility with the old all-static API.
     * Returns the created Engine3D instance.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        Engine3D._default = engine;
        await engine.init(descriptor);
    }

    /** @see Engine3D.prototype.startRenderView */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._default.startRenderView(view);
    }

    /** @see Engine3D.prototype.startRenderViews */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._default.startRenderViews(views);
    }

    /** @see Engine3D.prototype.getRenderJob */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._default?.getRenderJob(view);
    }

    /** @see Engine3D.prototype.pause */
    public static pause(): void {
        Engine3D._default?.pause();
    }

    /** @see Engine3D.prototype.resume */
    public static resume(): void {
        Engine3D._default?.resume();
    }

    // ─────────────────── Instance methods ───────────────────

    /**
     * Initialise this engine instance.
     *
     * @param descriptor.canvasConfig     Canvas / WebGPU configuration.
     * @param descriptor.beforeRender     Callback invoked at the start of each frame.
     * @param descriptor.renderLoop       Callback invoked after component updates.
     * @param descriptor.lateRender       Callback invoked after render jobs complete.
     * @param descriptor.engineSetting    Override default engine settings.
     * @param descriptor.sharedEngine     Reuse the WebGPU adapter and device from
     *                                    another Engine3D instance.  When omitted the
     *                                    second and subsequent engines automatically
     *                                    share the device with the first engine.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
        sharedEngine?: Engine3D;
    } = {}): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Merge supplied settings over the pre-init (or default) settings.
        const baseSettings = Engine3D._default === this
            ? Engine3D._preinitSetting
            : Engine3D._buildDefaultSetting();
        this.setting = { ...baseSettings, ...descriptor.engineSetting };

        // Register this instance
        if (!Engine3D.instances.includes(this)) {
            Engine3D.instances.push(this);
        }

        // WasmMatrix is a global WASM module — only initialise it once.
        if (!Engine3D._globalInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // Create this instance's WebGPU context.
        // When a sharedEngine is given (or there is already a first engine), reuse
        // the same GPUAdapter and GPUDevice so resources are compatible.
        this.context3D = new Context3D();
        const donor: Engine3D | undefined =
            descriptor.sharedEngine ??
            (Engine3D.instances.length > 1 ? Engine3D.instances[0] : undefined);

        if (donor && donor !== this && donor.context3D?.device) {
            await this.context3D.init(
                descriptor.canvasConfig,
                donor.context3D.adapter,
                donor.context3D.device,
            );
        } else {
            await this.context3D.init(descriptor.canvasConfig);
        }

        // Create per-engine render-resource maps.
        this._rtTextureMap = new Map();
        this._rtViewQuad = new Map();
        this._gBufferMap = new Map();

        // Activate this engine so subsystem inits below use our context/maps.
        this.activate();

        // Compute reflection GBuffer dimensions.
        this.setting.reflectionSetting.width =
            this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Create the reflection GBuffer frame for this engine.
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false,
        );

        // These singletons are device-independent and need to run only once.
        if (!Engine3D._globalInitialized) {
            Engine3D._globalInitialized = true;
            ShaderLib.init();
            ShaderUtil.init();
            ShadowLightsCollect.init();
        }

        // GlobalBindGroup is idempotent — safe to call per engine (shared device).
        GlobalBindGroup.init();

        // Clear this engine's render-texture map (activated above).
        RTResourceMap.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context3D.canvas);
    }

    /**
     * Make this engine instance the active rendering context.
     *
     * Swaps the module-level `webGPUContext` reference and the static
     * RTResourceMap / GBufferFrame maps to point to this instance's own
     * per-engine objects.  Because JavaScript is single-threaded, this is
     * safe to call immediately before each render frame.
     */
    public activate(): void {
        setActiveWebGPUContext(this.context3D);
        RTResourceMap.rtTextureMap = this._rtTextureMap;
        RTResourceMap.rtViewQuad = this._rtViewQuad;
        GBufferFrame.gBufferMap = this._gBufferMap;
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

    /**
     * Set a single render view and start the render loop for this instance.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop for this instance.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the RendererJob associated with a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
    }

    /**
     * Pause this engine instance's render loop.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume this engine instance's render loop.
     */
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
        // Activate this engine's resource context before touching any subsystem.
        this.activate();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.context3D.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        // Before-update — only iterate this engine's views to avoid
        // cross-instance component updates when multiple engines are running.
        for (const view of views) {
            const viewMap = ComponentCollect.componentsBeforeUpdateList?.get(view);
            if (viewMap) {
                for (const [component, fn] of viewMap) {
                    if (component.enable) fn(view);
                }
            }
        }

        let command = this.context3D.device.createCommandEncoder();
        for (const view of views) {
            const viewMap = ComponentCollect.componentsComputeList?.get(view);
            if (viewMap) {
                for (const [component, fn] of viewMap) {
                    if (component.enable) fn(view, command);
                }
            }
        }
        this.context3D.device.queue.submit([command.finish()]);

        for (const view of views) {
            const viewMap = ComponentCollect.componentsUpdateList?.get(view);
            if (viewMap) {
                for (const [component, fn] of viewMap) {
                    if (component.enable) fn(view);
                }
            }
        }

        for (const view of views) {
            const viewMap = ComponentCollect.graphicComponent?.get(view);
            if (viewMap) {
                for (const [component, fn] of viewMap) {
                    if (view && component.enable) fn(view);
                }
            }
        }

        if (this._renderLoop) await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const view of views) {
            const viewMap = ComponentCollect.componentsLateUpdateList?.get(view);
            if (viewMap) {
                for (const [component, fn] of viewMap) {
                    if (component.enable) fn(view);
                }
            }
        }

        if (this._lateRender) await this._lateRender();
    }

    // ─────────────────── Private helpers ───────────────────

    private static _buildDefaultSetting(): EngineSetting {
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
