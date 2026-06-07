import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setGlobalWebGPUContext } from './gfx/graphics/webGpu/Context3D';
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

/**
 * Orillusion 3D Engine — supports multiple independent instances.
 *
 * **Single-instance (legacy) usage** — unchanged:
 * ```ts
 * await Engine3D.init();
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-instance usage**:
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

    // ─── primary-instance tracking ────────────────────────────────────────────
    /** The first Engine3D that was initialised — used by the static backward-compat API. */
    private static _primaryInstance: Engine3D | null = null;

    /**
     * The engine instance that is currently executing its render frame.
     * Set to `this` at the start of each frame and restored afterwards.
     * Consumed internally by GBufferFrame / RTResourceMap to scope GPU resources.
     * @internal
     */
    public static _currentEngine: Engine3D | null = null;

    // ─── per-instance state ───────────────────────────────────────────────────
    /** Unique string identifier for this engine instance (used to namespace GPU resources). */
    public readonly id: string = Math.random().toString(36).slice(2);

    /** WebGPU context owned by this engine instance. */
    public webGPUContext: Context3D;

    /** Entity collector owned by this engine instance. */
    public entityCollect: EntityCollect;

    /** Runtime render-texture registry for this engine. */
    public rtResourceMap: RTResourceMap;

    private _res: Res;
    private _inputSystem: InputSystem;
    private _views: View3D[];
    private _renderJobs: Map<View3D, RendererJob>;
    private _setting: EngineSetting;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this._setting = Engine3D.createDefaultSetting();
    }

    // ─── instance accessors ───────────────────────────────────────────────────

    public get res(): Res { return this._res; }
    public set res(v: Res) { this._res = v; }

    public get inputSystem(): InputSystem { return this._inputSystem; }

    public get views(): View3D[] { return this._views; }
    public set views(v: View3D[]) { this._views = v; }

    public get renderJobs(): Map<View3D, RendererJob> { return this._renderJobs; }

    public get setting(): EngineSetting { return this._setting; }
    public set setting(v: EngineSetting) { this._setting = v; }

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    public get size(): number[] { return this.webGPUContext.presentationSize; }
    public get aspect(): number { return this.webGPUContext.aspect; }
    public get width(): number { return this.webGPUContext.windowWidth; }
    public get height(): number { return this.webGPUContext.windowHeight; }

    // ─── static backward-compat API ──────────────────────────────────────────

    public static get res(): Res { return Engine3D._primaryInstance?._res; }
    public static set res(v: Res) { if (Engine3D._primaryInstance) Engine3D._primaryInstance._res = v; }

    public static get inputSystem(): InputSystem { return Engine3D._primaryInstance?._inputSystem; }

    public static get views(): View3D[] { return Engine3D._primaryInstance?._views; }
    public static set views(v: View3D[]) { if (Engine3D._primaryInstance) Engine3D._primaryInstance._views = v; }

    /** @internal */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._primaryInstance?._renderJobs; }

    public static get setting(): EngineSetting { return Engine3D._primaryInstance?._setting; }
    public static set setting(v: EngineSetting) { if (Engine3D._primaryInstance) Engine3D._primaryInstance._setting = v; }

    /** Set engine render frameRate 24/30/60/114/120/144/240/360 fps. */
    public static get frameRate(): number { return Engine3D._primaryInstance?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (Engine3D._primaryInstance) Engine3D._primaryInstance.frameRate = value; }

    public static get size(): number[] { return Engine3D._primaryInstance?.webGPUContext.presentationSize; }
    public static get aspect(): number { return Engine3D._primaryInstance?.webGPUContext.aspect; }
    public static get width(): number { return Engine3D._primaryInstance?.webGPUContext.windowWidth; }
    public static get height(): number { return Engine3D._primaryInstance?.webGPUContext.windowHeight; }

    // ─── instance init ────────────────────────────────────────────────────────

    /**
     * Initialise this engine instance.
     * The first engine initialised becomes the *primary* instance and powers
     * the static backward-compat API.
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

        this._setting = { ...this._setting, ...descriptor.engineSetting };

        // First engine becomes the primary
        if (!Engine3D._primaryInstance) {
            Engine3D._primaryInstance = this;
        }

        await WasmMatrix.init(Matrix4.allocCount, this._setting.doublePrecision);

        // Each engine gets its own WebGPU context
        this.webGPUContext = new Context3D();
        await this.webGPUContext.init(descriptor.canvasConfig);

        // Primary engine drives the module-level webGPUContext export used by
        // the many GPU-utility files that were written before multi-instance support.
        if (Engine3D._primaryInstance === this) {
            setGlobalWebGPUContext(this.webGPUContext);
        }

        // Per-instance resource managers
        this.entityCollect = new EntityCollect();
        this.rtResourceMap = new RTResourceMap();

        // Register with EntityCollect so that EntityCollect.instance resolves correctly.
        if (Engine3D._primaryInstance === this) {
            EntityCollect.setPrimary(this.entityCollect);
        }

        //****pre compute reflection setting****/
        this._setting.reflectionSetting.width = this._setting.reflectionSetting.reflectionProbeSize * 6;
        this._setting.reflectionSetting.height =
            this._setting.reflectionSetting.reflectionProbeSize *
            this._setting.reflectionSetting.reflectionProbeMaxCount;

        Engine3D._currentEngine = this;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this._setting.reflectionSetting.width,
            this._setting.reflectionSetting.height,
            false
        );
        Engine3D._currentEngine = null;
        //****pre compute reflection setting****/

        // ShaderLib, ShaderUtil, GlobalBindGroup, ShadowLightsCollect are still
        // global/static — safe to call multiple times (they guard with _init flags
        // or simply reinitialise their maps which is harmless).
        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        ShadowLightsCollect.init();

        this._res = new Res();
        this._res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this._inputSystem = new InputSystem();
        this._inputSystem.initCanvas(this.webGPUContext.canvas);
    }

    // ─── static backward-compat init ─────────────────────────────────────────

    /**
     * Static convenience entry-point (backward compatible).
     * Creates and initialises the primary Engine3D instance.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        return engine.init(descriptor);
    }

    // ─── render view management ───────────────────────────────────────────────

    private startRenderJobInternal(view: View3D): RendererJob {
        // Associate view with this engine instance
        view.engine = this;

        let renderJob = new ForwardRenderJob(view);
        this._renderJobs.set(view, renderJob);

        if (this._setting.pick.mode === `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this._setting.pick.mode === `pixel` || this._setting.pick.mode === `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    /** Set render view and start the renderer for this engine instance. */
    public startRenderView(view: View3D): RendererJob {
        this._renderJobs ||= new Map<View3D, RendererJob>();
        this._views = [view];
        const renderJob = this.startRenderJobInternal(view);
        this.resume();
        return renderJob;
    }

    /** Set multiple render views and start the renderer for this engine instance. */
    public startRenderViews(views: View3D[]): void {
        this._renderJobs ||= new Map<View3D, RendererJob>();
        this._views = views;
        for (let i = 0; i < views.length; i++) {
            this.startRenderJobInternal(views[i]);
        }
        this.resume();
    }

    /** Get the RendererJob associated with a view in this engine. */
    public getRenderJob(view: View3D): RendererJob {
        return this._renderJobs?.get(view);
    }

    // ─── static backward-compat render view management ───────────────────────

    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._primaryInstance.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        Engine3D._primaryInstance.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._primaryInstance?.getRenderJob(view);
    }

    // ─── pause / resume ───────────────────────────────────────────────────────

    /** Pause the render loop for this engine instance. */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume the render loop for this engine instance. */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
        }
    }

    public static pause(): void { Engine3D._primaryInstance?.pause(); }
    public static resume(): void { Engine3D._primaryInstance?.resume(); }

    // ─── render loop ──────────────────────────────────────────────────────────

    private async render(time: number): Promise<void> {
        if (this._frameRateValue > 0) {
            const delta = time - this._time;
            if (delta < this._frameRateValue) {
                const t = performance.now();
                await new Promise<void>((res) => {
                    setTimeout(() => {
                        time += performance.now() - t;
                        res();
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
        // Mark this engine as the currently-active one so that GPU-resource
        // helpers (GBufferFrame, RTResourceMap, EntityCollect) can scope their
        // data correctly for multi-instance support.
        Engine3D._currentEngine = this;
        EntityCollect.setCurrent(this.entityCollect);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this._views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this.webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        // ── component lifecycle — scoped to THIS engine's views ──────────────

        for (const view of views) {
            const map = ComponentCollect.componentsBeforeUpdateList?.get(view);
            if (map) {
                for (const [f, c] of map) {
                    if (f.enable) c(view);
                }
            }
        }

        const command = this.webGPUContext.device.createCommandEncoder();
        for (const view of views) {
            const map = ComponentCollect.componentsComputeList?.get(view);
            if (map) {
                for (const [f, c] of map) {
                    if (f.enable) c(view, command);
                }
            }
        }
        this.webGPUContext.device.queue.submit([command.finish()]);

        for (const view of views) {
            const map = ComponentCollect.componentsUpdateList?.get(view);
            if (map) {
                for (const [f, c] of map) {
                    if (f.enable) c(view);
                }
            }
        }

        for (const view of views) {
            const map = ComponentCollect.graphicComponent?.get(view);
            if (map) {
                for (const [f, c] of map) {
                    if (f.enable) c(view);
                }
            }
        }

        if (this._renderLoop) await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);

        // Flush world-matrix GPU buffer
        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this._renderJobs.forEach((v) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const view of views) {
            const map = ComponentCollect.componentsLateUpdateList?.get(view);
            if (map) {
                for (const [f, c] of map) {
                    if (f.enable) c(view);
                }
            }
        }

        if (this._lateRender) await this._lateRender();

        Engine3D._currentEngine = null;
        EntityCollect.setCurrent(null);
    }

    // ─── default setting factory ──────────────────────────────────────────────

    /** @internal */
    public static createDefaultSetting(): EngineSetting {
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
                        hdr: 1.0,
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
                        intensity: 0.5,
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
                materialDebug: false,
            },
            loader: {
                numConcurrent: 20,
            },
            reflectionSetting: {
                reflectionProbeMaxCount: 8,
                reflectionProbeSize: 256,
                width: 256 * 6,
                height: 8 * 256,
                enable: true,
            },
        };
    }
}
