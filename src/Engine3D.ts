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
import { GPUContext } from './gfx/renderJob/GPUContext';

/**
 * Default engine settings template — configure before calling Engine3D.init() or new Engine3D().init().
 */
const defaultEngineSetting: EngineSetting = {
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
 * Orillusion 3D Engine
 *
 * Supports both singleton (static API) and multi-instance (new Engine3D()) usage:
 *
 * Singleton (backward-compatible):
 *   Engine3D.setting.render.gi = true;
 *   await Engine3D.init({ canvasConfig: { canvas } });
 *   Engine3D.startRenderView(view);
 *
 * Multi-instance:
 *   const engine1 = new Engine3D();
 *   const engine2 = new Engine3D();
 *   await engine1.init({ canvasConfig: { canvas: canvas1 } });
 *   await engine2.init({ canvasConfig: { canvas: canvas2 } });
 *   engine1.startRenderView(view1);
 *   engine2.startRenderView(view2);
 *
 * @group engine3D
 */
export class Engine3D {

    // ─── Instance state ──────────────────────────────────────────────────────

    /** WebGPU canvas context for this engine instance */
    public context: Context3D;

    /** Resource manager for this engine instance */
    public res: Res;

    /** Input system for this engine instance */
    public inputSystem: InputSystem;

    /** Active views for this engine instance */
    public views: View3D[];

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /** Per-instance RTResourceMap (render texture registry) */
    public rtResourceMap: RTResourceMap;

    /** Per-instance GBuffer frame map */
    public gBufferFrameMap: Map<string, GBufferFrame>;

    /** Per-instance Time tracking */
    public time: Time;

    /**
     * Engine settings for this instance.
     * Starts as a copy of the static Engine3D.setting template.
     */
    public setting: EngineSetting;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _localTime: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /** Set frame rate for this instance */
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

    constructor() {
        this.context = new Context3D();
        this.gBufferFrameMap = new Map<string, GBufferFrame>();
        this.rtResourceMap = new RTResourceMap();
        this.time = new Time();
        // Copy the static setting template so each instance starts with defaults
        this.setting = JSON.parse(JSON.stringify(Engine3D.setting));
        // Color objects are lost in JSON serialization; restore them
        this.setting.render.postProcessing.globalFog.fogColor = new Color(
            Engine3D.setting.render.postProcessing.globalFog.fogColor.r,
            Engine3D.setting.render.postProcessing.globalFog.fogColor.g,
            Engine3D.setting.render.postProcessing.globalFog.fogColor.b,
            Engine3D.setting.render.postProcessing.globalFog.fogColor.a,
        );
    }

    /**
     * Initialize this engine instance and its WebGPU canvas context.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Apply per-instance setting overrides
        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }
        // Keep the global static setting in sync with the first instance
        if (!Engine3D._defaultInstance) {
            Engine3D.setting = { ...this.setting };
        }

        // WasmMatrix init is idempotent — safe to call on every instance
        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        await this.context.init(descriptor.canvasConfig);

        // Activate this instance's resource registries before setup calls
        this._activateResources();

        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // One-time global setup (idempotent, safe for multi-instance)
        if (!Engine3D._globalInitDone) {
            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            ShadowLightsCollect.init();
            Engine3D._globalInitDone = true;
        }

        RTResourceMap._active = this.rtResourceMap;
        RTResourceMap.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);

        // The first instance also initialises the static backward-compat layer
        if (!Engine3D._defaultInstance) {
            Engine3D._defaultInstance = this;
        }
    }

    /** @internal – set per-instance render registries as the active context */
    private _activateResources() {
        RTResourceMap._active = this.rtResourceMap;
        GBufferFrame._activeMap = this.gBufferFrameMap;
        GPUContext.currentCanvasContext = this.context.context;
    }

    private _startRenderJob(view: View3D): RendererJob {
        view.engine = this;
        this._activateResources();

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
     * Set render view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop.
     */
    public startRenderViews(views: View3D[]) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the render job for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause the render loop for this instance.
     */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the render loop for this instance.
     */
    public resume() {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
    }

    private async _render(time: number) {
        if (this._frameRateValue > 0) {
            let delta = time - this._localTime;
            if (delta < this._frameRateValue) {
                let t = performance.now();
                await new Promise(res => {
                    setTimeout(() => {
                        time += (performance.now() - t);
                        res(true);
                    }, this._frameRateValue - delta);
                });
            }
            this._localTime = time;
        }
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number) {
        // Activate this instance's resources so all static accessors route here
        this._activateResources();

        this.time.delta = time - this.time.time;
        this.time.time = time;
        this.time.frame += 1;

        // Update the global Time singleton (backward compat for code that reads Time.time)
        Time.delta = this.time.delta;
        Time.time = this.time.time;
        Time.frame = this.time.frame;

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
                };
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
                };
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
                };
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // ─── Static backward-compat API ──────────────────────────────────────────

    /** @internal */
    private static _defaultInstance: Engine3D | null = null;
    /** @internal – true once ShaderLib/ShaderUtil/GlobalBindGroup/ShadowLights have been set up */
    private static _globalInitDone: boolean = false;

    /** Lazily create or return the default singleton instance */
    private static get _instance(): Engine3D {
        if (!this._defaultInstance) {
            this._defaultInstance = new Engine3D();
        }
        return this._defaultInstance;
    }

    /**
     * Global engine settings template.
     * For the static API this is both the read and write target.
     * New Engine3D() instances start with a copy of this object.
     */
    public static setting: EngineSetting = defaultEngineSetting;

    // ── Static property proxies ──

    public static get res(): Res { return this._instance.res; }
    public static set res(v: Res) { this._instance.res = v; }

    public static get inputSystem(): InputSystem { return this._instance.inputSystem; }
    public static set inputSystem(v: InputSystem) { this._instance.inputSystem = v; }

    public static get views(): View3D[] { return this._instance.views; }
    public static set views(v: View3D[]) { this._instance.views = v; }

    /** @internal */
    public static get renderJobs(): Map<View3D, RendererJob> { return this._instance.renderJobs; }

    public static get frameRate(): number { return this._instance.frameRate; }
    public static set frameRate(v: number) { this._instance.frameRate = v; }

    public static get size(): number[] { return this._instance.size; }
    public static get aspect(): number { return this._instance.aspect; }
    public static get width(): number { return this._instance.width; }
    public static get height(): number { return this._instance.height; }

    // ── Static method proxies ──

    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        // Merge per-init overrides into the static setting template first
        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }
        // Copy the (now-updated) static setting into the instance before init so the
        // instance doesn't re-merge engineSetting a second time
        this._instance.setting = { ...this.setting };
        // Pass descriptor without engineSetting to avoid double-applying it
        const { engineSetting, ...rest } = descriptor;
        return this._instance.init(rest);
    }

    public static startRenderView(view: View3D): RendererJob {
        return this._instance.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]) {
        return this._instance.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return this._instance.getRenderJob(view);
    }

    public static pause() {
        this._instance.pause();
    }

    public static resume() {
        this._instance.resume();
    }
}
