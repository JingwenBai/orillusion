import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D } from './gfx/graphics/webGpu/Context3D';
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
import { PipelinePool } from './gfx/graphics/webGpu/PipelinePool';
import { GPUContextCache, createGPUContextCache } from './gfx/renderJob/GPUContext';
import { setActiveEngine } from './_activeEngine';

/** @internal  Shape of the per-engine Time state stored on each Engine3D. */
export interface EngineTimeState {
    time: number;
    frame: number;
    delta: number;
}

/**
 * Orillusion 3D Engine — now fully instantiable for multi-instance support.
 *
 * ```ts
 * // Multiple canvases / multiple instances:
 * const engineA = new Engine3D();
 * await engineA.init({ canvasConfig: { canvas: canvasA } });
 * engineA.startRenderView(viewA);
 *
 * const engineB = new Engine3D();
 * await engineB.init({ canvasConfig: { canvas: canvasB } });
 * engineB.startRenderView(viewB);
 * ```
 *
 * The previous all-static API is preserved as static getters/methods that
 * delegate to `Engine3D.active` for backward compatibility.
 *
 * @group engine3D
 */
export class Engine3D {

    // ══════════════════════════════════════════════════════════════════════════
    // Per-engine state
    // ══════════════════════════════════════════════════════════════════════════

    /** Per-engine WebGPU context (canvas, device, adapter, …). */
    public webGPUContext: Context3D;

    /** Resource manager. */
    public res: Res;

    /** Input event system. */
    public inputSystem: InputSystem;

    /** Active render views. */
    public views: View3D[];

    /** Map from View3D to its RendererJob. */
    public renderJobs: Map<View3D, RendererJob>;

    /** Engine settings. */
    public setting: EngineSetting;

    // ── internal per-engine service instances ─────────────────────────────────
    /** @internal */ public _globalBindGroup: GlobalBindGroup;
    /** @internal */ public _shaderUtil: ShaderUtil;
    /** @internal */ public _pipelinePool: PipelinePool;
    /** @internal */ public _rtResourceMap: RTResourceMap;
    /** @internal */ public _gBufferMap: Map<string, GBufferFrame>;
    /** @internal */ public _entityCollect: EntityCollect;
    /** @internal */ public _gpuContextCache: GPUContextCache;
    /** @internal */ public _timeState: EngineTimeState;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.setting = Engine3D._createDefaultSetting();
        this._gBufferMap = new Map<string, GBufferFrame>();
        this._entityCollect = new EntityCollect();
        this._globalBindGroup = new GlobalBindGroup();
        this._shaderUtil = new ShaderUtil();
        this._pipelinePool = new PipelinePool();
        this._rtResourceMap = new RTResourceMap();
        this._gpuContextCache = createGPUContextCache();
        this._timeState = { time: 0, frame: 0, delta: 0 };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Active-engine registry
    // ══════════════════════════════════════════════════════════════════════════

    private static _active: Engine3D | null = null;

    /**
     * The engine currently initialising or rendering.
     * Set automatically; read by all per-engine static shims in the subsystems.
     */
    public static get active(): Engine3D | null { return Engine3D._active; }
    public static set active(v: Engine3D | null) {
        Engine3D._active = v;
        setActiveEngine(v);   // keep _activeEngine.ts in sync
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Instance API
    // ══════════════════════════════════════════════════════════════════════════

    /** Current render frame rate cap. */
    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    public get size(): number[] { return this.webGPUContext.presentationSize; }
    public get aspect(): number { return this.webGPUContext.aspect; }
    public get width(): number { return this.webGPUContext.windowWidth; }
    public get height(): number { return this.webGPUContext.windowHeight; }

    /**
     * Initialise the engine: create the WebGPU context, compile built-in
     * shaders, set up global bind groups, and prepare default resources.
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

        // Activate this engine so all static shims point to its state.
        Engine3D.active = this;

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        this.webGPUContext = new Context3D();
        await this.webGPUContext.init(descriptor.canvasConfig);

        // Pre-compute reflection GBuffer (does NOT need RTResourceMap yet).
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

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
        this.inputSystem.initCanvas(this.webGPUContext.canvas);
    }

    private startRenderJob(view: View3D): RendererJob {
        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this.setting.pick.mode === 'pixel') {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this.setting.pick.mode === 'pixel' || this.setting.pick.mode === 'bound') {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Assign a single render view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        Engine3D.active = this;
        view.engine = this;
        this.renderJobs = this.renderJobs ?? new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Assign multiple render views and start the render loop.
     */
    public startRenderViews(views: View3D[]): void {
        Engine3D.active = this;
        this.renderJobs = this.renderJobs ?? new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            views[i].engine = this;
            this.startRenderJob(views[i]);
        }
        this.resume();
    }

