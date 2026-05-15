import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

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
import { EntityCollect } from './gfx/renderJob/collect/EntityCollect';

/**
 * Create and return a fresh default EngineSetting object.
 * @internal
 */
export function createDefaultEngineSetting(): EngineSetting {
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
 * -- Engine3D.setting.*
 *
 * -- await Engine3D.init();
 * @group engine3D
 */
export class Engine3D {

    // ==================== Per-instance state ====================

    /**
     * resource manager in engine3d
     */
    public res: Res;

    /**
     * input system in engine3d
     */
    public inputSystem: InputSystem;

    /**
     * views attached to this engine instance
     */
    public views: View3D[] = [];

    /**
     * render jobs keyed by View3D
     */
    public renderJobs: Map<View3D, RendererJob> = new Map();

    /**
     * engine setting for this instance
     */
    public setting: EngineSetting;

    /**
     * per-engine entity collect
     */
    public entityCollect: EntityCollect;

    /**
     * per-engine RT resource map
     */
    public rtResourceMap: RTResourceMap;

    /**
     * per-engine GBuffer map
     */
    public readonly gBufferMap: Map<string, GBufferFrame> = new Map();

    private _canvas: HTMLCanvasElement;
    private _canvasContext: GPUCanvasContext;
    private _presentationSize: number[] = [0, 0];
    private _windowWidth: number = 0;
    private _windowHeight: number = 0;
    private _aspect: number = 1;

    private _frameRate: number = 360;
    private _frameRateValue: number = 0;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ==================== Global shared state ====================

    private static _defaultInstance: Engine3D | null = null;
    private static _globalInitialized: boolean = false;

    // ==================== Backward compat static API ====================

    /**
     * resource manager in engine3d (static accessor - routes to default instance)
     */
    public static get res(): Res { return Engine3D._defaultInstance?.res; }
    public static set res(v: Res) { if (Engine3D._defaultInstance) Engine3D._defaultInstance.res = v; }

    /**
     * input system in engine3d (static accessor - routes to default instance)
     */
    public static get inputSystem(): InputSystem { return Engine3D._defaultInstance?.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D._defaultInstance) Engine3D._defaultInstance.inputSystem = v; }

    /**
     * more view in engine3d (static accessor - routes to default instance)
     */
    public static get views(): View3D[] { return Engine3D._defaultInstance?.views; }
    public static set views(v: View3D[]) { if (Engine3D._defaultInstance) Engine3D._defaultInstance.views = v; }

    /**
     * render jobs (static accessor - routes to default instance)
     * @internal
     */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._defaultInstance?.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { if (Engine3D._defaultInstance) Engine3D._defaultInstance.renderJobs = v; }

    /**
     * engine setting (static accessor - routes to default instance)
     */
    public static get setting(): EngineSetting { return Engine3D._defaultInstance?.setting; }
    public static set setting(v: EngineSetting) { if (Engine3D._defaultInstance) Engine3D._defaultInstance.setting = v; }

    /**
     * get render window size width and height
     */
    public static get size(): number[] {
        return webGPUContext.presentationSize;
    }

    /**
     * get render window aspect
     */
    public static get aspect(): number {
        return webGPUContext.aspect;
    }

    /**
     * get render window size width
     */
    public static get width(): number {
        return webGPUContext.windowWidth;
    }

    /**
     * get render window size height
     */
    public static get height(): number {
        return webGPUContext.windowHeight;
    }

    /**
     * set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
     */
    public static get frameRate(): number {
        return Engine3D._defaultInstance?._frameRate ?? 360;
    }

    /**
     * get engine render frameRate
     */
    public static set frameRate(value: number) {
        if (Engine3D._defaultInstance) Engine3D._defaultInstance.frameRate = value;
    }

    /**
     * create webgpu 3d engine (static - creates default instance)
     * @param descriptor  {@link CanvasConfig}
     * @returns
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {
        const engine = new Engine3D();
        Engine3D._defaultInstance = engine;
        await engine.init(descriptor);
    }

    /**
     * set render view and start renderer (static - routes to default instance)
     * @param view
     * @returns
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._defaultInstance?.startRenderView(view);
    }

    /**
     * set render views and start renderer (static - routes to default instance)
     * @param views
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._defaultInstance?.startRenderViews(views);
    }

    /**
     * get view render job instance (static - routes to default instance)
     * @param view
     * @returns
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._defaultInstance?.renderJobs?.get(view);
    }

    /**
     * Pause the engine render (static - routes to default instance)
     */
    public static pause(): void {
        Engine3D._defaultInstance?.pause();
    }

    /**
     * Resume the engine render (static - routes to default instance)
     */
    public static resume(): void {
        Engine3D._defaultInstance?.resume();
    }

    // ==================== Instance API ====================

    /**
     * get render window size width and height (instance)
     */
    public get size(): number[] { return this._presentationSize; }

    /**
     * get render window aspect (instance)
     */
    public get aspect(): number { return this._aspect; }

    /**
     * get render window size width (instance)
     */
    public get width(): number { return this._windowWidth; }

    /**
     * get render window size height (instance)
     */
    public get height(): number { return this._windowHeight; }

    /**
     * get canvas element for this engine instance
     */
    public get canvas(): HTMLCanvasElement { return this._canvas; }

    /**
     * set engine render frameRate (instance)
     */
    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    /**
     * create webgpu 3d engine (instance)
     * @param descriptor  {@link CanvasConfig}
     * @returns
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...createDefaultEngineSetting(), ...descriptor.engineSetting };

        if (!Engine3D._globalInitialized) {
            Engine3D._globalInitialized = true;

            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            await webGPUContext.init(descriptor.canvasConfig);

            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            ShadowLightsCollect.init();
        } else {
            if (descriptor.canvasConfig) {
                await webGPUContext.initCanvas(descriptor.canvasConfig);
            }
        }

        // Store this engine's canvas state
        this._canvas = webGPUContext.canvas;
        this._canvasContext = webGPUContext.context;
        this._presentationSize = [...webGPUContext.presentationSize];
        this._windowWidth = webGPUContext.windowWidth;
        this._windowHeight = webGPUContext.windowHeight;
        this._aspect = webGPUContext.aspect;

        // Create per-engine systems
        this.entityCollect = new EntityCollect();
        this.rtResourceMap = new RTResourceMap();

        // Activate this engine's context for setup
        this._activateContext();

        // Pre-compute reflection setting
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        RTResourceMap.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this._canvas);

        Engine3D._defaultInstance ??= this;
    }

    /**
     * Activate this engine's context (called before each frame and during init)
     */
    private _activateContext(): void {
        EntityCollect.setCurrent(this.entityCollect);
        RTResourceMap.setCurrent(this.rtResourceMap);
        GBufferFrame.setCurrent(this.gBufferMap);
        webGPUContext.context = this._canvasContext;
        webGPUContext.canvas = this._canvas;
        webGPUContext.presentationSize = this._presentationSize;
        webGPUContext.windowWidth = this._windowWidth;
        webGPUContext.windowHeight = this._windowHeight;
        webGPUContext.aspect = this._aspect;
    }

    private _startRenderJob(view: View3D): RendererJob {
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

    /**
     * set render view and start renderer (instance)
     * @param view
     * @returns
     */
    public startRenderView(view: View3D): RendererJob {
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * set render views and start renderer (instance)
     * @param views
     */
    public startRenderViews(views: View3D[]): void {
        this.views = views;
        for (const view of views) {
            this._startRenderJob(view);
        }
        this.resume();
    }

    /**
     * get view render job instance (instance)
     * @param view
     * @returns
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause the engine render (instance)
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the engine render (instance)
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    /**
     * start engine render
     * @internal
     */
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
        // Activate this engine's context before rendering
        this._activateContext();
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        /* update all transform */
        const views = this.views;
        for (const view of views) {
            view.scene.waitUpdate();
            let [w, h] = webGPUContext.presentationSize;
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
                }
            }
        }

        let command = webGPUContext.device.createCommandEncoder();
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

        webGPUContext.device.queue.submit([command.finish()]);

        /****** auto update with component list *****/
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
                }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
