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

let _engineIdCounter = 0;

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
 * Orillusion 3D Engine
 *
 * Can be used as a class (multi-instance) or via static methods (single-instance backward compat).
 *
 * -- engine.setting.*
 * -- await engine.init();
 *
 * Or static (backward compat):
 * -- Engine3D.setting.*
 * -- await Engine3D.init();
 *
 * @group engine3D
 */
export class Engine3D {

    // ─── Static shared one-time init ─────────────────────────────────────────
    private static _sharedInitialized: boolean = false;

    // ─── Default single instance for static API backward compat ──────────────
    private static _default: Engine3D = null;

    /**
     * The currently-rendering Engine3D instance.
     * Updated by each instance before its render frame, so that static
     * accessors like Engine3D.setting resolve to the active instance.
     * @internal
     */
    public static activeInstance: Engine3D = null;

    // ─── Instance state ───────────────────────────────────────────────────────
    public readonly instanceId: string;

    /** Canvas context for this engine instance */
    public readonly context: Context3D;

    /** resource manager */
    public res: Res;

    /** input system */
    public inputSystem: InputSystem;

    /** active views */
    public views: View3D[];

    /** per-view render jobs */
    public renderJobs: Map<View3D, RendererJob>;

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
        this.instanceId = `engine_${_engineIdCounter++}`;
        this.context = new Context3D();
        this.setting = makeDefaultSetting();
    }

    // ─── Instance getters ────────────────────────────────────────────────────

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    public get size(): number[] { return this.context.presentationSize; }
    public get aspect(): number { return this.context.aspect; }
    public get width(): number { return this.context.windowWidth; }
    public get height(): number { return this.context.windowHeight; }

    // ─── Instance init ────────────────────────────────────────────────────────

    /**
     * Create a WebGPU 3D engine instance.
     * On the first call per page, the shared GPU device is created.
     * Subsequent instances share the same GPUDevice.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        this._activateContext();

        await this.context.init(descriptor.canvasConfig);

        // One-time shared initializations (shaders, wasm, global bind groups)
        if (!Engine3D._sharedInitialized) {
            Engine3D._sharedInitialized = true;
            console.log('Engine Version', version);
            if (!window.isSecureContext) {
                console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
            }

            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            ShadowLightsCollect.init();
        }

        // Per-instance initializations
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;

        RTResourceMap.init();

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);
    }

    /**
     * Activate this instance as the globally active engine.
     * Sets the active canvas context, resource map ID, and Engine3D.activeInstance.
     * @internal
     */
    private _activateContext(): void {
        Engine3D.activeInstance = this;
        setActiveWebGPUContext(this.context);
        RTResourceMap.activeEngineId = this.instanceId;
    }

    private _startRenderJob(view: View3D): RendererJob {
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
     * Set render view and start renderer.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set render views and start renderer.
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
     * Get view render job instance.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause the engine render.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the engine render.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
    }

    private async _render(time: number): Promise<void> {
        // Activate this instance's context before rendering
        this._activateContext();

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
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const myViews = new Set(this.views);

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

        for (const [view, componentMap] of ComponentCollect.componentsBeforeUpdateList) {
            if (!myViews.has(view)) continue;
            for (const [component, fn] of componentMap) {
                if (component.enable) fn(view);
            }
        }

        let command = Context3D.sharedDevice.createCommandEncoder();
        for (const [view, componentMap] of ComponentCollect.componentsComputeList) {
            if (!myViews.has(view)) continue;
            for (const [component, fn] of componentMap) {
                if (component.enable) fn(view, command);
            }
        }

        Context3D.sharedDevice.queue.submit([command.finish()]);

        for (const [view, componentMap] of ComponentCollect.componentsUpdateList) {
            if (!myViews.has(view)) continue;
            for (const [component, fn] of componentMap) {
                if (component.enable) fn(view);
            }
        }

        for (const [view, componentMap] of ComponentCollect.graphicComponent) {
            if (!myViews.has(view)) continue;
            for (const [component, fn] of componentMap) {
                if (view && component.enable) fn(view);
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((renderJob, view) => {
            if (!renderJob.renderState) {
                renderJob.start();
            }
            renderJob.renderFrame();
        });

        for (const [view, componentMap] of ComponentCollect.componentsLateUpdateList) {
            if (!myViews.has(view)) continue;
            for (const [component, fn] of componentMap) {
                if (component.enable) fn(view);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // ─── Static backward-compat API ──────────────────────────────────────────

    private static _ensureDefault(): Engine3D {
        if (!Engine3D._default) {
            Engine3D._default = new Engine3D();
        }
        return Engine3D._default;
    }

    /** resource manager (backward compat) */
    public static get res(): Res { return Engine3D._default?.res; }
    public static set res(v: Res) { Engine3D._ensureDefault().res = v; }

    /** input system - resolves to the currently-active instance during rendering */
    public static get inputSystem(): InputSystem {
        return (Engine3D.activeInstance ?? Engine3D._default)?.inputSystem;
    }
    public static set inputSystem(v: InputSystem) { Engine3D._ensureDefault().inputSystem = v; }

    /** views (backward compat) */
    public static get views(): View3D[] { return Engine3D._default?.views; }
    public static set views(v: View3D[]) { Engine3D._ensureDefault().views = v; }

    /** frameRate (backward compat) */
    public static get frameRate(): number { return Engine3D._default?._frameRate ?? 360; }
    public static set frameRate(value: number) { Engine3D._ensureDefault().frameRate = value; }

    /** render window size (backward compat) */
    public static get size(): number[] { return Engine3D._default?.size; }
    public static get aspect(): number { return Engine3D._default?.aspect; }
    public static get width(): number { return Engine3D._default?.width; }
    public static get height(): number { return Engine3D._default?.height; }

    /** engine setting - resolves to the currently-active instance during rendering */
    public static get setting(): EngineSetting {
        return (Engine3D.activeInstance ?? Engine3D._ensureDefault()).setting;
    }
    public static set setting(v: EngineSetting) { Engine3D._ensureDefault().setting = v; }

    /** renderJobs (backward compat) */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._default?.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { Engine3D._ensureDefault().renderJobs = v; }

    /**
     * Create the default single-instance Engine3D (backward compat).
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        const inst = Engine3D._ensureDefault();
        await inst.init(descriptor);
    }

    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._ensureDefault().startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        Engine3D._ensureDefault().startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._default?.getRenderJob(view);
    }

    public static pause(): void {
        Engine3D._default?.pause();
    }

    public static resume(): void {
        Engine3D._default?.resume();
    }
}
