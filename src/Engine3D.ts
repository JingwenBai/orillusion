import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time, TimeState } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveWebGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap, RTResourceMapState } from './gfx/renderJob/frame/RTResourceMap';

import { ForwardRenderJob } from './gfx/renderJob/jobs/ForwardRenderJob';
import { GlobalBindGroup, GlobalBindGroupState } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { Interpolator } from './math/TimeInterpolator';
import { RendererJob } from './gfx/renderJob/jobs/RendererJob';
import { Res } from './assets/Res';
import { ShaderLib } from './assets/shader/ShaderLib';
import { ShaderUtil, ShaderUtilState } from './gfx/graphics/webGpu/shader/util/ShaderUtil';
import { ComponentCollect, ComponentCollectState } from './gfx/renderJob/collect/ComponentCollect';
import { ShadowLightsCollect, ShadowLightsCollectState } from './gfx/renderJob/collect/ShadowLightsCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';
import { GPUContext, GPUContextState } from './gfx/renderJob/GPUContext';

/**
 * Default engine settings object factory.
 * @internal
 */
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
 * Supports multiple independent instances, each with its own canvas and GPU context.
 *
 * Single-instance (backward-compat, static API):
 *   Engine3D.setting.*
 *   await Engine3D.init();
 *
 * Multi-instance (instance API):
 *   const engine = new Engine3D();
 *   await engine.init({ canvasConfig: { canvas } });
 *   engine.startRenderView(view);
 *
 * @group engine3D
 */
export class Engine3D {

    // ─── Instance state ───────────────────────────────────────────────

    /** resource manager */
    public res: Res;

    /** input system */
    public inputSystem: InputSystem;

    /** active render views */
    public views: View3D[];

    /** engine settings (each instance has its own copy) */
    public setting: EngineSetting = createDefaultEngineSetting();

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /** Per-engine WebGPU context (canvas, device, etc.) */
    public gpuContext: Context3D;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // Per-engine subsystem states
    private _componentCollectState: ComponentCollectState;
    private _globalBindGroupState: GlobalBindGroupState;
    private _rtResourceMapState: RTResourceMapState;
    private _gpuContextState: GPUContextState;
    private _shadowLightsCollectState: ShadowLightsCollectState;
    private _shaderUtilState: ShaderUtilState;
    private _gBufferFrameMap: Map<string, GBufferFrame>;
    private _timeState: TimeState;

    // ─── Instance getters/setters ──────────────────────────────────────

    /**
     * set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
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
        return this.gpuContext.presentationSize;
    }

    public get aspect(): number {
        return this.gpuContext.aspect;
    }

    public get width(): number {
        return this.gpuContext.windowWidth;
    }

    public get height(): number {
        return this.gpuContext.windowHeight;
    }

    // ─── Static: current active engine ────────────────────────────────

    /**
     * The currently active Engine3D instance.
     * Set automatically when an engine is initialized or starts rendering.
     */
    public static get current(): Engine3D {
        return Engine3D._current;
    }
    private static _current: Engine3D;

    // ─── Static backward-compatible property accessors ─────────────────

