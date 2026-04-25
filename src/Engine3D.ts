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
import { MatrixBindGroup } from './gfx/graphics/webGpu/core/bindGroups/MatrixBindGroup';
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
import { EngineContext } from './EngineContext';

/**
 * Orillusion 3D Engine — multi-instance edition.
 *
 * Each `Engine3D` instance has its own WebGPU canvas context, scene/view
 * management, component lifecycle tracking, render targets, and timing.
 *
 * The GPU adapter and device are shared across all instances (expensive to
 * create; created once on first `init()` call).
 *
 * ### Backward compatibility
 * All previously-static properties and methods are still accessible as static
 * members via the `Engine3D.current` active-engine delegate.  Existing code
 * that calls `Engine3D.setting`, `Engine3D.res`, etc. continues to work
 * unchanged as long as at least one engine has been initialised.
 *
 * ### Usage – single engine (unchanged API)
 * ```ts
 * await Engine3D.init({ canvasConfig: { ... } });
 * Engine3D.startRenderView(view);
 * ```
 *
 * ### Usage – multiple engines
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
 * @group engine3D
 */
export class Engine3D {

    // ─── Active-engine tracking ───────────────────────────────────────────────

    /**
     * The engine instance that is currently rendering (or was most recently
     * initialised).  Static methods delegate to this instance.
     */
    public static current: Engine3D = null;

    // ─── Instance properties ──────────────────────────────────────────────────

    /** Per-engine WebGPU canvas context. */
    public context: Context3D;

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system bound to this engine's canvas. */
    public inputSystem: InputSystem;

    /** Active views registered with this engine. */
    public views: View3D[];

    /** Per-engine component lifecycle registry. */
    public componentCollect: ComponentCollect;

    /** Per-engine GPU bind group manager. */
    public globalBindGroup: GlobalBindGroup;

    /** Per-engine shadow light registry. */
    public shadowLightsCollect: ShadowLightsCollect;

    /** Per-engine render-target resource map. */
    public rtResourceMap: RTResourceMap;

    /** Per-engine G-buffer frame cache. */
    public gBufferFrameMap: Map<string, GBufferFrame>;

    /** Render job map (view → renderer). */
    public renderJobs: Map<View3D, RendererJob>;

    /** Engine settings for this instance. */
    public setting: EngineSetting = Engine3D._defaultSetting();

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ─── Backward-compatible static delegates ─────────────────────────────────
    // These forward to Engine3D.current so legacy code (e.g. Engine3D.setting)
    // continues to work without modification.

    /**
     * Pre-initialisation settings store.
     * Allows `Engine3D.setting.shadow.enable = false` BEFORE `Engine3D.init()`
     * is called — the same pattern used in the existing samples.
     * When a new engine is created via the static `init()`, this store is
     * copied into the engine instance as its starting point.
     */
    private static _preInitSetting: EngineSetting = Engine3D._defaultSetting();

