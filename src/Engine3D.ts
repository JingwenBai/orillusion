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
import { EntityCollect } from './gfx/renderJob/collect/EntityCollect';
import { ShadowLightsCollect } from './gfx/renderJob/collect/ShadowLightsCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';

/**
 * Orillusion 3D Engine
 *
 * **Single-instance (legacy):**
 * ```ts
 * Engine3D.setting.shadow.enable = true;
 * await Engine3D.init({ canvasConfig: { canvas } });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-instance:**
 * ```ts
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas } });
 * engine.startRenderView(view);
 * ```
 * @group engine3D
 */
export class Engine3D {

    // ===================================================================
    // SHARED / STATIC — backward compatible single-instance API
    // ===================================================================

    /** @internal */
    private static _defaultInstance: Engine3D | null = null;
    /** @internal — prevents re-running one-time shared initialization */
    private static _sharedInited: boolean = false;

    /**
     * Shared engine settings. Mutations apply to all instances.
     * Set values before calling init() to configure the engine.
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

    // ---- Static getters / setters that proxy to the default instance ----

    /** Resource manager of the default engine instance. */
    public static get res(): Res { return this._defaultInstance?.res; }
    public static set res(v: Res) { if (this._defaultInstance) this._defaultInstance.res = v; }

    /** Input system of the default engine instance. */
    public static get inputSystem(): InputSystem { return this._defaultInstance?.inputSystem; }

    /** Active render views of the default engine instance. */
    public static get views(): View3D[] { return this._defaultInstance?.views; }
    public static set views(v: View3D[]) { if (this._defaultInstance) this._defaultInstance.views = v; }

    /**
     * @internal
     */
    public static get renderJobs(): Map<View3D, RendererJob> { return this._defaultInstance?.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { if (this._defaultInstance) this._defaultInstance.renderJobs = v; }

    /** Frame rate of the default engine instance. */
    public static get frameRate(): number { return this._defaultInstance?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (this._defaultInstance) this._defaultInstance.frameRate = value; }

    /** Render window size [width, height] of the default engine instance. */
    public static get size(): number[] { return webGPUContext?.presentationSize; }

    /** Aspect ratio of the default engine instance's canvas. */
    public static get aspect(): number { return webGPUContext?.aspect; }

    /** Canvas width of the default engine instance. */
    public static get width(): number { return webGPUContext?.windowWidth; }

    /** Canvas height of the default engine instance. */
    public static get height(): number { return webGPUContext?.windowHeight; }

    // ---- Static convenience methods (proxy to default instance) ----

    /**
     * Initialize the default engine instance and start the 3D context.
     * For multiple independent instances use `new Engine3D()` instead.
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }
        this._defaultInstance = new Engine3D();
        await this._defaultInstance.init(descriptor);
    }

    /**
     * Set render view and start renderer on the default engine instance.
     */
    public static startRenderView(view: View3D) {
        return this._defaultInstance?.startRenderView(view);
    }

    /**
     * Set render views and start renderer on the default engine instance.
     */
    public static startRenderViews(views: View3D[]) {
        return this._defaultInstance?.startRenderViews(views);
    }

    /**
     * Get view render job instance from the default engine instance.
     */
    public static getRenderJob(view: View3D): RendererJob {
        return this._defaultInstance?.getRenderJob(view);
    }

    /**
     * Pause rendering on the default engine instance.
     */
    public static pause() { this._defaultInstance?.pause(); }

    /**
     * Resume rendering on the default engine instance.
     */
    public static resume() { this._defaultInstance?.resume(); }


    // ===================================================================
    // INSTANCE — per-engine state (supports multiple independent engines)
    // ===================================================================

    /** This engine's WebGPU canvas context. */
    public gpuContext: Context3D;

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine instance's canvas. */
    public inputSystem: InputSystem;

    /** Active render views for this engine instance. */
    public views: View3D[];

    /** Render jobs per view for this engine instance. @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /** Entity collector for this engine instance. @internal */
    public entityCollect: EntityCollect;

    /** Render texture resource map for this engine instance. @internal */
    public rtResourceMap: RTResourceMap;

    /** Per-engine GBuffer frame registry. @internal */
    private _gBufferFrames: Map<string, GBufferFrame> = new Map();

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /**
     * Set engine render frame rate: 24/30/60/120/144/240/360 fps or any other value.
     */
    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    /**
     * Activate this engine's per-instance resources as the global active ones.
     * Called automatically before each render frame so global consumers
     * (webGPUContext, RTResourceMap, GBufferFrame, EntityCollect) reference
     * the correct engine during the current frame.
     */
    public activate(): void {
        setWebGPUContext(this.gpuContext);
        if (this.rtResourceMap) RTResourceMap.setActive(this.rtResourceMap);
        if (this.entityCollect) EntityCollect.setActive(this.entityCollect);
        if (this._gBufferFrames) GBufferFrame.setActiveMap(this._gBufferFrames);
    }

    /**
     * Initialize this engine instance.
     * Creates a new WebGPU canvas context and all per-engine resources.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {

        // Merge user overrides into shared settings
        if (descriptor.engineSetting) {
            Engine3D.setting = { ...Engine3D.setting, ...descriptor.engineSetting };
        }

        // ---- One-time shared initialization (WASM, shaders, GPU bind groups) ----
        if (!Engine3D._sharedInited) {
            Engine3D._sharedInited = true;
            await WasmMatrix.init(Matrix4.allocCount, Engine3D.setting.doublePrecision);
            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            ShadowLightsCollect.init();
        }

        // ---- Per-engine: WebGPU canvas context ----
        this.gpuContext = new Context3D();
        await this.gpuContext.init(descriptor.canvasConfig);

        // ---- Per-engine: resource managers ----
        this.rtResourceMap = new RTResourceMap();
        this.entityCollect = new EntityCollect();
        this._gBufferFrames = new Map();

        // Activate this engine's resources as globally visible
        this.activate();

        // Pre-compute reflection GBuffer (uses active context + resource map)
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
        this.inputSystem.initCanvas(this.gpuContext.canvas);
    }

    private startRenderJob(view: View3D) {
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
     * Set render view and start renderer.
     */
    public startRenderView(view: View3D) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set render views and start renderer.
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
     * Get view render job instance.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
    }

    /**
     * Pause the engine render loop.
     */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the engine render loop.
     */
    public resume() {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
    }

    /** @internal */
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

        // Activate this engine's per-instance resources before rendering
        this.activate();

        await this.updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async updateFrame(time: number) {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        let views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.gpuContext.presentationSize;
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

        let command = this.gpuContext.device.createCommandEncoder();
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

        this.gpuContext.device.queue.submit([command.finish()]);

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
}
