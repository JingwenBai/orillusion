import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveContext } from './gfx/graphics/webGpu/Context3D';
import { webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { setActiveEngineId } from './EngineRegistry';

/**
 * Orillusion 3D Engine
 *
 * -- Engine3D.setting.*
 *
 * -- await Engine3D.init();
 *
 * For multi-instance use, create instances directly:
 * -- const engine = new Engine3D();
 * -- await engine.init({ canvasConfig: { canvas: myCanvas } });
 * @group engine3D
 */
export class Engine3D {

    // ==================== INSTANCE STATE ====================

    /** Unique identifier for this engine instance, used to scope GPU resources. */
    public id: string;

    /** Per-instance WebGPU context (canvas + device). */
    public webGPUContext: Context3D;

    /** Per-instance resource manager. */
    public res: Res;

    /** Per-instance input system. */
    public inputSystem: InputSystem;

    /** Views registered with this instance. */
    public views: View3D[];

    /** Render jobs for this instance's views. */
    public renderJobs: Map<View3D, RendererJob>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ==================== STATIC REGISTRY ====================

    private static _instanceCounter: number = 0;
    private static _sharedInitDone: boolean = false;

    /** The first / default instance, used by the static backward-compat API. */
    private static _default: Engine3D | null = null;

    /**
     * Shared GPUDevice across all Engine3D instances.
     * All instances must share the same device so that GPU resources
     * (bind groups, buffers, textures) created by one engine remain
     * compatible with the others.
     */
    private static _sharedDevice: GPUDevice | null = null;

    // ==================== STATIC SHARED SETTING ====================

    /**
     * engine setting
     */
    public static setting: EngineSetting = {
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
            lerpHysteresis: 0.01,//The smaller the value, the slower the reaction, which can counteract flickering
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
            defaultFar: 65536,//can't be too big
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

    // ==================== CONSTRUCTOR ====================

    constructor() {
        Engine3D._instanceCounter++;
        this.id = 'engine_' + Engine3D._instanceCounter;
    }

    // ==================== INSTANCE GETTERS ====================

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
        return this.webGPUContext.presentationSize;
    }

    /**
     * get render window aspect
     */
    public get aspect(): number {
        return this.webGPUContext.aspect;
    }

    /**
     * get render window size width
     */
    public get width(): number {
        return this.webGPUContext.windowWidth;
    }

    /**
     * get render window size height
     */
    public get height(): number {
        return this.webGPUContext.windowHeight;
    }

    // ==================== INSTANCE INIT ====================

    /**
     * Create WebGPU 3D engine for this instance.
     * Can be called on multiple Engine3D instances to run side-by-side.
     * @param descriptor  {@link CanvasConfig}
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        Engine3D.setting = { ...Engine3D.setting, ...descriptor.engineSetting };

        // One-time global init — shared across all Engine3D instances
        if (!Engine3D._sharedInitDone) {
            Engine3D._sharedInitDone = true;
            await WasmMatrix.init(Matrix4.allocCount, Engine3D.setting.doublePrecision);
            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            RTResourceMap.init();
            ShadowLightsCollect.init();
        }

        // Per-engine WebGPU context — each engine gets its own canvas context
        // but all instances share the same GPUDevice for resource compatibility
        this.webGPUContext = new Context3D();
        setActiveEngineId(this.id);
        setActiveContext(this.webGPUContext);
        await this.webGPUContext.init(descriptor.canvasConfig, Engine3D._sharedDevice || undefined);

        // Capture the shared device from the first engine
        if (!Engine3D._sharedDevice) {
            Engine3D._sharedDevice = this.webGPUContext.device;
        }

        // Per-engine reflection GBuffer setup
        Engine3D.setting.reflectionSetting.width = Engine3D.setting.reflectionSetting.reflectionProbeSize * 6;
        Engine3D.setting.reflectionSetting.height = Engine3D.setting.reflectionSetting.reflectionProbeSize * Engine3D.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            Engine3D.setting.reflectionSetting.width,
            Engine3D.setting.reflectionSetting.height,
            false
        );

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.webGPUContext.canvas);
    }

    // ==================== INSTANCE RENDER API ====================

    private _startRenderJob(view: View3D): RendererJob {
        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (Engine3D.setting.pick.mode == `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (Engine3D.setting.pick.mode == `pixel` || Engine3D.setting.pick.mode == `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Set render view and start renderer for this instance.
     * @param view
     * @returns
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set render views and start renderer for this instance.
     * @param views
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
     * @param view
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause this instance's render loop.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume this instance's render loop.
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
        // Activate this engine before touching any static GPU subsystems
        setActiveEngineId(this.id);
        setActiveContext(this.webGPUContext);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        let views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        // Only process ComponentCollect entries belonging to this engine's views
        const viewSet = new Set(this.views);

        for (const [view, map] of ComponentCollect.componentsBeforeUpdateList) {
            if (!viewSet.has(view)) continue;
            for (const [f, c] of map) {
                if (f.enable) c(view);
            }
        }

        let command = this.webGPUContext.device.createCommandEncoder();
        for (const [view, map] of ComponentCollect.componentsComputeList) {
            if (!viewSet.has(view)) continue;
            for (const [f, c] of map) {
                if (f.enable) c(view, command);
            }
        }
        this.webGPUContext.device.queue.submit([command.finish()]);

        for (const [view, map] of ComponentCollect.componentsUpdateList) {
            if (!viewSet.has(view)) continue;
            for (const [f, c] of map) {
                if (f.enable) c(view);
            }
        }

        for (const [view, map] of ComponentCollect.graphicComponent) {
            if (!viewSet.has(view)) continue;
            for (const [f, c] of map) {
                if (view && f.enable) c(view);
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        for (const [view, map] of ComponentCollect.componentsLateUpdateList) {
            if (!viewSet.has(view)) continue;
            for (const [f, c] of map) {
                if (f.enable) c(view);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // ==================== STATIC BACKWARD-COMPAT API ====================

    private static _getDefault(): Engine3D {
        if (!this._default) {
            this._default = new Engine3D();
        }
        return this._default;
    }

    // Static properties delegating to the default instance

    public static get res(): Res { return this._getDefault().res; }
    public static set res(v: Res) { this._getDefault().res = v; }

    public static get inputSystem(): InputSystem { return this._getDefault().inputSystem; }
    public static set inputSystem(v: InputSystem) { this._getDefault().inputSystem = v; }

    public static get views(): View3D[] { return this._getDefault().views; }
    public static set views(v: View3D[]) { this._getDefault().views = v; }

    /**
     * @internal
     */
    public static get renderJobs(): Map<View3D, RendererJob> { return this._getDefault().renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { this._getDefault().renderJobs = v; }

    /**
     * set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
     */
    public static get frameRate(): number { return this._getDefault().frameRate; }
    public static set frameRate(v: number) { this._getDefault().frameRate = v; }

    /**
     * get render window size width and height
     */
    public static get size(): number[] { return this._getDefault().size; }

    /**
     * get render window aspect
     */
    public static get aspect(): number { return this._getDefault().aspect; }

    /**
     * get render window size width
     */
    public static get width(): number { return this._getDefault().width; }

    /**
     * get render window size height
     */
    public static get height(): number { return this._getDefault().height; }

    /**
     * create webgpu 3d engine
     * @param descriptor  {@link CanvasConfig}
     * @returns
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        return this._getDefault().init(descriptor);
    }

    /**
     * set render view and start renderer
     * @param view
     * @returns
     */
    public static startRenderView(view: View3D): RendererJob {
        return this._getDefault().startRenderView(view);
    }

    /**
     * set render views and start renderer
     * @param views
     * @returns
     */
    public static startRenderViews(views: View3D[]): void {
        this._getDefault().startRenderViews(views);
    }

    /**
     * get view render job instance
     * @param view
     * @returns
     */
    public static getRenderJob(view: View3D): RendererJob {
        return this._getDefault().getRenderJob(view);
    }

    /**
     * Pause the engine render
     */
    public static pause(): void {
        this._getDefault().pause();
    }

    /**
     * Resume the engine render
     */
    public static resume(): void {
        this._getDefault().resume();
    }
}
