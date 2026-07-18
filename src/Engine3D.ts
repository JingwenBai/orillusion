import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D } from './gfx/graphics/webGpu/Context3D';
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
import { PipelinePool } from './gfx/graphics/webGpu/PipelinePool';
import { EngineRegistry } from './core/EngineRegistry';

/**
 * Orillusion 3D Engine — supports multiple instances.
 *
 * -- engine.setting.*
 *
 * -- const engine = new Engine3D()
 * -- await engine.init();
 * @group engine3D
 */
export class Engine3D {

    /**
     * resource manager in engine3d
     */
    public res: Res;

    /**
     * input system in engine3d
     */
    public inputSystem: InputSystem;

    /**
     * more view in engine3d
     */
    public views: View3D[];

    /**
     * WebGPU context for this engine instance
     */
    public context: Context3D;

    /**
     * Per-engine entity collect
     * @internal
     */
    public entityCollect: EntityCollect;

    /**
     * Per-engine global bind group
     * @internal
     */
    public globalBindGroup: GlobalBindGroup;

    /**
     * Per-engine render texture map
     * @internal
     */
    public rtResourceMap: RTResourceMap;

    /**
     * Per-engine shadow lights collect
     * @internal
     */
    public shadowLightsCollect: ShadowLightsCollect;

    /**
     * Per-engine shader util (holds device-specific GPU shader modules)
     * @internal
     */
    public shaderUtil: ShaderUtil;

    /**
     * Per-engine pipeline pool (holds device-specific GPU render pipelines)
     * @internal
     */
    public pipelinePool: PipelinePool;

