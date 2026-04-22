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
 * Default engine settings used before any engine instance is created.
 * Mutations here propagate to new Engine3D instances.
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
 * Orillusion 3D Engine
 *
 * Single-instance (backward compat):
 *   Engine3D.setting.xxx = ...;
 *   await Engine3D.init({ canvasConfig });
 *   Engine3D.startRenderView(view);
 *
 * Multi-instance (new API):
 *   const engine = new Engine3D();
 *   await engine.init({ canvasConfig });
 *   engine.startRenderView(view);
 *
 * @group engine3D
 */
export class Engine3D {

    // =================== Static registry ===================

    /**
     * All created engine instances.
     */
    public static readonly instances: Engine3D[] = [];

    /**
     * Currently active engine (the last one that entered its render loop).
     * Static accessors like Engine3D.setting, Engine3D.res, etc. delegate here.
     */
    private static _current: Engine3D | null = null;

    // =================== Instance state ===================

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
     * Render jobs keyed by view.
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * Engine configuration for this instance.
     */
    public setting: EngineSetting;

    /** @internal */
    public gpuContext: Context3D;
    /** @internal */
    public componentCollect: ComponentCollect;
    /** @internal */
    public globalBindGroup: GlobalBindGroup;
    /** @internal */
    public rtResourceMap: RTResourceMap;
    /** @internal */
    public shadowLightsCollect: ShadowLightsCollect;
    /** Per-engine GBuffer frame map. */
    public gBufferMap: Map<string, GBufferFrame>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        // Deep-copy the default setting so each instance is independent
        this.setting = JSON.parse(JSON.stringify(_defaultSetting));
        // Restore Color object (lost through JSON serialization)
        this.setting.render.postProcessing.globalFog.fogColor = new Color(
            _defaultSetting.render.postProcessing.globalFog.fogColor.r,
            _defaultSetting.render.postProcessing.globalFog.fogColor.g,
            _defaultSetting.render.postProcessing.globalFog.fogColor.b,
            _defaultSetting.render.postProcessing.globalFog.fogColor.a,
        );

        this.gpuContext = new Context3D();
        this.componentCollect = new ComponentCollect();
        this.globalBindGroup = new GlobalBindGroup();
        this.rtResourceMap = new RTResourceMap();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.gBufferMap = new Map<string, GBufferFrame>();

        Engine3D.instances.push(this);
        // Become the current engine immediately so pre-init static access works
        Engine3D._current = this;
        this._activateGlobals();
    }

    // =================== Getters / setters ===================

    /**
     * Set render frame rate (24/30/60/120/144/240/360 or custom).
     */
    public get frameRate(): number {
        return this._frameRate;
    }

    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
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

    // =================== Instance methods ===================

    /**
     * Activate this engine instance as the "current" engine.
     * Updates module-level globals (webGPUContext, ComponentCollect active instance, etc.)
     * so that existing code written against the static API works correctly.
     * Called automatically at the start of each render frame.
     * @internal
     */
    public _activateGlobals() {
        Engine3D._current = this;
        setWebGPUContext(this.gpuContext);
        ComponentCollect._setActive(this.componentCollect);
        GlobalBindGroup._setActive(this.globalBindGroup);
        RTResourceMap._setActive(this.rtResourceMap);
        ShadowLightsCollect._setActive(this.shadowLightsCollect);
        GBufferFrame._setActiveMap(this.gBufferMap);
    }

    /**
     * Initialize the engine.
     * @param descriptor Configuration descriptor.
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

        // Activate before any GPU/subsystem init so module globals are correct
        this._activateGlobals();

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        await this.gpuContext.init(descriptor.canvasConfig);

        // Pre-compute reflection buffer sizes
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
        this.globalBindGroup.init();
        this.rtResourceMap.init();
        this.shadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.gpuContext.canvas);
    }

    private startRenderJob(view: View3D): RendererJob {
        view.engine = this;
        // Ensure shadow buffer exists for this view in this engine's collect
        this.shadowLightsCollect.createBuffer(view);

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
     * Set a single render view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this.startRenderJob(view);
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
            this.startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the RendererJob for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause this engine's render loop.
     */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume this engine's render loop.
     */
    public resume() {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    private async _render(time: number) {
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

    private async _updateFrame(time: number) {
        // Activate this engine so all static-API code uses our subsystems
        this._activateGlobals();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
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

        for (const iterator of this.componentCollect.componentsBeforeUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        let command = this.gpuContext.device.createCommandEncoder();
        for (const iterator of this.componentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k, command);
            }
        }
        this.gpuContext.device.queue.submit([command.finish()]);

        for (const iterator of this.componentCollect.componentsUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        for (const iterator of this.componentCollect.graphicComponent) {
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
        let globalMatrixBindGroup = this.globalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const iterator of this.componentCollect.componentsLateUpdateList) {
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

    // =================== Static backward-compat API ===================
    // These delegate to Engine3D._current so existing single-engine code works unchanged.

    /**
     * Mutable pre-init settings (used before any Engine3D instance is created).
     * After init, delegates to the current engine instance.
     */
    public static get setting(): EngineSetting {
        return Engine3D._current?.setting ?? _defaultSetting;
    }

    public static set setting(value: EngineSetting) {
        if (Engine3D._current) {
            Engine3D._current.setting = value;
        } else {
            Object.assign(_defaultSetting, value);
        }
    }

    public static get res(): Res {
        return Engine3D._current?.res;
    }

    public static get inputSystem(): InputSystem {
        return Engine3D._current?.inputSystem;
    }

    public static get views(): View3D[] {
        return Engine3D._current?.views;
    }

    /** @internal */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._current?.renderJobs;
    }

    public static get frameRate(): number {
        return Engine3D._current?._frameRate ?? 360;
    }

    public static set frameRate(value: number) {
        if (Engine3D._current) Engine3D._current.frameRate = value;
    }

    public static get size(): number[] {
        return Engine3D._current?.gpuContext.presentationSize;
    }

    public static get aspect(): number {
        return Engine3D._current?.gpuContext.aspect;
    }

    public static get width(): number {
        return Engine3D._current?.gpuContext.windowWidth;
    }

    public static get height(): number {
        return Engine3D._current?.gpuContext.windowHeight;
    }

    /**
     * Create a new Engine3D instance and initialize it (backward-compat entry point).
     * Returns the engine instance for multi-instance scenarios.
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
     * Set a single render view and start the render loop (backward-compat).
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._current?.startRenderView(view);
    }

    /**
     * Set multiple render views and start the render loop (backward-compat).
     */
    public static startRenderViews(views: View3D[]) {
        Engine3D._current?.startRenderViews(views);
    }

    /**
     * Get the RendererJob for a view (backward-compat).
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._current?.getRenderJob(view);
    }

    /**
     * Pause the current engine's render loop (backward-compat).
     */
    public static pause() {
        Engine3D._current?.pause();
    }

    /**
     * Resume the current engine's render loop (backward-compat).
     */
    public static resume() {
        Engine3D._current?.resume();
    }
}
