import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveContext } from './gfx/graphics/webGpu/Context3D';
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
import { GPUContext } from './gfx/renderJob/GPUContext';

function buildDefaultSetting(): EngineSetting {
    return {
        doublePrecision: false,
        occlusionQuery: { enable: true, debug: false },
        pick: { enable: true, mode: `bound`, detail: `mesh` },
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
                    downSampleStep: 3, downSampleBlurSize: 9, downSampleBlurSigma: 1.0,
                    upSampleBlurSize: 9, upSampleBlurSigma: 1.0,
                    luminanceThreshole: 1.0, bloomIntensity: 1.0, hdr: 1.0,
                },
                globalFog: {
                    debug: false, enable: false, fogType: 0.0, fogHeightScale: 0.1,
                    start: 400, end: 10, density: 0.02, ins: 0.5, skyFactor: 0.5,
                    skyRoughness: 0.4, overrideSkyFactor: 0.8,
                    fogColor: new Color(96 / 255, 117 / 255, 133 / 255, 1),
                    falloff: 0.7, rayLength: 200.0, scatteringExponent: 2.7, dirHeightLine: 10.0,
                },
                godRay: { blendColor: true, rayMarchCount: 16, scatteringExponent: 5, intensity: 0.5 },
                ssao: { enable: false, radius: 0.15, bias: -0.1, aoPower: 2.0, debug: true },
                outline: {
                    enable: false, strength: 1, groupCount: 4, outlinePixel: 2,
                    fadeOutlinePixel: 4, textureScale: 1, useAddMode: false, debug: true,
                },
                taa: {
                    enable: false, jitterSeedCount: 8, blendFactor: 0.1, sharpFactor: 0.6,
                    sharpPreBlurFactor: 0.5, temporalJitterScale: 0.13, debug: true,
                },
                gtao: {
                    enable: false, darkFactor: 1.0, maxDistance: 5.0, maxPixel: 50.0,
                    rayMarchSegment: 6, multiBounce: false, usePosFloat32: true,
                    blendColor: true, debug: true,
                },
                ssr: {
                    enable: false, pixelRatio: 1, fadeEdgeRatio: 0.2, rayMarchRatio: 0.5,
                    fadeDistanceMin: 600, fadeDistanceMax: 2000, roughnessThreshold: 0.5,
                    powDotRN: 0.2, mixThreshold: 0.1, debug: true,
                },
                fxaa: { enable: false },
                depthOfView: { enable: false, iterationCount: 3, pixelOffset: 1.0, near: 150, far: 300 },
            },
        },
        shadow: {
            enable: true, type: 'HARD', pointShadowBias: 0.0005, shadowSize: 2048,
            pointShadowSize: 1024, shadowSoft: 0.005, shadowBound: 100, shadowBias: 0.05,
            needUpdate: true, autoUpdate: true, updateFrameRate: 2, csmMargin: 0.1,
            csmScatteringExp: 0.7, csmAreaScale: 0.4, debug: false,
        },
        gi: {
            enable: false, offsetX: 0, offsetY: 0, offsetZ: 0, probeSpace: 64,
            probeXCount: 4, probeYCount: 2, probeZCount: 4, probeSize: 32,
            probeSourceTextureSize: 2048, octRTMaxSize: 2048, octRTSideSize: 16,
            maxDistance: 64 * 1.73, normalBias: 0.25, depthSharpness: 1, hysteresis: 0.98,
            lerpHysteresis: 0.01, irradianceChebyshevBias: 0.01, rayNumber: 144,
            irradianceDistanceBias: 32, indirectIntensity: 1.0, ddgiGamma: 2.2,
            bounceIntensity: 0.025, probeRoughness: 1, realTimeGI: false,
            debug: false, autoRenderProbe: false,
        },
        sky: { type: 'HDRSKY', sky: null, skyExposure: 1.0, defaultFar: 65536, defaultNear: 1 },
        light: { maxLight: 4096 },
        material: { materialChannelDebug: false, materialDebug: false },
        loader: { numConcurrent: 20 },
        reflectionSetting: {
            reflectionProbeMaxCount: 8, reflectionProbeSize: 256,
            width: 256 * 6, height: 8 * 256, enable: true,
        },
    };
}

/**
 * Orillusion 3D Engine
 *
 * Supports multiple simultaneous instances. Instantiate via `new Engine3D()` then call `await engine.init(...)`.
 * The static API (`Engine3D.init`, `Engine3D.setting`, …) is preserved for single-instance backward compat
 * and delegates to `Engine3D._current`.
 *
 * @group engine3D
 */
export class Engine3D {

    // ── Static multi-instance registry ────────────────────────────────────────

    /**
     * All active Engine3D instances.
     */
    public static readonly instances: Engine3D[] = [];

    /**
     * The engine instance that is currently rendering (set before each render frame).
     * Static accessor methods delegate to this instance.
     */
    public static _current: Engine3D | null = null;

    // ── Instance subsystems ───────────────────────────────────────────────────

    public webGPUContext: Context3D;
    public componentCollect: ComponentCollect;
    public entityCollect: EntityCollect;
    public globalBindGroup: GlobalBindGroup;
    public rtResourceMap: RTResourceMap;
    public shadowLightsCollect: ShadowLightsCollect;
    public gpuContext: GPUContext;
    /** Per-engine G-buffer frame cache */
    public gBufferMap: Map<string, GBufferFrame> = new Map();