    /**
     * Per-engine GBuffer frame map (keyed by name string)
     * @internal
     */
    public _gBufferFrameMap: Map<string, GBufferFrame>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

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
        return this.context?.presentationSize;
    }

    /**
     * get render window aspect
     */
    public get aspect(): number {
        return this.context?.aspect;
    }

    /**
     * get render window size width
     */
    public get width(): number {
        return this.context?.windowWidth;
    }

    /**
     * get render window size height
     */
    public get height(): number {
        return this.context?.windowHeight;
    }

    /**
     * engine setting
     */
    public setting: EngineSetting = {
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

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    // ---- Static delegates for backward compatibility ----
    // These forward to the currently active Engine3D instance (EngineRegistry.current).

    /** @deprecated Use instance.res instead */
    public static get res(): Res { return EngineRegistry.current?.res; }

    /** @deprecated Use instance.inputSystem instead */
    public static get inputSystem(): InputSystem { return EngineRegistry.current?.inputSystem; }

    /** @deprecated Use instance.views instead */
    public static get views(): View3D[] { return EngineRegistry.current?.views; }

    /** @deprecated Use instance.renderJobs instead */
    public static get renderJobs(): Map<View3D, RendererJob> { return EngineRegistry.current?.renderJobs; }

    /** @deprecated Use instance.setting instead */
    public static get setting(): EngineSetting { return EngineRegistry.current?.setting; }
    public static set setting(v: EngineSetting) { if (EngineRegistry.current) EngineRegistry.current.setting = v; }

    /** @deprecated Use instance.getRenderJob instead */
    public static getRenderJob(view: View3D): RendererJob { return EngineRegistry.current?.getRenderJob(view); }

    /** @deprecated Use instance.startRenderView instead */
    public static startRenderView(view: View3D) { return EngineRegistry.current?.startRenderView(view); }

    /** @deprecated Use instance.startRenderViews instead */
    public static startRenderViews(views: View3D[]) { return EngineRegistry.current?.startRenderViews(views); }

    /** @deprecated Use instance.pause instead */
    public static pause() { return EngineRegistry.current?.pause(); }

    /** @deprecated Use instance.resume instead */
    public static resume() { return EngineRegistry.current?.resume(); }

    /** @deprecated Use instance.frameRate instead */
    public static get frameRate(): number { return EngineRegistry.current?.frameRate; }
    public static set frameRate(v: number) { if (EngineRegistry.current) EngineRegistry.current.frameRate = v; }

    /** @deprecated Use instance.size instead */
    public static get size(): number[] { return EngineRegistry.current?.size; }

    /** @deprecated Use instance.aspect instead */
    public static get aspect(): number { return EngineRegistry.current?.aspect; }

    /** @deprecated Use instance.width instead */
    public static get width(): number { return EngineRegistry.current?.width; }

    /** @deprecated Use instance.height instead */
    public static get height(): number { return EngineRegistry.current?.height; }

    /** @deprecated Use new Engine3D() then instance.init() instead */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        const engine = new Engine3D();
        await engine.init(descriptor);
        return engine;
    }

    /**
     * create webgpu 3d engine
     * @param descriptor  {@link CanvasConfig}
     * @returns
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext){
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)')
        }

        // Register this engine as active so subsystems can find it
        EngineRegistry.setCurrent(this);

        this.setting = { ...this.setting, ...descriptor.engineSetting }

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        // Create and initialize per-engine context (WebGPU device + canvas)
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);

        //****pre compute setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Initialize per-engine subsystems
        this.shaderUtil = new ShaderUtil();
        this.shaderUtil.init();

        this.pipelinePool = new PipelinePool();

        this.globalBindGroup = new GlobalBindGroup();
        this.globalBindGroup.init();

        this.rtResourceMap = new RTResourceMap();
        this.rtResourceMap.init();

        this.shadowLightsCollect = new ShadowLightsCollect();
        this.shadowLightsCollect.init();

        this.entityCollect = new EntityCollect();

        this._gBufferFrameMap = new Map<string, GBufferFrame>();

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );
        //****pre compute setting****/

        ShaderLib.init();

        this.res = new Res();

        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);
        return;
    }

    private startRenderJob(view: View3D){
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
     * set render view and start renderer
     * @param view
     * @returns
     */
    public startRenderView(view: View3D) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        view.engine = this;
        this.views = [view];
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }


    /**
     * set render views and start renderer
     * @param view
     * @returns
     */
    public startRenderViews(views: View3D[]) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            views[i].engine = this;
            this.startRenderJob(views[i])
        }
        this.resume();
    }

    /**
     * get view render job instance
     * @param view
     * @returns
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause the engine render
     */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the engine render
     */
    public resume() {
        if(this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
    }

    /**
     * start engine render
     * @internal
     */
    private async render(time: number) {
        if (this._frameRateValue > 0) {
            let delta = time - this._time;
            if(delta < this._frameRateValue){
                let t = performance.now()
                await new Promise(res=>{
                    setTimeout(()=>{
                        time += (performance.now() - t)
                        res(true)
                    }, this._frameRateValue - delta)
                })
            }
            this._time = time;
        }
        await this.updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume()
    }

    private async updateFrame(time: number) {
        // Set this engine as the active context for all subsystem static delegates
        EngineRegistry.setCurrent(this);

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

        /****** auto before update — only this engine's views *****/
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const list = ComponentCollect.componentsBeforeUpdateList?.get(view);
            if (list) {
                for (const [f, c] of list) {
                    if (f.enable) c(f);
                }
            }
        }

        let command = this.context.device.createCommandEncoder();
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const list = ComponentCollect.componentsComputeList?.get(view);
            if (list) {
                for (const [f, c] of list) {
                    if (f.enable) c(f, command);
                }
            }
        }

        this.context.device.queue.submit([command.finish()]);

        /****** auto update — only this engine's views *****/
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const list = ComponentCollect.componentsUpdateList?.get(view);
            if (list) {
                for (const [f, c] of list) {
                    if (f.enable) c(f);
                }
            }
        }

        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const list = ComponentCollect.graphicComponent?.get(view);
            if (list) {
                for (const [f, c] of list) {
                    if (f && f.enable) c(f);
                }
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

        /****** auto late update — only this engine's views *****/
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const list = ComponentCollect.componentsLateUpdateList?.get(view);
            if (list) {
                for (const [f, c] of list) {
                    if (f.enable) c(f);
                }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
