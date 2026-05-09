import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, webGPUContext, setWebGPUContext } from './gfx/graphics/webGpu/Context3D';
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
 * Default engine settings shared across all engine instances before any instance is initialized.
 * @internal
 */
const _defaultSetting: EngineSetting = {
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
 * Orillusion 3D Engine — supports multiple independent instances.
 *
 * Single-instance (backward compatible):
 *   Engine3D.setting.*
 *   await Engine3D.init();
 *
 * Multi-instance:
 *   const eng = new Engine3D();
 *   await eng.init({ canvasConfig: { canvas: myCanvas } });
 *
 * @group engine3D
 */
export class Engine3D {

    // =========================================================
    // Static registry — all active Engine3D instances
    // =========================================================
    private static _instances: Engine3D[] = [];

    /**
     * All active Engine3D instances.
     */
    public static get instances(): Engine3D[] {
        return Engine3D._instances;
    }

    // =========================================================
    // Static backward-compatible accessors
    // (delegate to the most recently initialized engine instance)
    // =========================================================

    /**
     * Resource manager of the most recently initialized engine.
     */
    public static get res(): Res {
        return Engine3D._instances[Engine3D._instances.length - 1]?.res;
    }

    /**
     * Input system of the most recently initialized engine.
     */
    public static get inputSystem(): InputSystem {
        return Engine3D._instances[Engine3D._instances.length - 1]?.inputSystem;
    }

    /**
     * Active views of the most recently initialized engine.
     */
    public static get views(): View3D[] {
        return Engine3D._instances[Engine3D._instances.length - 1]?.views;
    }

    /**
     * Render jobs of the most recently initialized engine.
     */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._instances[Engine3D._instances.length - 1]?.renderJobs;
    }

    /**
     * Engine setting. Before any engine is initialized returns the shared default setting.
     * After initialization returns the most recently initialized engine's setting.
     */
    public static get setting(): EngineSetting {
        const last = Engine3D._instances[Engine3D._instances.length - 1];
        return last ? last.setting : _defaultSetting;
    }

    public static set setting(v: EngineSetting) {
        const last = Engine3D._instances[Engine3D._instances.length - 1];
        if (last) {
            last.setting = v;
        } else {
            Object.assign(_defaultSetting, v);
        }
    }

    public static get size(): number[] {
        return Engine3D._instances[Engine3D._instances.length - 1]?.size;
    }

    public static get aspect(): number {
        return Engine3D._instances[Engine3D._instances.length - 1]?.aspect ?? 1;
    }

    public static get width(): number {
        return Engine3D._instances[Engine3D._instances.length - 1]?.width ?? 0;
    }

    public static get height(): number {
        return Engine3D._instances[Engine3D._instances.length - 1]?.height ?? 0;
    }

    public static get frameRate(): number {
        return Engine3D._instances[Engine3D._instances.length - 1]?.frameRate ?? 360;
    }

    public static set frameRate(value: number) {
        const last = Engine3D._instances[Engine3D._instances.length - 1];
        if (last) last.frameRate = value;
    }

    /**
     * Find a RendererJob by View3D across all engine instances.
     */
    public static getRenderJob(view: View3D): RendererJob {
        for (const engine of Engine3D._instances) {
            const job = engine.renderJobs?.get(view);
            if (job) return job;
        }
        return null;
    }

    /**
     * Pause all engine instances.
     */
    public static pause() {
        Engine3D._instances.forEach(e => e.pause());
    }

    /**
     * Resume all engine instances.
     */
    public static resume() {
        Engine3D._instances.forEach(e => e.resume());
    }

    /**
     * Static init for backward compatibility.
     * Creates a default Engine3D instance and initializes it.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<Engine3D> {
        const engine = new Engine3D();
        await engine.init(descriptor);
        return engine;
    }

    /**
     * Static startRenderView for backward compatibility.
     * Delegates to the most recently initialized engine instance.
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._instances[Engine3D._instances.length - 1]?.startRenderView(view);
    }

    /**
     * Static startRenderViews for backward compatibility.
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._instances[Engine3D._instances.length - 1]?.startRenderViews(views);
    }

    // =========================================================
    // Instance members — one set per Engine3D instance
    // =========================================================

    /**
     * Resource manager for this engine instance.
     */
    public res: Res;

    /**
     * Input system for this engine instance.
     */
    public inputSystem: InputSystem;

    /**
     * Active views for this engine instance.
     */
    public views: View3D[];

    /**
     * Per-instance engine setting (initialized from the shared default on init).
     */
    public setting: EngineSetting;

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /** @internal */
    private _context: Context3D;
    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /**
     * Set render frame rate (24/30/60/120/144/240/360 fps or other).
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

    public get size(): number[] {
        return this._context.presentationSize;
    }

    public get aspect(): number {
        return this._context.aspect;
    }

    public get width(): number {
        return this._context.windowWidth;
    }

    public get height(): number {
        return this._context.windowHeight;
    }

    /**
     * Initialize this engine instance.
     * Each call creates an independent WebGPU canvas context.
     * The underlying GPUDevice is shared across all instances.
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

        // Shallow-copy defaults then apply per-instance overrides (same behaviour as original).
        this.setting = { ..._defaultSetting };
        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // Register this instance so static accessors resolve to it
        Engine3D._instances.push(this);

        // WasmMatrix is initialized once (idempotent after first call)
        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        // Each engine instance gets its own canvas context;
        // the GPUDevice is shared across all instances via Context3D.sharedDevice.
        this._context = new Context3D();
        await this._context.init(descriptor.canvasConfig);

        // Make this instance's context the active one for all downstream rendering code
        setWebGPUContext(this._context);

        // Pre-compute reflection settings
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // Global one-time inits (idempotent — skip if already initialized)
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
     * Set render view and start the render loop for this engine instance.
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
            this.startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get a RendererJob by View3D for this engine instance.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause the render loop for this engine instance.
     */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the render loop for this engine instance.
     */
    public resume() {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
        }
    }

    /**
     * @internal
     */
    private async render(time: number) {
        // Activate this engine's WebGPU context before rendering.
        // JS is single-threaded so RAF callbacks never interleave.
        setWebGPUContext(this._context);

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

    private async updateFrame(time: number) {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const myViews = this.views;
        const myViewSet = new Set(myViews);

        for (let i = 0; i < myViews.length; i++) {
            const view = myViews[i];
            view.scene.waitUpdate();
            let [w, h] = this._context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        /****** before update — only this engine's views *****/
        for (const [view, compMap] of ComponentCollect.componentsBeforeUpdateList) {
            if (!myViewSet.has(view)) continue;
            for (const [comp, fn] of compMap) {
                if (comp.enable) fn(view);
            }
        }

        let command = this._context.device.createCommandEncoder();
        for (const [view, compMap] of ComponentCollect.componentsComputeList) {
            if (!myViewSet.has(view)) continue;
            for (const [comp, fn] of compMap) {
                if (comp.enable) fn(view, command);
            }
        }
        this._context.device.queue.submit([command.finish()]);

        /****** update — only this engine's views *****/
        for (const [view, compMap] of ComponentCollect.componentsUpdateList) {
            if (!myViewSet.has(view)) continue;
            for (const [comp, fn] of compMap) {
                if (comp.enable) fn(view);
            }
        }

        for (const [view, compMap] of ComponentCollect.graphicComponent) {
            if (!myViewSet.has(view)) continue;
            for (const [comp, fn] of compMap) {
                if (view && comp.enable) fn(view);
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        /****** write global matrix buffer to GPU *****/
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        /****** late update — only this engine's views *****/
        for (const [view, compMap] of ComponentCollect.componentsLateUpdateList) {
            if (!myViewSet.has(view)) continue;
            for (const [comp, fn] of compMap) {
                if (comp.enable) fn(view);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
