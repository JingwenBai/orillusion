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

/**
 * Orillusion 3D Engine
 *
 * Supports multiple instances — each instance manages its own canvas, scenes, and render loop.
 *
 * Instance usage (multi-instance):
 * ```
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas: myCanvas } });
 * engine.startRenderView(view);
 * ```
 *
 * Static usage (backward compatible, single-instance):
 * ```
 * await Engine3D.init();
 * Engine3D.startRenderView(view);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // ---- Static registry of all engine instances ----

    /** All active Engine3D instances */
    public static readonly instances: Engine3D[] = [];

    /** The most recently active (rendering) Engine3D instance */
    private static _current: Engine3D | null = null;

    /**
     * Pre-init shared default setting. Mutations here before init() are picked up by the first instance.
     * @internal
     */
    private static _defaultSetting: EngineSetting = null;

    // ---- Instance properties ----

    /**
     * Resource manager for this engine instance
     */
    public res: Res;

    /**
     * Input system for this engine instance
     */
    public inputSystem: InputSystem;

    /**
     * Views managed by this engine instance
     */
    public views: View3D[];

    /**
     * Render jobs per view for this engine instance
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * Engine settings for this instance
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

    // Instance render loop state
    private _context: Context3D;
    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ---- Instance getters ----

    /**
     * Set render frameRate 24/30/60/114/120/144/240/360 fps or other
     */
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

    /**
     * Get render window size [width, height]
     */
    public get size(): number[] {
        return this._context.presentationSize;
    }

    /**
     * Get render window aspect ratio
     */
    public get aspect(): number {
        return this._context.aspect;
    }

    /**
     * Get render window width
     */
    public get width(): number {
        return this._context.windowWidth;
    }

    /**
     * Get render window height
     */
    public get height(): number {
        return this._context.windowHeight;
    }

    // ---- Static backward-compat API ----
    // These delegate to Engine3D._current for single-instance usage.

    /** @deprecated Use instance API: `new Engine3D()`. Returns the current active instance. */
    public static get current(): Engine3D | null {
        return this._current;
    }

    /** @deprecated Use instance property. */
    public static get res(): Res { return this._current?.res; }
    /** @deprecated Use instance property. */
    public static set res(v: Res) { if (this._current) this._current.res = v; }

    /** @deprecated Use instance property. */
    public static get inputSystem(): InputSystem { return this._current?.inputSystem; }
    /** @deprecated Use instance property. */
    public static set inputSystem(v: InputSystem) { if (this._current) this._current.inputSystem = v; }

    /** @deprecated Use instance property. */
    public static get views(): View3D[] { return this._current?.views; }
    /** @deprecated Use instance property. */
    public static set views(v: View3D[]) { if (this._current) this._current.views = v; }

    /** @deprecated Use instance property. */
    public static get renderJobs(): Map<View3D, RendererJob> { return this._current?.renderJobs; }

    /**
     * Engine settings. Before init(), mutations go to a shared default that is copied to the
     * first Engine3D instance on init(). After init(), delegates to the current instance.
     */
    public static get setting(): EngineSetting {
        if (this._current) return this._current.setting;
        // Pre-init: return the shared default setting (lazily create from first instance prototype)
        if (!this._defaultSetting) this._defaultSetting = new Engine3D().setting;
        return this._defaultSetting;
    }
    public static set setting(v: EngineSetting) {
        if (this._current) {
            this._current.setting = v;
        } else {
            this._defaultSetting = v;
        }
    }

    /** @deprecated Use instance property. */
    public static get frameRate(): number { return this._current?._frameRate ?? 360; }
    /** @deprecated Use instance property. */
    public static set frameRate(value: number) { if (this._current) this._current.frameRate = value; }

    /** @deprecated Use instance property. */
    public static get size(): number[] { return this._current?.size; }
    /** @deprecated Use instance property. */
    public static get aspect(): number { return this._current?.aspect; }
    /** @deprecated Use instance property. */
    public static get width(): number { return this._current?.width; }
    /** @deprecated Use instance property. */
    public static get height(): number { return this._current?.height; }

    /**
     * Initialize engine (static backward-compat). Creates a default Engine3D instance.
     * For multi-instance, use `new Engine3D()` and call `instance.init(...)` instead.
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<Engine3D> {
        const engine = new Engine3D();
        // Copy any pre-init static setting mutations into the new instance
        if (this._defaultSetting) {
            engine.setting = { ...this._defaultSetting };
        }
        await engine.init(descriptor);
        return engine;
    }

    /** @deprecated Use instance method. */
    public static startRenderView(view: View3D): RendererJob {
        return this._current?.startRenderView(view);
    }

    /** @deprecated Use instance method. */
    public static startRenderViews(views: View3D[]): void {
        this._current?.startRenderViews(views);
    }

    /** @deprecated Use instance method. */
    public static getRenderJob(view: View3D): RendererJob {
        return this._current?.getRenderJob(view);
    }

    /** @deprecated Use instance method. */
    public static pause(): void {
        this._current?.pause();
    }

    /** @deprecated Use instance method. */
    public static resume(): void {
        this._current?.resume();
    }

    // ---- Instance methods ----

    /**
     * Initialize this engine instance.
     * @param descriptor  {@link CanvasConfig}
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext){
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)')
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting }

        // WasmMatrix and ShaderLib are shared across all instances (initialized once)
        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        this._context = new Context3D();
        await this._context.init(descriptor.canvasConfig);

        // Make this instance current so subsystems see this context
        Engine3D._setCurrentEngine(this);

        //****pre compute setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );
        //****pre compute setting****/

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
        this.inputSystem.initCanvas(this._context.canvas);

        Engine3D.instances.push(this);
        return;
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
     * Set the render view and start the render loop for this engine instance.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop for this engine instance.
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
     * Get the render job for a view in this engine instance.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause the render loop of this engine instance.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the render loop of this engine instance.
     */
    public resume(): void {
        if(this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
    }

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
        // Set this engine as current so all subsystems use its context
        Engine3D._setCurrentEngine(this);

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
            let [w, h] = this._context.presentationSize;
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

        let command = this._context.device.createCommandEncoder();;
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

        this._context.device.queue.submit([command.finish()]);

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

    /**
     * Set the current active engine instance and update the module-level webGPUContext.
     * All subsystems read webGPUContext, so this routes their calls to the right instance.
     * @internal
     */
    private static _setCurrentEngine(engine: Engine3D): void {
        this._current = engine;
        setWebGPUContext(engine._context);
    }
}