    /** @deprecated Use instance.setting instead */
    public static get setting(): EngineSetting {
        return Engine3D._current?.setting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D._current) Engine3D._current.setting = v;
    }

    /** @deprecated Use instance.res instead */
    public static get res(): Res {
        return Engine3D._current?.res;
    }
    public static set res(v: Res) {
        if (Engine3D._current) Engine3D._current.res = v;
    }

    /** @deprecated Use instance.inputSystem instead */
    public static get inputSystem(): InputSystem {
        return Engine3D._current?.inputSystem;
    }

    /** @deprecated Use instance.views instead */
    public static get views(): View3D[] {
        return Engine3D._current?.views;
    }

    /** @deprecated Use instance.renderJobs instead */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._current?.renderJobs;
    }

    /** @deprecated Use instance.size instead */
    public static get size(): number[] {
        return Engine3D._current?.size;
    }

    /** @deprecated Use instance.aspect instead */
    public static get aspect(): number {
        return Engine3D._current?.aspect;
    }

    /** @deprecated Use instance.width instead */
    public static get width(): number {
        return Engine3D._current?.width;
    }

    /** @deprecated Use instance.height instead */
    public static get height(): number {
        return Engine3D._current?.height;
    }

    /** @deprecated Use instance.frameRate instead */
    public static get frameRate(): number {
        return Engine3D._current?.frameRate;
    }
    public static set frameRate(v: number) {
        if (Engine3D._current) Engine3D._current.frameRate = v;
    }

    // ─── Static backward-compatible methods ───────────────────────────

    /**
     * Create a default engine instance and initialize it.
     * Equivalent to `new Engine3D(); engine.init(descriptor)`.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        await engine.init(descriptor);
        Engine3D._current = engine;
    }

    /** @deprecated Use instance.startRenderView instead */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._current.startRenderView(view);
    }

    /** @deprecated Use instance.startRenderViews instead */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._current.startRenderViews(views);
    }

    /** @deprecated Use instance.getRenderJob instead */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._current.getRenderJob(view);
    }

    /** @deprecated Use instance.pause instead */
    public static pause(): void {
        Engine3D._current?.pause();
    }

    /** @deprecated Use instance.resume instead */
    public static resume(): void {
        Engine3D._current?.resume();
    }

    // ─── Instance methods ──────────────────────────────────────────────

    /**
     * Initialize this engine instance.
     * Creates its own WebGPU context (canvas + device) and subsystems.
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

        // Create this engine's own GPU context before anything touches webGPUContext
        this.gpuContext = new Context3D();
        setActiveWebGPUContext(this.gpuContext);

        // Mark this as the current active engine
        Engine3D._current = this;

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        await this.gpuContext.init(descriptor.canvasConfig);

        // ── Pre-compute reflection settings ──
        this.setting.reflectionSetting.width =
            this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;

        // ── GBufferFrame (per-engine map) ──
        this._gBufferFrameMap = new Map<string, GBufferFrame>();
        GBufferFrame.activateEngineState(this._gBufferFrameMap);

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // ── Shaders ──
        ShaderLib.init();
        ShaderUtil.init();
        this._shaderUtilState = ShaderUtil.captureEngineState();

        // ── GlobalBindGroup ──
        GlobalBindGroup.init();
        this._globalBindGroupState = GlobalBindGroup.captureEngineState();

        // ── RTResourceMap ──
        RTResourceMap.init();
        this._rtResourceMapState = RTResourceMap.captureEngineState();

        // ── ShadowLightsCollect ──
        ShadowLightsCollect.init();
        this._shadowLightsCollectState = ShadowLightsCollect.captureEngineState();

        // ── ComponentCollect ──
        this._componentCollectState = ComponentCollect.createEngineState();
        ComponentCollect.activateEngineState(this._componentCollectState);

        // ── GPUContext ──
        this._gpuContextState = GPUContext.createEngineState();
        GPUContext.activateEngineState(this._gpuContextState);

        // ── Time ──
        this._timeState = Time.createEngineState();
        Time.activateEngineState(this._timeState);

        // ── Resources & Input ──
        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.gpuContext.canvas);
    }

    /**
     * Activate this engine's context as the global active context.
     * All subsystem static classes will point to this engine's state.
     * Called automatically before each render frame.
     */
    public activateContext(): void {
        Engine3D._current = this;
        setActiveWebGPUContext(this.gpuContext);
        ComponentCollect.activateEngineState(this._componentCollectState);
        GlobalBindGroup.activateEngineState(this._globalBindGroupState);
        RTResourceMap.activateEngineState(this._rtResourceMapState);
        GPUContext.activateEngineState(this._gpuContextState);
        ShaderUtil.activateEngineState(this._shaderUtilState);
        ShadowLightsCollect.activateEngineState(this._shadowLightsCollectState);
        GBufferFrame.activateEngineState(this._gBufferFrameMap);
        Time.activateEngineState(this._timeState);
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
     * Set render view and start renderer.
     */
    public startRenderView(view: View3D): RendererJob {
        this.activateContext();
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set render views and start renderer.
     */
    public startRenderViews(views: View3D[]): void {
        this.activateContext();
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this.startRenderJob(views[i]);
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
     * Pause rendering for this engine instance.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume rendering for this engine instance.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
    }

    private async render(time: number): Promise<void> {
        // Activate this engine's context before processing this frame
        this.activateContext();

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
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;

        // Sync Time state back into this engine's snapshot (value types need explicit sync)
        this._timeState.time = Time.time;
        this._timeState.frame = Time.frame;
        this._timeState.delta = Time.delta;

        Interpolator.tick(Time.delta);

        let views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.gpuContext.presentationSize;
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

        let command = this.gpuContext.device.createCommandEncoder();
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

        this.gpuContext.device.queue.submit([command.finish()]);

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
}
