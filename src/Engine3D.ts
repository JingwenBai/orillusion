import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMapState, setActiveRTResourceMap } from './gfx/renderJob/frame/RTResourceMap';
import { GBufferFrame, setActiveGBufferMap } from './gfx/renderJob/frame/GBufferFrame';

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

function getDefaultEngineSetting(): EngineSetting {
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
 * Supports multiple independent instances on the same page, each with its own
 * canvas, WebGPU canvas-context, resource map and GBuffer frames.  The shared
 * GPUDevice is created once on the first Engine3D.init() call and reused by
 * every subsequent instance.
 *
 * **Single-instance (existing) usage — unchanged:**
 * ```ts
 * await Engine3D.init({ canvasConfig: { ... } });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-instance usage:**
 * ```ts
 * const engineA = new Engine3D();
 * await engineA.init({ canvasConfig: { canvas: canvasA } });
 * engineA.startRenderView(viewA);
 *
 * const engineB = new Engine3D();
 * await engineB.init({ canvasConfig: { canvas: canvasB } });
 * engineB.startRenderView(viewB);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // =========================================================
    // Static compatibility API — delegates to the default instance
    // =========================================================

    /**
     * The Engine3D instance that is currently executing a frame.
     * Set automatically by activate() at the start of every frame.
     */
    public static current: Engine3D;

    /** resource manager in engine3d */
    public static get res(): Res { return Engine3D._defaultInstance.res; }

    /** input system in engine3d */
    public static get inputSystem(): InputSystem { return Engine3D._defaultInstance.inputSystem; }

    /** active views */
    public static get views(): View3D[] { return Engine3D._defaultInstance.views; }
    public static set views(v: View3D[]) { Engine3D._defaultInstance.views = v; }

    /** engine setting */
    public static get setting(): EngineSetting { return Engine3D._defaultInstance.setting; }
    public static set setting(v: EngineSetting) { Engine3D._defaultInstance.setting = v; }

    /** @internal */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._defaultInstance.renderJobs; }

    /** set engine render frameRate 24/30/60/114/120/144/240/360 fps or other */
    public static get frameRate(): number { return Engine3D._defaultInstance.frameRate; }
    public static set frameRate(v: number) { Engine3D._defaultInstance.frameRate = v; }

    /** get render window size [width, height] */
    public static get size(): number[] { return Engine3D._defaultInstance.size; }

    /** get render window aspect */
    public static get aspect(): number { return Engine3D._defaultInstance.aspect; }

    /** get render window width */
    public static get width(): number { return Engine3D._defaultInstance.width; }

    /** get render window height */
    public static get height(): number { return Engine3D._defaultInstance.height; }

    /**
     * create webgpu 3d engine (static convenience, uses the default instance)
     * @param descriptor  {@link CanvasConfig}
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        return Engine3D._defaultInstance.init(descriptor);
    }

    /**
     * set render view and start renderer
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._defaultInstance.startRenderView(view);
    }

    /**
     * set render views and start renderer
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._defaultInstance.startRenderViews(views);
    }

    /**
     * get view render job instance
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._defaultInstance.getRenderJob(view);
    }

    /** Pause the engine render */
    public static pause(): void {
        Engine3D._defaultInstance.pause();
    }

    /** Resume the engine render */
    public static resume(): void {
        Engine3D._defaultInstance.resume();
    }

    // =========================================================
    // Static internals
    // =========================================================

    private static _defaultInstance: Engine3D;
    // Flags for once-per-process initializations
    private static _wasmInitialized: boolean = false;
    private static _shadersInitialized: boolean = false;

    static {
        // Eagerly create the default instance so Engine3D.setting is accessible
        // before Engine3D.init() is called (existing usage pattern).
        Engine3D._defaultInstance = new Engine3D();
    }

    // =========================================================
    // Instance fields
    // =========================================================

    public res: Res;
    public inputSystem: InputSystem;
    public views: View3D[];
    public setting: EngineSetting;
    public renderJobs: Map<View3D, RendererJob>;

    private _context3D: Context3D;
    private _rtResourceMapState: RTResourceMapState;
    private _gBufferFrameMap: Map<string, GBufferFrame>;
    private _frameRate: number = 360;
    private _frameRateValue: number = 0;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.setting = getDefaultEngineSetting();
        this._rtResourceMapState = new RTResourceMapState();
        this._gBufferFrameMap = new Map<string, GBufferFrame>();
    }

    // =========================================================
    // Instance getters / setters
    // =========================================================

    /** set engine render frameRate 24/30/60/114/120/144/240/360 fps or other */
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

    /** get render window size [width, height] */
    public get size(): number[] {
        return this._context3D?.presentationSize ?? [0, 0];
    }

    /** get render window aspect */
    public get aspect(): number {
        return this._context3D?.aspect ?? 1;
    }

    /** get render window width */
    public get width(): number {
        return this._context3D?.windowWidth ?? 0;
    }

    /** get render window height */
    public get height(): number {
        return this._context3D?.windowHeight ?? 0;
    }

    // =========================================================
    // Instance methods
    // =========================================================

    /**
     * Activate this engine as the current rendering instance.
     * Reassigns all module-level context pointers so that global helpers
     * (webGPUContext, RTResourceMap, GBufferFrame, …) operate on this
     * engine's per-instance state.
     */
    public activate(): void {
        Engine3D.current = this;
        if (this._context3D) setActiveContext(this._context3D);
        setActiveRTResourceMap(this._rtResourceMapState);
        setActiveGBufferMap(this._gBufferFrameMap);
    }

    /**
     * create webgpu 3d engine
     * @param descriptor  {@link CanvasConfig}
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

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // WASM matrix library — initialized once per process
        if (!Engine3D._wasmInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            Engine3D._wasmInitialized = true;
        }

        // Per-instance WebGPU canvas context (device is shared via Context3D statics)
        this._context3D = new Context3D();
        await this._context3D.init(descriptor.canvasConfig);

        // Activate this engine so all module-level helpers point here
        this.activate();

        // Pre-compute reflection settings
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // Shader libraries — initialized once per process
        if (!Engine3D._shadersInitialized) {
            ShaderLib.init();
            ShaderUtil.init();
            Engine3D._shadersInitialized = true;
        }

        // Idempotent global inits (scene-keyed data structures)
        GlobalBindGroup.init();
        ShadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this._context3D.canvas);
    }

    private startRenderJob(view: View3D): RendererJob {
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
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * set render views and start renderer
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
     * get view render job instance
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
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
    }

    private async render(time: number): Promise<void> {
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

    private async updateFrame(time: number): Promise<void> {
        // Switch all module-level context pointers to this engine before rendering
        this.activate();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        let views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this._context3D.presentationSize;
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

        let command = this._context3D.device.createCommandEncoder();
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

        this._context3D.device.queue.submit([command.finish()]);

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
}
