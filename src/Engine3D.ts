import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveGPUContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
 * Orillusion 3D Engine — supports multiple simultaneous instances.
 *
 * Create a new instance per canvas:
 * ```ts
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas: myCanvas } });
 * engine.startRenderView(view);
 * ```
 *
 * Static getters (e.g. `Engine3D.setting`) remain available as backward-compatible
 * aliases that delegate to the currently active engine instance.
 *
 * @group engine3D
 */
export class Engine3D {

    // ── Static registry ──────────────────────────────────────────────────────

    /**
     * The Engine3D instance that is currently executing a render frame.
     * Updated automatically at the start of each render frame.
     */
    public static active: Engine3D;

    private static _instanceCount: number = 0;

    // ── Instance state ────────────────────────────────────────────────────────

    /**
     * Per-engine unique identifier used to namespace GPU resources.
     */
    public readonly engineId: string;

    /**
     * Per-engine WebGPU canvas context. Shares the GPU device with all other
     * Engine3D instances but has its own canvas element and swap chain.
     */
    public context: Context3D;

    /**
     * Resource manager for this engine instance.
     */
    public res: Res;

    /**
     * Input system for this engine instance.
     */
    public inputSystem: InputSystem;

    /**
     * Active views managed by this engine instance.
     */
    public views: View3D[];

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * Per-instance engine settings.
     */
    public setting: EngineSetting;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.engineId = `engine_${Engine3D._instanceCount++}`;
        this.context = new Context3D();
        this.setting = makeDefaultSetting();
    }

    // ── Per-instance getters ──────────────────────────────────────────────────

    /**
     * Set render frame rate (24/30/60/114/120/144/240/360 fps or other).
     */
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

    /**
     * Canvas size [width, height] for this engine instance.
     */
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

    // ── Backward-compatible static getters ────────────────────────────────────
    // These delegate to the currently active engine so that the many files
    // that use the old `Engine3D.setting`, `Engine3D.res`, etc. API continue to work.

    /**
     * @deprecated Access via an Engine3D instance instead.
     */
    public static get setting(): EngineSetting {
        return Engine3D.active?.setting;
    }

    public static set setting(value: EngineSetting) {
        if (Engine3D.active) Engine3D.active.setting = value;
    }

    /**
     * @deprecated Access via an Engine3D instance instead.
     */
    public static get res(): Res {
        return Engine3D.active?.res;
    }

    public static set res(value: Res) {
        if (Engine3D.active) Engine3D.active.res = value;
    }

    /**
     * @deprecated Access via an Engine3D instance instead.
     */
    public static get inputSystem(): InputSystem {
        return Engine3D.active?.inputSystem;
    }

    public static set inputSystem(value: InputSystem) {
        if (Engine3D.active) Engine3D.active.inputSystem = value;
    }

    /**
     * @deprecated Access via an Engine3D instance instead.
     */
    public static get views(): View3D[] {
        return Engine3D.active?.views;
    }

    public static set views(value: View3D[]) {
        if (Engine3D.active) Engine3D.active.views = value;
    }

    /**
     * @deprecated Access via an Engine3D instance instead.
     */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D.active?.renderJobs;
    }

    public static set renderJobs(value: Map<View3D, RendererJob>) {
        if (Engine3D.active) Engine3D.active.renderJobs = value;
    }

    /**
     * @deprecated Access via an Engine3D instance instead.
     */
    public static get frameRate(): number {
        return Engine3D.active?._frameRate ?? 360;
    }

    public static set frameRate(value: number) {
        if (Engine3D.active) Engine3D.active.frameRate = value;
    }

    /** Canvas size [width, height] of the active engine. */
    public static get size(): number[] {
        return webGPUContext.presentationSize;
    }

    public static get aspect(): number {
        return webGPUContext.aspect;
    }

    public static get width(): number {
        return webGPUContext.windowWidth;
    }

    public static get height(): number {
        return webGPUContext.windowHeight;
    }

    // ── Initialization ────────────────────────────────────────────────────────

    /**
     * Initialize this engine instance on the given canvas.
     * Multiple Engine3D instances share a single GPU device but each has its own canvas.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // Make this engine active early so subsystems (e.g. WasmMatrix) can
        // read Engine3D.setting during their own initialization.
        Engine3D.active = this;

        // Initialize per-engine resource maps (namespaced by engineId).
        RTResourceMap.init(this.engineId);
        GBufferFrame.init(this.engineId);

        // WasmMatrix is a shared WASM binary — initialize only once.
        if (!WasmMatrix.wasm) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // Initialize this engine's canvas context (creates shared GPU device on first call).
        await this.context.init(descriptor.canvasConfig);

        // Point the global webGPUContext live binding at this engine's canvas context.
        setActiveGPUContext(this.context);

        //****pre compute reflection setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );
        //****pre compute reflection setting****/

        // Shared subsystems — each guards against double-initialization.
        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        ShadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);
        return;
    }

    // ── Render views ──────────────────────────────────────────────────────────

    private startRenderJob(view: View3D): RendererJob {
        view.engine = this;
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
     * Assign a single view to this engine and start rendering.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Assign multiple views to this engine and start rendering.
     */
    public startRenderViews(views: View3D[]) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this.startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the render job for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    // ── Render loop ───────────────────────────────────────────────────────────

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
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
    }

    private async render(time: number) {
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

    private async updateFrame(time: number) {
        // Activate this engine's context so all subsystems see the correct canvas/device.
        Engine3D.active = this;
        setActiveGPUContext(this.context);
        RTResourceMap.switchTo(this.engineId);
        GBufferFrame.switchTo(this.engineId);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        /* update all transform */
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

        /****** auto before update with component list *****/
        for (const iterator of ComponentCollect.componentsBeforeUpdateList) {
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

        let command = this.context.device.createCommandEncoder();
        for (const iterator of ComponentCollect.componentsComputeList) {
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

        this.context.device.queue.submit([command.finish()]);

        /****** auto update with component list *****/
        for (const iterator of ComponentCollect.componentsUpdateList) {
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

        for (const iterator of ComponentCollect.graphicComponent) {
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
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        /****** auto late update with component list *****/
        for (const iterator of ComponentCollect.componentsLateUpdateList) {
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

    // ── Static convenience methods (backward compat) ──────────────────────────

    /**
     * @deprecated Create an Engine3D instance and call instance.init() instead.
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

    /**
     * @deprecated Use engine instance method instead.
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D.active?.startRenderView(view);
    }

    /**
     * @deprecated Use engine instance method instead.
     */
    public static startRenderViews(views: View3D[]) {
        Engine3D.active?.startRenderViews(views);
    }

    /**
     * @deprecated Use engine instance method instead.
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.active?.getRenderJob(view);
    }

    /**
     * @deprecated Use engine instance method instead.
     */
    public static pause() {
        Engine3D.active?.pause();
    }

    /**
     * @deprecated Use engine instance method instead.
     */
    public static resume() {
        Engine3D.active?.resume();
    }
}
