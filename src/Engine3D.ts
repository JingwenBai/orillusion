import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveGPUContext } from './gfx/graphics/webGpu/Context3D';
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

/**
 * Orillusion 3D Engine — supports multiple simultaneous instances.
 *
 * Each instance owns its own canvas, GPU context, render loop, resources,
 * and input system.  Shared GPU infrastructure (GPUDevice, shaders,
 * global matrix buffer) is initialised only once across all instances.
 *
 * Usage:
 * ```ts
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas: myCanvas } });
 * engine.startRenderView(view);
 * ```
 * @group engine3D
 */
export class Engine3D {

    // ---- shared / once-only state across all instances ----
    private static _nextId: number = 0;
    private static _wasmInitialized: boolean = false;
    private static _sharedInitialized: boolean = false;

    /**
     * The engine instance that is currently executing its render frame.
     * Set automatically by each instance before it begins rendering so that
     * components and subsystems can reach their engine via `Engine3D.current`.
     */
    public static current: Engine3D | null = null;

    // --- Backward-compatible static accessors (delegate to current instance) ---

    /** @deprecated Use engine instance properties. Delegates to Engine3D.current. */
    public static get setting(): EngineSetting { return Engine3D.current!.setting; }
    /** @deprecated Use engine instance properties. Delegates to Engine3D.current. */
    public static set setting(v: EngineSetting) { if (Engine3D.current) Engine3D.current.setting = v; }
    /** @deprecated Use engine instance properties. Delegates to Engine3D.current. */
    public static get res(): Res { return Engine3D.current!.res; }
    /** @deprecated Use engine instance properties. Delegates to Engine3D.current. */
    public static get inputSystem(): InputSystem { return Engine3D.current!.inputSystem; }
    /** @deprecated Use engine instance properties. Delegates to Engine3D.current. */
    public static get views(): View3D[] { return Engine3D.current!.views; }
    /** @deprecated Use engine instance properties. Delegates to Engine3D.current. */
    public static get size(): number[] { return Engine3D.current!.size; }
    /** @deprecated Use engine instance properties. Delegates to Engine3D.current. */
    public static get aspect(): number { return Engine3D.current!.aspect; }
    /** @deprecated Use engine instance properties. Delegates to Engine3D.current. */
    public static get width(): number { return Engine3D.current!.width; }
    /** @deprecated Use engine instance properties. Delegates to Engine3D.current. */
    public static get height(): number { return Engine3D.current!.height; }
    /** @deprecated Use engine instance properties. Delegates to Engine3D.current. */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D.current!.renderJobs; }
    /** @deprecated Use engine instance properties. Delegates to Engine3D.current. */
    public static getRenderJob(view: View3D): RendererJob { return Engine3D.current!.getRenderJob(view); }

    // ---- per-instance state ----

    /** Unique id for this engine instance */
    public readonly id: number;

    /** Per-instance WebGPU canvas context */
    public context: Context3D;

    /** Per-instance render-texture resource pool */
    public rtResourceMap: RTResourceMap;

    /**
     * Resource manager for this engine instance
     */
    public res: Res;

    /**
     * Input system for this engine instance
     */
    public inputSystem: InputSystem;

    /**
     * Active views for this engine instance
     */
    public views: View3D[];

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
        return this.context.presentationSize;
    }

    /**
     * get render window aspect
     */
    public get aspect(): number {
        return this.context.aspect;
    }

    /**
     * get render window size width
     */
    public get width(): number {
        return this.context.windowWidth;
    }

    /**
     * get render window size height
     */
    public get height(): number {
        return this.context.windowHeight;
    }

    /**
     * engine setting for this instance
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

    constructor() {
        this.id = Engine3D._nextId++;
        this.context = new Context3D();
        this.rtResourceMap = new RTResourceMap();
    }

    /**
     * Activate this engine's context as the current rendering target.
     * Must be called before any rendering or resource-creation work so that
     * all context-sensitive subsystems operate on this engine's resources.
     */
    private activateContext(): void {
        Engine3D.current = this;
        setActiveGPUContext(this.context);
        RTResourceMap.setCurrentInstance(this.rtResourceMap);
        GBufferFrame.setCurrentEngineId(this.id);
    }

    /**
     * create webgpu 3d engine instance
     * @param descriptor  {@link CanvasConfig}
     * @returns
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext){
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)')
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting }

        // WasmMatrix is a shared WASM module — initialise only once across all instances
        if (!Engine3D._wasmInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            Engine3D._wasmInitialized = true;
        }

        // Initialise this instance's WebGPU canvas context (shares GPUDevice with prior instances)
        await this.context.init(descriptor.canvasConfig);

        // Switch all context-sensitive subsystems to this engine before any init work
        this.activateContext();

        //****pre compute reflection setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // Shader library and GPU utility init — safe to call multiple times (idempotent)
        ShaderLib.init();
        ShaderUtil.init();

        // GlobalBindGroup holds the shared world-matrix GPU buffer — init once
        GlobalBindGroup.init();

        // Per-instance render-texture pool is already initialised in the constructor
        // (RTResourceMap is created fresh per engine instance)

        // ShadowLightsCollect is keyed by Scene3D — idempotent init
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

    private startRenderJob(view: View3D): RendererJob {
        view.engine = this; // let components resolve their engine via view.engine
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
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }


    /**
     * set render views and start renderer
     * @param views
     * @returns
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
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
        if(this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
    }

    /**
     * start engine render
     * @internal
     */
    private async render(time: number): Promise<void> {
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

    private async updateFrame(time: number): Promise<void> {
        // Switch all context-sensitive subsystems to this engine instance before rendering
        this.activateContext();

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
            if (k.engine && k.engine !== this) continue; // skip views owned by other engines
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
            if (k.engine && k.engine !== this) continue;
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
            if (k.engine && k.engine !== this) continue;
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
            if (k.engine && k.engine !== this) continue;
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
            if (k.engine && k.engine !== this) continue;
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

    /**
     * Destroy this engine instance and release per-instance GPU resources.
     * The shared GPUDevice and shader library remain alive for other instances.
     */
    public destroy(): void {
        this.pause();
        GBufferFrame.releaseEngine(this.id);
        this.rtResourceMap = null;
        this.renderJobs = null;
        this.res = null;
        this.inputSystem = null;
        this.views = null;
        this.context = null;
    }
}