    /** Get the RendererJob for a given view. */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
    }

    /** Pause the render loop. */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume the render loop. */
    public resume(): void {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
    }

    private async render(time: number): Promise<void> {
        // Activate this engine before every frame so all static shims point here.
        Engine3D.active = this;

        if (this._frameRateValue > 0) {
            let delta = time - this._time;
            if (delta < this._frameRateValue) {
                let t = performance.now();
                await new Promise<void>(res => {
                    setTimeout(() => {
                        time += (performance.now() - t);
                        res();
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
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        let views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.webGPUContext.presentationSize;
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
                if (f.enable) c(k);
            }
        }

        let command = this.webGPUContext.device.createCommandEncoder();
        for (const iterator of ComponentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k, command);
            }
        }
        this.webGPUContext.device.queue.submit([command.finish()]);

        for (const iterator of ComponentCollect.componentsUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        for (const iterator of ComponentCollect.graphicComponent) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop)
            await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);

        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const iterator of ComponentCollect.componentsLateUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Static backward-compatibility shims
    // These all delegate to Engine3D.active so existing code keeps working.
    // ══════════════════════════════════════════════════════════════════════════

    /** @deprecated Use an instance: `new Engine3D()` */
    public static get res(): Res { return Engine3D.active?.res; }
    /** @deprecated Use an instance: `new Engine3D()` */
    public static get inputSystem(): InputSystem { return Engine3D.active?.inputSystem; }
    /** @deprecated Use an instance: `new Engine3D()` */
    public static get views(): View3D[] { return Engine3D.active?.views; }
    /** @deprecated Use an instance: `new Engine3D()` */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D.active?.renderJobs; }
    /** @deprecated Use an instance: `new Engine3D()` */
    public static get setting(): EngineSetting { return Engine3D.active?.setting; }
    /** @deprecated Use an instance: `new Engine3D()` */
    public static get frameRate(): number { return Engine3D.active?.frameRate ?? 360; }
    /** @deprecated Use an instance: `new Engine3D()` */
    public static set frameRate(v: number) { if (Engine3D.active) Engine3D.active.frameRate = v; }
    /** @deprecated Use an instance: `new Engine3D()` */
    public static get size(): number[] { return Engine3D.active?.size; }
    /** @deprecated Use an instance: `new Engine3D()` */
    public static get aspect(): number { return Engine3D.active?.aspect ?? 1; }
    /** @deprecated Use an instance: `new Engine3D()` */
    public static get width(): number { return Engine3D.active?.width ?? 0; }
    /** @deprecated Use an instance: `new Engine3D()` */
    public static get height(): number { return Engine3D.active?.height ?? 0; }

    /** @deprecated Use an instance: `await new Engine3D().init(...)` */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = Engine3D.active ?? new Engine3D();
        Engine3D.active = engine;
        await engine.init(descriptor);
    }

    /** @deprecated Use an instance method */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D.active?.startRenderView(view);
    }

    /** @deprecated Use an instance method */
    public static startRenderViews(views: View3D[]): void {
        Engine3D.active?.startRenderViews(views);
    }

    /** @deprecated Use an instance method */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.active?.getRenderJob(view);
    }

    /** @deprecated Use an instance method */
    public static pause(): void { Engine3D.active?.pause(); }

    /** @deprecated Use an instance method */
    public static resume(): void { Engine3D.active?.resume(); }

    // ══════════════════════════════════════════════════════════════════════════
    // Private helpers
    // ══════════════════════════════════════════════════════════════════════════

    private static _createDefaultSetting(): EngineSetting {
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
                        hdr: 1.0,
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
                        intensity: 0.5,
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
                materialDebug: false,
            },
            loader: {
                numConcurrent: 20,
            },
            reflectionSetting: {
                reflectionProbeMaxCount: 8,
                reflectionProbeSize: 256,
                width: 256 * 6,
                height: 8 * 256,
                enable: true,
            },
        };
    }
}
