import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { EntityCollect } from './gfx/renderJob/collect/EntityCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';

// WasmMatrix is a shared WASM module — initialize only once across all engine instances.
let _wasmInitialized = false;
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';

function makeDefaultSetting(): EngineSetting {
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
 * Orillusion 3D Engine — supports multiple independent instances.
 *
 * Usage (multi-instance):
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
 * Usage (single-instance backward-compat static API):
 * ```ts
 * await Engine3D.init();
 * Engine3D.startRenderView(view);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // ===== INSTANCE STATE =====

    /**
     * Resource manager for this engine instance.
     */
    public res: Res;

    /**
     * Input system for this engine instance.
     */
    public inputSystem: InputSystem;

    /**
     * Active render views for this engine instance.
     */
    public views: View3D[];

    /**
     * Per-canvas WebGPU context for this engine instance.
     */
    public context: Context3D;

    /**
     * Component lifecycle collector for this engine instance.
     */
    public componentCollect: ComponentCollect;

    /**
     * Render entity collector for this engine instance.
     */
    public entityCollect: EntityCollect;

    /**
     * GPU bind group manager for this engine instance.
     */
    public globalBindGroup: GlobalBindGroup;

    /**
     * Shadow-light collector for this engine instance.
     */
    public shadowLightsCollect: ShadowLightsCollect;

    /**
     * Render-target resource map for this engine instance.
     */
    public rtResourceMap: RTResourceMap;

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * Per-instance engine settings.
     */
    public setting: EngineSetting = makeDefaultSetting();

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ===== STATIC REGISTRY & BACKWARD-COMPAT API =====

    /**
     * All active Engine3D instances.
     */
    public static readonly instances: Engine3D[] = [];

    /**
     * The primary (first-created) engine instance.
     * Used by the static backward-compat API.
     * @internal
     */
    private static _primary: Engine3D | null = null;

    // ---- Backward-compat static property accessors ----

    /**
     * @deprecated Create an Engine3D instance instead: `const engine = new Engine3D()`.
     * Resource manager of the primary engine instance.
     */
    public static get res(): Res { return Engine3D._primary?.res; }
    public static set res(v: Res) { if (Engine3D._primary) Engine3D._primary.res = v; }

    /**
     * @deprecated Create an Engine3D instance instead.
     */
    public static get inputSystem(): InputSystem { return Engine3D._primary?.inputSystem; }

    /**
     * @deprecated Create an Engine3D instance instead.
     */
    public static get views(): View3D[] { return Engine3D._primary?.views; }

    /**
     * @deprecated Create an Engine3D instance instead.
     * Engine settings of the primary engine instance.
     */
    public static get setting(): EngineSetting { return Engine3D._primary?.setting; }
    public static set setting(v: EngineSetting) { if (Engine3D._primary) Engine3D._primary.setting = v; }

    /**
     * @deprecated Create an Engine3D instance instead.
     * @internal
     */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._primary?.renderJobs; }

    /**
     * set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
     */
    public get frameRate(): number {
        return this._frameRate;
    }

    /**
     * get engine render frameRate
     */
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) {
            this._frameRateValue = 0;
        }
    }

    /**
     * get render window size width and height
     */
    public get size(): number[] {
        return this.context?.presentationSize ?? webGPUContext.presentationSize;
    }

    /**
     * get render window aspect
     */
    public get aspect(): number {
        return this.context?.aspect ?? webGPUContext.aspect;
    }

    /**
     * get render window size width
     */
    public get width(): number {
        return this.context?.windowWidth ?? webGPUContext.windowWidth;
    }

    /**
     * get render window size height
     */
    public get height(): number {
        return this.context?.windowHeight ?? webGPUContext.windowHeight;
    }

    // ---- Static backward-compat property accessors using primary instance ----

    /** @deprecated Use engine.size */
    public static get size(): number[] { return Engine3D._primary?.size ?? webGPUContext.presentationSize; }
    /** @deprecated Use engine.aspect */
    public static get aspect(): number { return Engine3D._primary?.aspect ?? webGPUContext.aspect; }
    /** @deprecated Use engine.width */
    public static get width(): number { return Engine3D._primary?.width ?? webGPUContext.windowWidth; }
    /** @deprecated Use engine.height */
    public static get height(): number { return Engine3D._primary?.height ?? webGPUContext.windowHeight; }

    /** @deprecated Use engine.frameRate */
    public static get frameRate(): number { return Engine3D._primary?._frameRate ?? 360; }
    public static set frameRate(v: number) { if (Engine3D._primary) Engine3D._primary.frameRate = v; }

    // ===== INSTANCE METHODS =====

    /**
     * Create a new Engine3D instance.
     * Call `await engine.init(...)` to initialize it, then `engine.startRenderView(view)` to start rendering.
     */
    constructor() {
        Engine3D.instances.push(this);
        // First created instance becomes the primary for backward-compat static access.
        if (!Engine3D._primary) {
            Engine3D._primary = this;
        }
    }

    /**
     * Initialize this engine instance: create WebGPU context, subsystems, and resources.
     * @param descriptor  {@link CanvasConfig} and optional lifecycle callbacks
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        if (Engine3D._primary === this) {
            console.log('Engine Version', version);
        }
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // Init WASM matrix library only once (shared across all engine instances)
        if (!_wasmInitialized) {
            _wasmInitialized = true;
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // Create per-instance subsystems
        this.context = new Context3D();
        this.componentCollect = new ComponentCollect();
        this.entityCollect = new EntityCollect();
        this.globalBindGroup = new GlobalBindGroup();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.rtResourceMap = new RTResourceMap();

        // Initialize WebGPU canvas context (shares GPUDevice across instances)
        await this.context.init(descriptor.canvasConfig);

        // Also keep the global webGPUContext in sync for backward compat
        // (first instance sets it; subsequent instances leave it as-is)
        if (Engine3D._primary === this) {
            // Copy shared device/adapter references to the global webGPUContext
            webGPUContext.adapter = this.context.adapter;
            webGPUContext.device = this.context.device;
            webGPUContext.presentationFormat = this.context.presentationFormat;
            // Canvas/size remain per-instance; the global still points to first instance's canvas
            webGPUContext.canvas = this.context.canvas;
            webGPUContext.windowWidth = this.context.windowWidth;
            webGPUContext.windowHeight = this.context.windowHeight;
            webGPUContext.presentationSize = this.context.presentationSize;
            webGPUContext.aspect = this.context.aspect;
        }

        // Compute reflection settings
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // ShaderLib and ShaderUtil are tied to the GPU device — shared across instances.
        ShaderLib.init();
        ShaderUtil.init();

        // Initialize per-engine subsystems
        this.globalBindGroup.init();
        this.rtResourceMap.init();
        this.shadowLightsCollect.init();

        // Register this instance's subsystems as the primary targets for static backward-compat calls
        if (Engine3D._primary === this) {
            GlobalBindGroup._setPrimary(this.globalBindGroup);
            ShadowLightsCollect._setPrimary(this.shadowLightsCollect);
            RTResourceMap._setPrimary(this.rtResourceMap);
        }

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);
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
     * Set render view and start renderer for this engine instance.
     * @param view
     * @returns
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        view.engine = this;
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set render views and start renderer for this engine instance.
     * @param views
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
     * Get view render job instance for this engine.
     * @param view
     * @returns
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
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
    }

    private async _render(time: number) {
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

    private async _updateFrame(time: number) {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const ctx = this.context;

        /* update all transform */
        let views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = ctx.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        /****** auto before update with component list *****/
        for (const iterator of this.componentCollect.componentsBeforeUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                };
            }
        }

        let command = ctx.device.createCommandEncoder();
        for (const iterator of this.componentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k, command);
                };
            }
        }

        ctx.device.queue.submit([command.finish()]);

        /****** auto update with component list *****/
        for (const iterator of this.componentCollect.componentsUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                };
            }
        }

        for (const iterator of this.componentCollect.graphicComponent) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (k && f.enable) {
                    c(k);
                };
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        /****** auto update global matrix share buffer write to gpu *****/
        let globalMatrixBindGroup = this.globalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        /****** auto late update with component list *****/
        for (const iterator of this.componentCollect.componentsLateUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                };
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // ===== STATIC BACKWARD-COMPAT METHODS =====

    /**
     * @deprecated Use `new Engine3D()` then `await engine.init(...)`.
     * Creates and initializes the primary engine instance.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = Engine3D._primary ?? new Engine3D();
        await engine.init(descriptor);
    }

    /**
     * @deprecated Use `engine.startRenderView(view)`.
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._primary?.startRenderView(view);
    }

    /**
     * @deprecated Use `engine.startRenderViews(views)`.
     */
    public static startRenderViews(views: View3D[]) {
        Engine3D._primary?.startRenderViews(views);
    }

    /**
     * @deprecated Use `engine.getRenderJob(view)`.
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._primary?.getRenderJob(view);
    }

    /**
     * @deprecated Use `engine.pause()`.
     */
    public static pause() {
        Engine3D._primary?.pause();
    }

    /**
     * @deprecated Use `engine.resume()`.
     */
    public static resume() {
        Engine3D._primary?.resume();
    }
}
