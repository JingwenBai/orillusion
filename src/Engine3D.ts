import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setWebGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap } from './gfx/renderJob/frame/RTResourceMap';

import { ForwardRenderJob } from './gfx/renderJob/jobs/ForwardRenderJob';
import { GlobalBindGroup } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalBindGroupLayout } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroupLayout';
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
import { PipelinePool } from './gfx/graphics/webGpu/PipelinePool';
import { GPUContext } from './gfx/renderJob/GPUContext';
import { MatrixBindGroup } from './gfx/graphics/webGpu/core/bindGroups/MatrixBindGroup';

function createDefaultEngineSetting(): EngineSetting {
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
 * -- Single-instance (backward compatible):
 *    await Engine3D.init();
 *    Engine3D.startRenderView(view);
 *
 * -- Multi-instance:
 *    const engine1 = new Engine3D();
 *    await engine1.init({ canvasConfig: { canvas: canvas1 } });
 *    engine1.startRenderView(view1);
 *
 *    const engine2 = new Engine3D();
 *    await engine2.init({ canvasConfig: { canvas: canvas2 } });
 *    engine2.startRenderView(view2);
 *
 * @group engine3D
 */
export class Engine3D {

    // ─── Per-instance fields ──────────────────────────────────────────────────

    /** resource manager for this engine instance */
    public res: Res;

    /** input system for this engine instance */
    public inputSystem: InputSystem;

    /** active views for this engine instance */
    public views: View3D[];

    /** render jobs keyed by view */
    public renderJobs: Map<View3D, RendererJob>;

    /** per-instance engine settings */
    public setting: EngineSetting;

    /** WebGPU context (canvas + device) for this engine instance */
    public context: Context3D;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // Per-engine subsystem instances
    private _rtResourceMap: RTResourceMap;
    private _globalBindGroup: GlobalBindGroup;
    private _shaderUtil: ShaderUtil;
    private _pipelinePool: PipelinePool;
    private _gpuContext: GPUContext;
    private _gBufferFrameMap: Map<string, GBufferFrame>;

    // ─── Static default-instance fields (backward compat) ─────────────────────

    /** @internal Default engine instance used by the static API */
    private static _default: Engine3D;

    // ─── Instance frameRate accessors ─────────────────────────────────────────

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

    // ─── activate(): set this engine as the globally active one ───────────────

    /**
     * Make this engine instance the globally active one.
     * Sets webGPUContext and activates all per-engine subsystems so existing
     * code that uses static accessors works with this engine's resources.
     */
    public activate(): void {
        setWebGPUContext(this.context);
        RTResourceMap.activate(this._rtResourceMap);
        GlobalBindGroup.activate(this._globalBindGroup);
        ShaderUtil.activate(this._shaderUtil);
        PipelinePool.activate(this._pipelinePool);
        GBufferFrame.activate(this._gBufferFrameMap);
        GPUContext.activate(this._gpuContext);
    }

    // ─── Instance init ────────────────────────────────────────────────────────

    /**
     * Initialize this engine instance.
     * @param descriptor  canvas config, callbacks, and optional per-instance engine settings
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

        // Build per-instance setting from the class-level default merged with descriptor
        this.setting = { ...Engine3D.setting, ...descriptor.engineSetting };

        // Create per-engine subsystem instances
        this.context = new Context3D();
        this._rtResourceMap = new RTResourceMap();
        this._globalBindGroup = new GlobalBindGroup();
        this._shaderUtil = new ShaderUtil();
        this._pipelinePool = new PipelinePool();
        this._gpuContext = new GPUContext();
        this._gBufferFrameMap = new Map<string, GBufferFrame>();

        // Set this engine as globally active so all static subsystem calls use our state
        this.activate();

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        await this.context.init(descriptor.canvasConfig);

        // Pre-compute reflection setting
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        ShaderLib.init();

        // Initialize per-engine GlobalBindGroup: create the MatrixBindGroup GPU buffer
        this._globalBindGroup.modelMatrixBindGroup = new MatrixBindGroup();
        // RTResourceMap maps are already initialized in the constructor
        // ShadowLightsCollect is a global static class already partitioned by Scene3D
        ShadowLightsCollect.init();

        this.res = new Res();

        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);
    }

    // ─── Instance render methods ───────────────────────────────────────────────

    private startRenderJob(view: View3D): RendererJob {
        this.activate(); // ensure our subsystems are active
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
     * Set render view and start the renderer loop for this engine instance.
     * @param view
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the renderer loop for this engine instance.
     * @param views
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this.startRenderJob(views[i]);
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
     * Pause the engine render loop.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the engine render loop.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
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
        // Activate this engine's subsystems before each frame
        this.activate();
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

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

        for (const iterator of ComponentCollect.componentsBeforeUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                }
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
                }
            }
        }

        this.context.device.queue.submit([command.finish()]);

        for (const iterator of ComponentCollect.componentsUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                }
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
                }
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

        for (const iterator of ComponentCollect.componentsLateUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Static API — backward compatible single-instance interface
    // All static methods delegate to Engine3D._default
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * engine setting (global default, shared by the static single-instance API)
     */
    public static setting: EngineSetting = createDefaultEngineSetting();

    /**
     * @internal
     */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._default?.renderJobs;
    }

    public static get res(): Res {
        return Engine3D._default?.res;
    }

    public static set res(v: Res) {
        if (Engine3D._default) Engine3D._default.res = v;
    }

    public static get inputSystem(): InputSystem {
        return Engine3D._default?.inputSystem;
    }

    public static set inputSystem(v: InputSystem) {
        if (Engine3D._default) Engine3D._default.inputSystem = v;
    }

    public static get views(): View3D[] {
        return Engine3D._default?.views;
    }

    public static set views(v: View3D[]) {
        if (Engine3D._default) Engine3D._default.views = v;
    }

    public static get frameRate(): number {
        return Engine3D._default?._frameRate ?? 360;
    }

    public static set frameRate(value: number) {
        if (Engine3D._default) Engine3D._default.frameRate = value;
    }

    public static get size(): number[] {
        return Engine3D._default?.context?.presentationSize;
    }

    public static get aspect(): number {
        return Engine3D._default?.context?.aspect;
    }

    public static get width(): number {
        return Engine3D._default?.context?.windowWidth;
    }

    public static get height(): number {
        return Engine3D._default?.context?.windowHeight;
    }

    /**
     * Create and initialize the default engine instance (single-instance API).
     * @param descriptor  {@link CanvasConfig}
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        Engine3D._default = new Engine3D();
        return Engine3D._default.init(descriptor);
    }

    /**
     * Set render view and start renderer (single-instance API).
     * @param view
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._default.startRenderView(view);
    }

    /**
     * Set render views and start renderer (single-instance API).
     * @param views
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._default.startRenderViews(views);
    }

    /**
     * Get view render job instance (single-instance API).
     * @param view
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._default.getRenderJob(view);
    }

    /**
     * Pause the engine render (single-instance API).
     */
    public static pause(): void {
        Engine3D._default?.pause();
    }

    /**
     * Resume the engine render (single-instance API).
     */
    public static resume(): void {
        Engine3D._default?.resume();
    }
}
