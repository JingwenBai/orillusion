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
import { GPUContext } from './gfx/renderJob/GPUContext';

/**
 * Orillusion 3D Engine
 *
 * -- Engine3D.setting.*
 *
 * -- const engine = new Engine3D(); await engine.init();
 * -- OR (legacy): await Engine3D.init();
 * @group engine3D
 */
export class Engine3D {

    // ---- Shared static state ----

    /**
     * resource manager shared across engine instances
     */
    public static res: Res;

    /**
     * input system (shared; first engine initializes it)
     */
    public static inputSystem: InputSystem;

    /**
     * All Engine3D instances created so far
     */
    public static instances: Engine3D[] = [];

    /**
     * engine setting (shared across all instances)
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

    // ---- Per-instance subsystems ----

    public context: Context3D;
    public globalBindGroup: GlobalBindGroup;
    public rtResourceMap: RTResourceMap;
    public shadowLightsCollect: ShadowLightsCollect;
    public componentCollect: ComponentCollect;
    public shaderUtil: ShaderUtil;
    public gpuContext: GPUContext;

    // ---- Per-instance render state ----

    public views: View3D[] = [];
    public renderJobs: Map<View3D, RendererJob> = new Map();

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ---- Instance getters ----

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

    // ---- Instance init ----

    /**
     * Create and initialize a new engine instance bound to the given canvas config.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<this> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        Engine3D.setting = { ...Engine3D.setting, ...descriptor.engineSetting };

        const isFirst = Engine3D.instances.length === 0;

        if (isFirst) {
            await WasmMatrix.init(Matrix4.allocCount, Engine3D.setting.doublePrecision);
        }

        // Init per-instance canvas context (shares adapter+device after first engine)
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);
        setWebGPUContext(this.context);

        if (isFirst) {
            Engine3D.setting.reflectionSetting.width = Engine3D.setting.reflectionSetting.reflectionProbeSize * 6;
            Engine3D.setting.reflectionSetting.height = Engine3D.setting.reflectionSetting.reflectionProbeSize * Engine3D.setting.reflectionSetting.reflectionProbeMaxCount;
            GBufferFrame.getGBufferFrame(
                GBufferFrame.reflections_GBuffer,
                Engine3D.setting.reflectionSetting.width,
                Engine3D.setting.reflectionSetting.height,
                false
            );
            ShaderLib.init();
        }

        // Per-instance shader util
        this.shaderUtil = new ShaderUtil();
        this.shaderUtil.init();
        ShaderUtil.setActive(this.shaderUtil);

        // Per-instance bind groups
        this.globalBindGroup = new GlobalBindGroup();
        this.globalBindGroup.init();
        GlobalBindGroup.setActive(this.globalBindGroup);

        // Per-instance RT resource map
        this.rtResourceMap = new RTResourceMap();
        this.rtResourceMap.init();
        RTResourceMap.setActive(this.rtResourceMap);

        // Per-instance shadow lights
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.shadowLightsCollect.init();
        ShadowLightsCollect.setActive(this.shadowLightsCollect);

        // Per-instance component collect
        this.componentCollect = new ComponentCollect();

        // Per-instance GPU context state
        this.gpuContext = new GPUContext();
        GPUContext.setActive(this.gpuContext);

        if (isFirst) {
            Engine3D.res = new Res();
            Engine3D.res.initDefault();
            Engine3D.inputSystem = new InputSystem();
            Engine3D.inputSystem.initCanvas(this.context.canvas);
        }

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        Engine3D.instances.push(this);
        return this;
    }

    private _startRenderJob(view: View3D): RendererJob {
        view.engine = this;
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
     * Set render view and start renderer
     */
    public startRenderView(view: View3D): RendererJob {
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set render views and start renderer
     */
    public startRenderViews(views: View3D[]): void {
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get view render job instance
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause the engine render
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the engine render
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
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        // Activate this engine's subsystems for static-delegation compatibility
        setWebGPUContext(this.context);
        ShaderUtil.setActive(this.shaderUtil);
        GlobalBindGroup.setActive(this.globalBindGroup);
        RTResourceMap.setActive(this.rtResourceMap);
        ShadowLightsCollect.setActive(this.shadowLightsCollect);
        GPUContext.setActive(this.gpuContext);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        let views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        for (const iterator of this.componentCollect.componentsBeforeUpdateList) {
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
        for (const iterator of this.componentCollect.componentsComputeList) {
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

        for (const iterator of this.componentCollect.componentsUpdateList) {
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

        for (const iterator of this.componentCollect.graphicComponent) {
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

        let globalMatrixBindGroup = this.globalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        for (const iterator of this.componentCollect.componentsLateUpdateList) {
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

    // ---- Static backward-compat API (delegates to instances[0]) ----

    /** @deprecated use instance property via engine.size */
    public static get size(): number[] {
        return Engine3D.instances[0]?.context.presentationSize ?? webGPUContext.presentationSize;
    }

    /** @deprecated use instance property via engine.aspect */
    public static get aspect(): number {
        return Engine3D.instances[0]?.context.aspect ?? webGPUContext.aspect;
    }

    /** @deprecated use instance property via engine.width */
    public static get width(): number {
        return Engine3D.instances[0]?.context.windowWidth ?? webGPUContext.windowWidth;
    }

    /** @deprecated use instance property via engine.height */
    public static get height(): number {
        return Engine3D.instances[0]?.context.windowHeight ?? webGPUContext.windowHeight;
    }

    /** @deprecated use instance property via engine.frameRate */
    public static get frameRate(): number {
        return Engine3D.instances[0]?._frameRate ?? 360;
    }

    /** @deprecated use instance property via engine.frameRate */
    public static set frameRate(value: number) {
        if (Engine3D.instances[0]) Engine3D.instances[0].frameRate = value;
    }

    /**
     * @internal
     * @deprecated use instance property via engine.renderJobs
     */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D.instances[0]?.renderJobs;
    }

    /**
     * @deprecated use instance property via engine.views
     */
    public static get views(): View3D[] {
        return Engine3D.instances[0]?.views ?? [];
    }

    /**
     * Create and initialize a new Engine3D instance (legacy static entry point).
     * @param descriptor  {@link CanvasConfig}
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {
        let engine = new Engine3D();
        await engine.init(descriptor);
    }

    private static _startRenderJob(view: View3D): RendererJob {
        return Engine3D.instances[0]?._startRenderJob(view);
    }

    /** @deprecated use instance method via engine.startRenderView */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D.instances[0]?.startRenderView(view);
    }

    /** @deprecated use instance method via engine.startRenderViews */
    public static startRenderViews(views: View3D[]): void {
        Engine3D.instances[0]?.startRenderViews(views);
    }

    /** @deprecated use instance method via engine.getRenderJob */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.instances[0]?.getRenderJob(view);
    }

    /** @deprecated use instance method via engine.pause */
    public static pause(): void {
        Engine3D.instances[0]?.pause();
    }

    /** @deprecated use instance method via engine.resume */
    public static resume(): void {
        Engine3D.instances[0]?.resume();
    }
}
