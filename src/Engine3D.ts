import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
 * Default EngineSetting values shared as the prototype for all new Engine3D instances.
 * @internal
 */
const _defaultEngineSetting: EngineSetting = {
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

/** @internal Sequential counter used to generate unique engine IDs. */
let _engineIdCounter = 0;

/**
 * Orillusion 3D Engine
 *
 * ## Single-instance usage (backward-compatible static API)
 * ```ts
 * await Engine3D.init();
 * Engine3D.startRenderView(view);
 * ```
 *
 * ## Multi-instance usage (instance API)
 * ```ts
 * const engine1 = new Engine3D();
 * await engine1.init({ canvasConfig: { canvas: canvas1 } });
 * engine1.startRenderView(view1);
 *
 * const engine2 = new Engine3D();
 * await engine2.init({ canvasConfig: { canvas: canvas2 } });
 * engine2.startRenderView(view2);
 * ```
 *
 * -- Engine3D.setting.*
 *
 * -- await Engine3D.init();
 * @group engine3D
 */
export class Engine3D {

    // =========================================================================
    //  STATIC REGISTRY & BACKWARD-COMPATIBLE STATIC API
    // =========================================================================

    /**
     * All active Engine3D instances.
     * The first entry (index 0) is the default instance created by the static
     * `Engine3D.init()` helper.
     */
    public static readonly instances: Engine3D[] = [];

    /**
     * The engine instance that is currently executing its render frame.
     * Set at the start of each `updateFrame` call and cleared when the frame ends.
     * Render-pipeline code that reads `Engine3D.setting` through the static getter
     * always receives the setting for the engine that is currently rendering.
     * @internal
     */
    public static _active: Engine3D | null = null;

    // --- Static property getters / setters (delegate to the default instance) ---

    /** @see Engine3D#res */
    public static get res(): Res { return Engine3D._defaultInstance?.res; }
    public static set res(v: Res) { if (Engine3D._defaultInstance) Engine3D._defaultInstance.res = v; }

    /** @see Engine3D#inputSystem */
    public static get inputSystem(): InputSystem { return Engine3D._defaultInstance?.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D._defaultInstance) Engine3D._defaultInstance.inputSystem = v; }

    /** @see Engine3D#views */
    public static get views(): View3D[] { return Engine3D._defaultInstance?.views; }
    public static set views(v: View3D[]) { if (Engine3D._defaultInstance) Engine3D._defaultInstance.views = v; }

    /**
     * engine setting
     *
     * During rendering the getter returns the setting of the currently-active engine
     * so that all renderer-job / post-effect code receives the correct per-engine
     * configuration without needing to be changed.  Outside of a render frame it
     * returns the default instance's setting (single-engine or first-engine usage).
     */
    public static get setting(): EngineSetting {
        return (Engine3D._active ?? Engine3D._defaultInstance)?.setting;
    }
    public static set setting(v: EngineSetting) {
        const inst = Engine3D._defaultInstance;
        if (inst) inst.setting = v;
    }

    /** @see Engine3D#renderJobs */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._defaultInstance?.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { if (Engine3D._defaultInstance) Engine3D._defaultInstance.renderJobs = v; }

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

    // --- Static methods (delegate to the default instance) ---

    /**
     * Create the default Engine3D instance and initialise it.
     * Equivalent to `new Engine3D(); await engine.init(descriptor)`.
     */
    public static async init(
        descriptor: {
            canvasConfig?: CanvasConfig;
            beforeRender?: Function;
            renderLoop?: Function;
            lateRender?: Function;
            engineSetting?: EngineSetting;
        } = {}
    ): Promise<void> {
        if (!Engine3D._defaultInstance) {
            Engine3D._defaultInstance = new Engine3D();
        }
        await Engine3D._defaultInstance.init(descriptor);
    }

    /**
     * set render view and start renderer (static — uses default instance)
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._defaultInstance?.startRenderView(view);
    }

    /**
     * set render views and start renderer (static — uses default instance)
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._defaultInstance?.startRenderViews(views);
    }

    /**
     * get view render job instance (static — uses default instance)
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._defaultInstance?.getRenderJob(view);
    }

    /**
     * Pause the engine render (static — uses default instance)
     */
    public static pause(): void {
        Engine3D._defaultInstance?.pause();
    }

    /**
     * Resume the engine render (static — uses default instance)
     */
    public static resume(): void {
        Engine3D._defaultInstance?.resume();
    }

    // =========================================================================
    //  INSTANCE STATE
    // =========================================================================

    /**
     * Unique identifier for this engine instance.
     * Used to namespace GBuffer frames and render-target resources so that
     * multiple engines with different canvas sizes do not share render textures.
     * @internal
     */
    public readonly engineId: string;

    /**
     * resource manager for this engine instance
     */
    public res: Res;

    /**
     * input system for this engine instance
     */
    public inputSystem: InputSystem;

    /**
     * views rendered by this engine instance
     */
    public views: View3D[];

    /**
     * Per-view render jobs for this engine instance
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * Per-instance engine settings.
     * Each engine instance starts with a deep copy of the default settings and
     * can be customised independently.
     */
    public setting: EngineSetting;

    /**
     * WebGPU canvas context for this engine instance.
     * The first engine uses `webGPUContext` directly; additional engines own a
     * separate `Context3D` that is activated (swapped into `webGPUContext`) before
     * each render frame.
     * @internal
     */
    public _context: Context3D;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /**
     * Whether the one-time shared subsystem initialisation (ShaderLib, GlobalBindGroup,
     * RTResourceMap, ShadowLightsCollect, WasmMatrix) has already been performed.
     * @internal
     */
    private static _sharedInitDone: boolean = false;

    /** @internal The first engine created via the static init() helper. */
    private static _defaultInstance: Engine3D | null = null;

    constructor() {
        this.engineId = `engine_${_engineIdCounter++}`;
        this.setting = JSON.parse(JSON.stringify({
            ...(_defaultEngineSetting),
            // Color objects are not plain-JSON-serialisable; re-create them after clone.
        }));
        // Restore Color instance (JSON.parse turns it into a plain object).
        this.setting.render.postProcessing.globalFog.fogColor = new Color(
            _defaultEngineSetting.render.postProcessing.globalFog.fogColor.r,
            _defaultEngineSetting.render.postProcessing.globalFog.fogColor.g,
            _defaultEngineSetting.render.postProcessing.globalFog.fogColor.b,
            _defaultEngineSetting.render.postProcessing.globalFog.fogColor.a,
        );
        Engine3D.instances.push(this);
    }

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
     * create webgpu 3d engine instance
     * @param descriptor  {@link CanvasConfig}
     */
    public async init(
        descriptor: {
            canvasConfig?: CanvasConfig;
            beforeRender?: Function;
            renderLoop?: Function;
            lateRender?: Function;
            engineSetting?: EngineSetting;
        } = {}
    ): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Merge any caller-supplied overrides into this instance's setting.
        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // --- One-time shared sub-system initialisation ---
        if (!Engine3D._sharedInitDone) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            // The first engine owns webGPUContext directly.
            await webGPUContext.init(descriptor.canvasConfig);
            this._context = webGPUContext;

            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            RTResourceMap.init();
            ShadowLightsCollect.init();

            Engine3D._sharedInitDone = true;
        } else {
            // Subsequent engines: create a new canvas context that reuses the shared GPU device.
            this._context = new Context3D();
            await this._context.init(descriptor.canvasConfig);
        }

        // --- Per-engine GBuffer initialisation ---
        // Set the active engine context so that GBufferFrame.getGBufferFrame() uses
        // this engine's namespaced keys.
        Engine3D._active = this;
        GBufferFrame.activeEngineId = this.engineId;

        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Activate this engine's canvas so that webGPUContext.presentationSize is correct.
        this._context.activate();

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        GBufferFrame.activeEngineId = '';
        Engine3D._active = null;

        // --- Per-engine instance setup ---
        if (!this.res) {
            this.res = new Res();
            this.res.initDefault();
        }

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this._context.canvas);
    }

    private _startRenderJob(view: View3D): RendererJob {
        // Ensure GBuffer operations are namespaced to this engine.
        GBufferFrame.activeEngineId = this.engineId;

        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this.setting.pick.mode === `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this.setting.pick.mode === `pixel` || this.setting.pick.mode === `bound`) {
            view.enablePick = true;
        }

        GBufferFrame.activeEngineId = '';
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
        Engine3D._active = this;
        let renderJob = this._startRenderJob(view);
        Engine3D._active = null;
        this.resume();
        return renderJob;
    }

    /**
     * set render views and start renderer
     * @param views
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        Engine3D._active = this;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        Engine3D._active = null;
        this.resume();
    }

    /**
     * get view render job instance
     * @param view
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
    }

    /**
     * Pause this engine's render loop
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume this engine's render loop
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    /** @internal */
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

    /** @internal */
    private async _updateFrame(time: number): Promise<void> {
        // Mark this engine as the currently-rendering one so that all static
        // Engine3D.setting references (from render jobs, post effects, etc.) resolve
        // to this instance's configuration.
        Engine3D._active = this;

        // Activate this engine's canvas: copies canvas/presentationSize/etc. into the
        // shared webGPUContext export so every module that imports webGPUContext sees
        // the correct per-engine values during this frame.
        this._context.activate();

        // Keep GBuffer operations namespaced to this engine throughout the frame.
        GBufferFrame.activeEngineId = this.engineId;

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

        GBufferFrame.activeEngineId = '';
        Engine3D._active = null;
    }
}