    public static get setting(): EngineSetting {
        return Engine3D.current?.setting ?? Engine3D._preInitSetting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D.current) Engine3D.current.setting = v;
        else Engine3D._preInitSetting = v;
    }

    /** Static init — creates one Engine3D instance (legacy single-engine API). */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        const engine = new Engine3D();
        // Inherit any setting mutations made before init() was called.
        engine.setting = { ...Engine3D._preInitSetting };
        Engine3D.current = engine;
        return engine.init(descriptor);
    }

    public static get res(): Res { return Engine3D.current?.res; }
    public static set res(v: Res) { if (Engine3D.current) Engine3D.current.res = v; }

    public static get inputSystem(): InputSystem { return Engine3D.current?.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D.current) Engine3D.current.inputSystem = v; }

    public static get views(): View3D[] { return Engine3D.current?.views; }
    public static set views(v: View3D[]) { if (Engine3D.current) Engine3D.current.views = v; }

    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D.current?.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { if (Engine3D.current) Engine3D.current.renderJobs = v; }

    public static get frameRate(): number { return Engine3D.current?._frameRate ?? 360; }
    public static set frameRate(value: number) { Engine3D.current && (Engine3D.current.frameRate = value); }

    public static get size(): number[] { return Engine3D.current?.size; }
    public static get aspect(): number { return Engine3D.current?.aspect; }
    public static get width(): number { return Engine3D.current?.width; }
    public static get height(): number { return Engine3D.current?.height; }

    public static startRenderView(view: View3D): RendererJob { return Engine3D.current?.startRenderView(view); }
    public static startRenderViews(views: View3D[]) { Engine3D.current?.startRenderViews(views); }
    public static getRenderJob(view: View3D): RendererJob { return Engine3D.current?.getRenderJob(view); }
    public static pause() { Engine3D.current?.pause(); }
    public static resume() { Engine3D.current?.resume(); }

    // ─── Instance frame-rate property ────────────────────────────────────────

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    // ─── Instance size helpers (delegate to own context) ─────────────────────

    public get size(): number[] { return this.context?.presentationSize; }
    public get aspect(): number { return this.context?.aspect; }
    public get width(): number { return this.context?.windowWidth; }
    public get height(): number { return this.context?.windowHeight; }

    // ─── Initialisation ───────────────────────────────────────────────────────

    /**
     * Initialise this engine instance.
     * - Creates (or reuses the shared) GPUDevice.
     * - Sets up per-engine subsystems.
     * - Compiles shared shaders (idempotent — safe to call from multiple engines).
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Merge: existing this.setting (may already contain pre-init mutations
        // copied from _preInitSetting by the static init) + descriptor overrides.
        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // WasmMatrix is a singleton WASM module — only initialise once.
        if (!Engine3D._wasmInitialised) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            Engine3D._wasmInitialised = true;
        }

        // Create per-engine WebGPU context (shares the adapter+device).
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);

        // Make this engine active so subsystems created below see the right context.
        this.activate();

        // Per-engine subsystems.
        this.componentCollect = new ComponentCollect();
        this.globalBindGroup = new GlobalBindGroup();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.rtResourceMap = new RTResourceMap();
        this.gBufferFrameMap = new Map();

        // Shared device-level resource: one matrix bind group for all engines.
        if (!GlobalBindGroup.modelMatrixBindGroup) {
            GlobalBindGroup.modelMatrixBindGroup = new MatrixBindGroup();
        }

        // Pre-compute reflection GBuffer (per engine, uses engine's own maps).
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // Shared shader/pipeline resources — idempotent, safe to call per engine.
        ShaderLib.init();
        ShaderUtil.init();

        // Per-engine asset manager.
        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);
    }

    // ─── Activation ───────────────────────────────────────────────────────────

    /**
     * Make this engine the "current" active engine.
     * Sets EngineContext.current and updates the module-level webGPUContext so
     * all subsystems that import it see this engine's canvas context.
     * Called automatically before every render frame.
     */
    public activate() {
        Engine3D.current = this;
        EngineContext.current = this;
        setWebGPUContext(this.context);
    }

    // ─── Render view management ───────────────────────────────────────────────

    private startRenderJob(view: View3D): RendererJob {
        view.engine = this;
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

    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        const renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    public startRenderViews(views: View3D[]) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this.startRenderJob(views[i]);
        }
        this.resume();
    }

    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    // ─── Render loop ──────────────────────────────────────────────────────────

    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    public resume() {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
        }
    }

    private async render(time: number) {
        // Ensure this engine is the active one before processing its frame.
        this.activate();

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
        await this.updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async updateFrame(time: number) {
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

        if (this._beforeRender)
            await this._beforeRender();

        const cc = this.componentCollect;

        for (const iterator of cc.componentsBeforeUpdateList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        const command = this.context.device.createCommandEncoder();
        for (const iterator of cc.componentsComputeList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k, command);
            }
        }
        this.context.device.queue.submit([command.finish()]);

        for (const iterator of cc.componentsUpdateList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        for (const iterator of cc.graphicComponent) {
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
        GlobalBindGroup.modelMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const iterator of cc.componentsLateUpdateList) {
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

    // ─── Private helpers ──────────────────────────────────────────────────────

    private static _wasmInitialised = false;

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