    public res: Res;
    public inputSystem: InputSystem;
    public views: View3D[] = [];
    public renderJobs: Map<View3D, RendererJob> = new Map();
    public setting: EngineSetting;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.setting = buildDefaultSetting();
        this.webGPUContext = new Context3D();
        this.componentCollect = new ComponentCollect();
        this.entityCollect = new EntityCollect();
        this.globalBindGroup = new GlobalBindGroup();
        this.rtResourceMap = new RTResourceMap();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.gpuContext = new GPUContext();
        Engine3D.instances.push(this);
        // Become active immediately so subsystems work before the render loop starts
        this._setActive();
    }

    /** Activate this engine's subsystems as the current static singletons. */
    private _setActive() {
        Engine3D._current = this;
        setActiveContext(this.webGPUContext);
        ComponentCollect._active = this.componentCollect;
        EntityCollect._active = this.entityCollect;
        GlobalBindGroup._active = this.globalBindGroup;
        RTResourceMap._active = this.rtResourceMap;
        ShadowLightsCollect._active = this.shadowLightsCollect;
        GPUContext._active = this.gpuContext;
        GBufferFrame._active = this.gBufferMap;
    }

    // ── Instance getters ──────────────────────────────────────────────────────

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    public get size(): number[] { return this.webGPUContext.presentationSize; }
    public get aspect(): number { return this.webGPUContext.aspect; }
    public get width(): number { return this.webGPUContext.windowWidth; }
    public get height(): number { return this.webGPUContext.windowHeight; }

    // ── Instance init / render ────────────────────────────────────────────────

    /**
     * Initialize this engine instance and acquire a WebGPU device.
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
        this._setActive();

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        await this.webGPUContext.init(descriptor.canvasConfig);

        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        ShaderLib.init();
        ShaderUtil.init();
        this.globalBindGroup.init();
        this.rtResourceMap.init();
        this.shadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.webGPUContext.canvas);
    }

    private _startRenderJob(view: View3D): RendererJob {
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
     * Attach a view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        view.engine = this;
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Attach multiple views and start the render loop.
     */
    public startRenderViews(views: View3D[]) {
        for (const view of views) view.engine = this;
        this.views = views;
        for (const view of views) this._startRenderJob(view);
        this.resume();
    }

    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    public resume() {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
    }

    private async _render(time: number) {
        if (this._frameRateValue > 0) {
            let delta = time - this._time;
            if (delta < this._frameRateValue) {
                let t = performance.now();
                await new Promise(res => {
                    setTimeout(() => { time += (performance.now() - t); res(true); },
                        this._frameRateValue - delta);
                });
            }
            this._time = time;
        }
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number) {
        // Activate this engine's subsystems for all static singletons
        this._setActive();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        let views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        for (const [k, v] of this.componentCollect.componentsBeforeUpdateList) {
            for (const [f, c] of v) { if (f.enable) c(k); }
        }

        let command = this.webGPUContext.device.createCommandEncoder();
        for (const [k, v] of this.componentCollect.componentsComputeList) {
            for (const [f, c] of v) { if (f.enable) c(k, command); }
        }
        this.webGPUContext.device.queue.submit([command.finish()]);

        for (const [k, v] of this.componentCollect.componentsUpdateList) {
            for (const [f, c] of v) { if (f.enable) c(k); }
        }

        for (const [k, v] of this.componentCollect.graphicComponent) {
            for (const [f, c] of v) { if (k && f.enable) c(k); }
        }

        if (this._renderLoop) await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        let globalMatrixBindGroup = this.globalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const [k, v] of this.componentCollect.componentsLateUpdateList) {
            for (const [f, c] of v) { if (f.enable) c(k); }
        }

        if (this._lateRender) await this._lateRender();
    }

    // ── Static backward-compat API ────────────────────────────────────────────
    // These delegates preserve the original static API so existing code using
    // Engine3D.init(), Engine3D.setting, etc. continues to work unchanged.

    /** @deprecated Use `new Engine3D()` and instance methods for multi-instance support. */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}) {
        const engine = new Engine3D();
        await engine.init(descriptor);
    }

    public static get res(): Res { return Engine3D._current?.res; }
    public static set res(value: Res) { if (Engine3D._current) Engine3D._current.res = value; }

    public static get inputSystem(): InputSystem { return Engine3D._current?.inputSystem; }
    public static set inputSystem(value: InputSystem) { if (Engine3D._current) Engine3D._current.inputSystem = value; }

    public static get views(): View3D[] { return Engine3D._current?.views; }
    public static set views(value: View3D[]) { if (Engine3D._current) Engine3D._current.views = value; }

    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._current?.renderJobs; }

    public static get setting(): EngineSetting { return Engine3D._current?.setting; }
    public static set setting(value: EngineSetting) { if (Engine3D._current) Engine3D._current.setting = value; }

    public static get frameRate(): number { return Engine3D._current?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (Engine3D._current) Engine3D._current.frameRate = value; }

    public static get size(): number[] { return Engine3D._current?.webGPUContext.presentationSize; }
    public static get aspect(): number { return Engine3D._current?.webGPUContext.aspect; }
    public static get width(): number { return Engine3D._current?.webGPUContext.windowWidth; }
    public static get height(): number { return Engine3D._current?.webGPUContext.windowHeight; }

    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._current?.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]) {
        Engine3D._current?.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._current?.getRenderJob(view);
    }

    public static pause() { Engine3D._current?.pause(); }
    public static resume() { Engine3D._current?.resume(); }
}
