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
import { EngineRegistry } from './util/EngineRegistry';

/** @internal */
let _instanceCounter = 0;

function buildDefaultSetting(): EngineSetting {
    return {
        doublePrecision: false,
        occlusionQuery: { enable: true, debug: false },
        pick: { enable: true, mode: `bound`, detail: `mesh` },
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
                godRay: { blendColor: true, rayMarchCount: 16, scatteringExponent: 5, intensity: 0.5 },
                ssao: { enable: false, radius: 0.15, bias: -0.1, aoPower: 2.0, debug: true },
                outline: {
                    enable: false, strength: 1, groupCount: 4, outlinePixel: 2,
                    fadeOutlinePixel: 4, textureScale: 1, useAddMode: false, debug: true,
                },
                taa: {
                    enable: false, jitterSeedCount: 8, blendFactor: 0.1, sharpFactor: 0.6,
                    sharpPreBlurFactor: 0.5, temporalJitterScale: 0.13, debug: true,
                },
                gtao: {
                    enable: false, darkFactor: 1.0, maxDistance: 5.0, maxPixel: 50.0,
                    rayMarchSegment: 6, multiBounce: false, usePosFloat32: true,
                    blendColor: true, debug: true,
                },
                ssr: {
                    enable: false, pixelRatio: 1, fadeEdgeRatio: 0.2, rayMarchRatio: 0.5,
                    fadeDistanceMin: 600, fadeDistanceMax: 2000, roughnessThreshold: 0.5,
                    powDotRN: 0.2, mixThreshold: 0.1, debug: true,
                },
                fxaa: { enable: false },
                depthOfView: { enable: false, iterationCount: 3, pixelOffset: 1.0, near: 150, far: 300 },
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
            offsetX: 0, offsetY: 0, offsetZ: 0,
            probeSpace: 64,
            probeXCount: 4, probeYCount: 2, probeZCount: 4,
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
        light: { maxLight: 4096 },
        material: { materialChannelDebug: false, materialDebug: false },
        loader: { numConcurrent: 20 },
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
 * **Single-instance (backward compatible):**
 * ```ts
 * await Engine3D.init({ canvasConfig });
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

    // =========================================================
    // Instance state
    // =========================================================

    /** @internal unique id for this engine instance */
    public readonly _engineId: string;

    /** WebGPU context (canvas + device) owned by this instance */
    public context3D: Context3D;

    /** resource manager */
    public res: Res;

    /** input system */
    public inputSystem: InputSystem;

    /** active views */
    public views: View3D[];

    /** render job map (view → job) */
    public renderJobs: Map<View3D, RendererJob>;

    /** per-instance component collect */
    public componentCollect: ComponentCollect;

    /** per-instance shadow lights collect */
    public shadowLightsCollect: ShadowLightsCollect;

    /** per-instance global bind group */
    public globalBindGroup: GlobalBindGroup;

    /** per-instance render texture resource map */
    public rtResourceMap: RTResourceMap;

    /** per-instance GBuffer frame map (populated by GBufferFrame via EngineRegistry) */
    public _gBufferMap: Map<string, any>;

    /** engine settings */
    public setting: EngineSetting;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this._engineId = `engine${_instanceCounter++}`;
        this.setting = buildDefaultSetting();
        this.context3D = new Context3D();
        this.componentCollect = new ComponentCollect();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.globalBindGroup = new GlobalBindGroup();
        this.rtResourceMap = new RTResourceMap();
        this._gBufferMap = new Map();
    }

    // =========================================================
    // Instance getters / setters
    // =========================================================

    public get frameRate(): number { return this._frameRate; }

    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    public get size(): number[] { return this.context3D?.presentationSize ?? [0, 0]; }
    public get aspect(): number { return this.context3D?.aspect ?? 1; }
    public get width(): number { return this.context3D?.windowWidth ?? 0; }
    public get height(): number { return this.context3D?.windowHeight ?? 0; }

    // =========================================================
    // Instance methods
    // =========================================================

    /**
     * Initialise this engine instance.  Creates its own WebGPU context and
     * registers the instance as the active engine for all singleton facades.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {

        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // Register this instance as the active one so init-time singleton
        // facades (RTResourceMap, GBufferFrame, GlobalBindGroup …) route here.
        EngineRegistry.setActive(this);
        setActiveWebGPUContext(this.context3D);

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        await this.context3D.init(descriptor.canvasConfig);

        // Reflect any canvas-size-dependent settings
        this.setting.reflectionSetting.width =
            this.setting.reflectionSetting.reflectionProbeSize * 6;
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
        this.inputSystem.initCanvas(this.context3D.canvas);
    }

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
     * Attach a single view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        EngineRegistry.registerView(view, this);
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Attach multiple views and start the render loop.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            EngineRegistry.registerView(views[i], this);
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

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
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        // Switch all singleton facades to this engine for this frame.
        EngineRegistry.setActive(this);
        setActiveWebGPUContext(this.context3D);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this.context3D.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        // --- before-update components (filtered to this engine's views) ---
        for (const [view, compMap] of this.componentCollect.componentsBeforeUpdateList) {
            if (!this.views.includes(view)) continue;
            for (const [f, c] of compMap) {
                if (f.enable) c(view);
            }
        }

        const command = this.context3D.device.createCommandEncoder();
        for (const [view, compMap] of this.componentCollect.componentsComputeList) {
            if (!this.views.includes(view)) continue;
            for (const [f, c] of compMap) {
                if (f.enable) c(view, command);
            }
        }
        this.context3D.device.queue.submit([command.finish()]);

        // --- update components ---
        for (const [view, compMap] of this.componentCollect.componentsUpdateList) {
            if (!this.views.includes(view)) continue;
            for (const [f, c] of compMap) {
                if (f.enable) c(view);
            }
        }

        // --- graphic components ---
        for (const [view, compMap] of this.componentCollect.graphicComponent) {
            if (!this.views.includes(view)) continue;
            for (const [f, c] of compMap) {
                if (view && f.enable) c(view);
            }
        }

        if (this._renderLoop) await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);

        const globalMatrixBindGroup = this.globalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        // --- late-update components ---
        for (const [view, compMap] of this.componentCollect.componentsLateUpdateList) {
            if (!this.views.includes(view)) continue;
            for (const [f, c] of compMap) {
                if (f.enable) c(view);
            }
        }

        if (this._lateRender) await this._lateRender();
    }

    // =========================================================
    // Static backward-compatibility layer
    // =========================================================

    /** @internal default single-instance for the static API */
    private static _default: Engine3D;

    /**
     * Get or lazily create the default engine instance used by the static API.
     * @internal
     */
    private static _getDefault(): Engine3D {
        if (!Engine3D._default) Engine3D._default = new Engine3D();
        return Engine3D._default;
    }

    // --- Static property forwarding ---

    public static get res(): Res {
        const active = EngineRegistry.active as Engine3D | null;
        return active?.res ?? Engine3D._default?.res;
    }
    public static set res(v: Res) {
        const active = EngineRegistry.active as Engine3D | null;
        const target = active ?? Engine3D._default;
        if (target) target.res = v;
    }

    public static get inputSystem(): InputSystem { return Engine3D._default?.inputSystem; }

    public static get views(): View3D[] { return Engine3D._default?.views; }

    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._default?.renderJobs; }

    public static get setting(): EngineSetting {
        // During rendering EngineRegistry.active is the executing engine.
        const active = EngineRegistry.active as Engine3D | null;
        return active?.setting ?? Engine3D._default?.setting ?? buildDefaultSetting();
    }
    public static set setting(v: EngineSetting) {
        const active = EngineRegistry.active as Engine3D | null;
        const target = active ?? Engine3D._default;
        if (target) target.setting = v;
    }

    public static get frameRate(): number { return Engine3D._default?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (Engine3D._default) Engine3D._default.frameRate = value; }

    public static get size(): number[] { return Engine3D._default?.size ?? [0, 0]; }
    public static get aspect(): number { return Engine3D._default?.aspect ?? 1; }
    public static get width(): number { return Engine3D._default?.width ?? 0; }
    public static get height(): number { return Engine3D._default?.height ?? 0; }

    // --- Static method forwarding ---

    /**
     * Initialise the default engine instance (single-instance backward-compat API).
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        console.log('Engine Version', version);
        Engine3D._default = new Engine3D();
        return Engine3D._default.init(descriptor);
    }

    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._getDefault().startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        Engine3D._getDefault().startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._getDefault().getRenderJob(view);
    }

    public static pause(): void { Engine3D._default?.pause(); }
    public static resume(): void { Engine3D._default?.resume(); }
}
