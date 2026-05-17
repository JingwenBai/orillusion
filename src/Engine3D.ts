import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { webGPUContext, setCurrentWebGPUContext, Context3D } from './gfx/graphics/webGpu/Context3D';
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

function createDefaultEngineSetting(): EngineSetting {
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
 * Single-instance (legacy) usage:
 *   await Engine3D.init({ canvasConfig: { canvas } });
 *   Engine3D.startRenderView(view);
 *
 * Multi-instance usage:
 *   const engine1 = new Engine3D();
 *   await engine1.init({ canvasConfig: { canvas: canvas1 } });
 *   engine1.startRenderView(view1);
 *
 *   const engine2 = new Engine3D();
 *   await engine2.init({ canvasConfig: { canvas: canvas2 } });
 *   engine2.startRenderView(view2);
 *
 * @group engine3D
 */
export class Engine3D {

    // ─── Instance state ────────────────────────────────────────────────────────

    /** Resource manager for this engine instance */
    public res: Res;

    /** Input system for this engine instance */
    public inputSystem: InputSystem;

    /** Active render views for this engine instance */
    public views: View3D[];

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /** Per-instance engine settings (copied from defaults at construction) */
    public setting: EngineSetting = createDefaultEngineSetting();

    /** @internal WebGPU context owned by this engine instance */
    public _context: Context3D;

    private _rtResourceMap: RTResourceMap;
    private _gBufferFrameMap: Map<string, GBufferFrame>;
    private _viewSet: Set<View3D> = new Set();
    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ─── Static registry ───────────────────────────────────────────────────────

    /** The engine instance whose context is currently active */
    private static _active: Engine3D | null = null;

    /** All initialised engine instances */
    private static _instances: Engine3D[] = [];

    /** Guards that are safe to run only once across all instances */
    private static _wasmInitialized: boolean = false;

    // ─── Backward-compatible static API ────────────────────────────────────────
    // These delegate to the currently-active engine so that existing single-
    // instance code (Engine3D.res, Engine3D.setting, …) continues to work.

    /** @deprecated Use instance API for multi-engine support */
    public static get res(): Res { return Engine3D._active?.res; }

    /** @deprecated Use instance API for multi-engine support */
    public static get inputSystem(): InputSystem { return Engine3D._active?.inputSystem; }

    /** @deprecated Use instance API for multi-engine support */
    public static get views(): View3D[] { return Engine3D._active?.views; }

    /**
     * engine setting
     * @deprecated Use instance API for multi-engine support
     */
    public static get setting(): EngineSetting {
        return Engine3D._active?.setting ?? Engine3D._staticDefaultSetting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D._active) Engine3D._active.setting = v;
        else Engine3D._staticDefaultSetting = v;
    }
    private static _staticDefaultSetting: EngineSetting = createDefaultEngineSetting();

    /** @deprecated Use instance API for multi-engine support */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._active?.renderJobs;
    }

    /** get render window size width and height */
    public static get size(): number[] { return webGPUContext.presentationSize; }

    /** get render window aspect */
    public static get aspect(): number { return webGPUContext.aspect; }

    /** get render window size width */
    public static get width(): number { return webGPUContext.windowWidth; }

    /** get render window size height */
    public static get height(): number { return webGPUContext.windowHeight; }

    /**
     * set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
     * @deprecated Use instance API for multi-engine support
     */
    public static get frameRate(): number {
        return Engine3D._active?._frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (Engine3D._active) Engine3D._active.frameRate = value;
    }

    // ─── Instance frameRate ─────────────────────────────────────────────────────

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    // ─── Active-context management ──────────────────────────────────────────────

    /**
     * Make this engine the active one. Swaps the global WebGPU context,
     * RTResourceMap, and GBufferFrame map to this engine's instances.
     * Called automatically at the start of every render frame.
     */
    public setAsActive() {
        Engine3D._active = this;
        setCurrentWebGPUContext(this._context);
        this._rtResourceMap?.activate();
        if (this._gBufferFrameMap) GBufferFrame.activateMap(this._gBufferFrameMap);
        GPUContext.reset();
    }

    // ─── Instance init ──────────────────────────────────────────────────────────

    /**
     * Initialise this engine instance against a canvas.
     * @param descriptor  {@link CanvasConfig}
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // WasmMatrix is a shared native module — initialise only once.
        if (!Engine3D._wasmInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            Engine3D._wasmInitialized = true;
        }

        // Create a per-instance WebGPU context, sharing the device when possible.
        this._context = new Context3D();
        const sharedDevice = Engine3D._instances.length > 0
            ? Engine3D._instances[0]._context.device
            : undefined;
        await this._context.init(descriptor.canvasConfig, sharedDevice);

        // Activate this context so subsequent calls hit the right state.
        this._rtResourceMap = new RTResourceMap();
        this._gBufferFrameMap = new Map<string, GBufferFrame>();
        this.setAsActive();

        // Reflection GBuffer (per-instance size)
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

        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();   // guarded: runs once across all instances
        ShadowLightsCollect.init(); // guarded: runs once across all instances

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this._context.canvas);

        Engine3D._instances.push(this);
    }

    // ─── Static backward-compat wrappers ───────────────────────────────────────

    /**
     * Create and initialise the default (single-instance) engine.
     * For multi-instance usage prefer `new Engine3D().init(...)` instead.
     * @param descriptor  {@link CanvasConfig}
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        return engine.init(descriptor);
    }

    /** @deprecated Use instance `startRenderView()` for multi-engine support */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._active.startRenderView(view);
    }

    /** @deprecated Use instance `startRenderViews()` for multi-engine support */
    public static startRenderViews(views: View3D[]) {
        return Engine3D._active.startRenderViews(views);
    }

    /**
     * get view render job instance
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._active?.renderJobs?.get(view);
    }

    /** Pause the engine render */
    public static pause() { Engine3D._active?.pause(); }

    /** Resume the engine render */
    public static resume() { Engine3D._active?.resume(); }

    // ─── Instance render control ────────────────────────────────────────────────

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
     * Set render view and start renderer
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        this._viewSet = new Set([view]);
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set render views and start renderer
     */
    public startRenderViews(views: View3D[]) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        this._viewSet = new Set(views);
        for (let i = 0; i < views.length; i++) {
            this.startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * get view render job instance (instance API)
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
    }

    /** Pause this engine instance */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume this engine instance */
    public resume() {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
    }

    /** @internal */
    private async render(time: number) {
        // Activate this engine's context before any GPU work.
        this.setAsActive();

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

        // Re-activate after any async suspension point.
        this.setAsActive();
        await this.updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async updateFrame(time: number) {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) {
            await this._beforeRender();
            this.setAsActive();
        }

        // ── Before-update pass (this engine's views only) ──────────────────────
        for (const iterator of ComponentCollect.componentsBeforeUpdateList) {
            let k = iterator[0];
            if (!this._viewSet.has(k)) continue;
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k); }
            }
        }

        let command = webGPUContext.device.createCommandEncoder();
        for (const iterator of ComponentCollect.componentsComputeList) {
            let k = iterator[0];
            if (!this._viewSet.has(k)) continue;
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k, command); }
            }
        }
        webGPUContext.device.queue.submit([command.finish()]);

        // ── Update pass (this engine's views only) ─────────────────────────────
        for (const iterator of ComponentCollect.componentsUpdateList) {
            let k = iterator[0];
            if (!this._viewSet.has(k)) continue;
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k); }
            }
        }

        for (const iterator of ComponentCollect.graphicComponent) {
            let k = iterator[0];
            if (!this._viewSet.has(k)) continue;
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (k && f.enable) { c(k); }
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
            this.setAsActive();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) { v.start(); }
            v.renderFrame();
        });

        // ── Late-update pass (this engine's views only) ────────────────────────
        for (const iterator of ComponentCollect.componentsLateUpdateList) {
            let k = iterator[0];
            if (!this._viewSet.has(k)) continue;
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k); }
            }
        }

        if (this._lateRender) {
            await this._lateRender();
            this.setAsActive();
        }
    }
}
