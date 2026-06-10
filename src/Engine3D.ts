import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveWebGPUContext } from './gfx/graphics/webGpu/Context3D';
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

function createDefaultSetting(): EngineSetting {
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
 * Supports multiple instances. Each instance manages its own WebGPU context,
 * resource manager, render pipeline and subsystems.
 *
 * Single-instance (backward-compat static API):
 *   await Engine3D.init();
 *   Engine3D.setting.*
 *
 * Multi-instance:
 *   const engine = new Engine3D();
 *   await engine.init({ canvasConfig: { canvas } });
 *   engine.setting.*
 *
 * @group engine3D
 */
export class Engine3D {

    // ===== Static shared state =====

    /**
     * Currently active Engine3D instance. Set automatically before each render frame.
     * All static getters/setters delegate to this instance.
     */
    private static _active: Engine3D | null = null;

    /** Shared GPUDevice across all engine instances (created by the first engine). */
    private static _sharedDevice: GPUDevice | null = null;

    /** Guard to prevent WasmMatrix from being initialised more than once. */
    private static _wasmInitialized: boolean = false;

    /** Guard to prevent ShaderLib/ShaderUtil from being initialised more than once. */
    private static _shadersInitialized: boolean = false;

    /**
     * The currently active Engine3D instance.
     * All static API delegates to this instance.
     */
    public static get current(): Engine3D | null {
        return Engine3D._active;
    }

    // ===== Per-instance state =====

    /**
     * Resource manager for this engine instance.
     */
    public res: Res;

    /**
     * Input system for this engine instance.
     */
    public inputSystem: InputSystem;

    /**
     * Active views managed by this engine instance.
     */
    public views: View3D[] = [];

    /**
     * Engine settings for this instance.
     */
    public setting: EngineSetting;

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    // Per-instance subsystems
    public webGPUContext: Context3D;
    public entityCollect: EntityCollect;
    public rtResourceMap: RTResourceMap;
    public shadowLightsCollect: ShadowLightsCollect;
    public globalBindGroup: GlobalBindGroup;
    /** Per-engine GBuffer frame cache (keyed by name). */
    public gBufferFrameMap: Map<string, GBufferFrame>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.setting = createDefaultSetting();
    }

    // ===== Instance getters/setters =====

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
        return this.webGPUContext?.presentationSize;
    }

    public get aspect(): number {
        return this.webGPUContext?.aspect;
    }

    public get width(): number {
        return this.webGPUContext?.windowWidth;
    }

    public get height(): number {
        return this.webGPUContext?.windowHeight;
    }

    // ===== Instance methods =====

    /**
     * Initialise this engine instance.
     * @param descriptor  canvas config and optional callbacks
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        Engine3D._active = this;

        if (!Engine3D._wasmInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            Engine3D._wasmInitialized = true;
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // Create per-instance WebGPU context, sharing the device if one exists
        this.webGPUContext = new Context3D();
        await this.webGPUContext.init(descriptor.canvasConfig, Engine3D._sharedDevice ?? undefined);
        if (!Engine3D._sharedDevice) {
            Engine3D._sharedDevice = this.webGPUContext.device;
        }
        setActiveWebGPUContext(this.webGPUContext);

        if (!Engine3D._shadersInitialized) {
            ShaderLib.init();
            ShaderUtil.init();
            Engine3D._shadersInitialized = true;
        }

        // Create, initialise and register all per-instance subsystems BEFORE use
        this.globalBindGroup = new GlobalBindGroup();
        this.globalBindGroup.init();
        GlobalBindGroup.register(this.globalBindGroup);

        this.rtResourceMap = new RTResourceMap();
        this.rtResourceMap.init();
        RTResourceMap.register(this.rtResourceMap);

        this.shadowLightsCollect = new ShadowLightsCollect();
        this.shadowLightsCollect.init();
        ShadowLightsCollect.register(this.shadowLightsCollect);

        this.entityCollect = new EntityCollect();
        EntityCollect.register(this.entityCollect);

        this.gBufferFrameMap = new Map<string, GBufferFrame>();
        GBufferFrame.registerMap(this.gBufferFrameMap);

        //****pre compute reflection setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );
        //****pre compute reflection setting****/

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.webGPUContext.canvas);
    }

    /**
     * Make this engine instance the active context so that all static subsystem
     * delegates operate on this instance's state. Safe to call at any point after
     * subsystems have been created.
     */
    public activate(): void {
        Engine3D._active = this;
        if (this.webGPUContext) setActiveWebGPUContext(this.webGPUContext);
        if (this.entityCollect) EntityCollect.register(this.entityCollect);
        if (this.rtResourceMap) RTResourceMap.register(this.rtResourceMap);
        if (this.shadowLightsCollect) ShadowLightsCollect.register(this.shadowLightsCollect);
        if (this.globalBindGroup) GlobalBindGroup.register(this.globalBindGroup);
        if (this.gBufferFrameMap) GBufferFrame.registerMap(this.gBufferFrameMap);
    }

    /** @internal */
    private _activateContext(): void {
        this.activate();
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
     * Set a view and start rendering.
     */
    public startRenderView(view: View3D): RendererJob {
        this._activateContext();
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        view.engine = this;
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple views and start rendering.
     */
    public startRenderViews(views: View3D[]): void {
        this._activateContext();
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            views[i].engine = this;
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the RendererJob for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
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
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

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

    private async _updateFrame(time: number): Promise<void> {
        // Activate this engine's context before processing its frame
        this._activateContext();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        const currentViewSet = new Set(views);

        for (const [view, components] of ComponentCollect.componentsBeforeUpdateList ?? []) {
            if (!currentViewSet.has(view)) continue;
            for (const [component, call] of components) {
                if (component.enable) call(view);
            }
        }

        let command = this.webGPUContext.device.createCommandEncoder();
        for (const [view, components] of ComponentCollect.componentsComputeList ?? []) {
            if (!currentViewSet.has(view)) continue;
            for (const [component, call] of components) {
                if (component.enable) call(view, command);
            }
        }
        this.webGPUContext.device.queue.submit([command.finish()]);

        for (const [view, components] of ComponentCollect.componentsUpdateList ?? []) {
            if (!currentViewSet.has(view)) continue;
            for (const [component, call] of components) {
                if (component.enable) call(view);
            }
        }

        for (const [view, components] of ComponentCollect.graphicComponent ?? []) {
            if (!currentViewSet.has(view)) continue;
            for (const [component, call] of components) {
                if (view && component.enable) call(view);
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        const globalMatrixBindGroup = this.globalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        for (const [view, components] of ComponentCollect.componentsLateUpdateList ?? []) {
            if (!currentViewSet.has(view)) continue;
            for (const [component, call] of components) {
                if (component.enable) call(view);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // ===== Static backward-compat API =====
    // All static properties and methods delegate to the active engine instance.

    /**
     * Resource manager of the active engine instance.
     */
    public static get res(): Res { return Engine3D._active?.res; }
    public static set res(v: Res) { if (Engine3D._active) Engine3D._active.res = v; }

    /**
     * Input system of the active engine instance.
     */
    public static get inputSystem(): InputSystem { return Engine3D._active?.inputSystem; }

    /**
     * Active views of the active engine instance.
     */
    public static get views(): View3D[] { return Engine3D._active?.views; }
    public static set views(v: View3D[]) { if (Engine3D._active) Engine3D._active.views = v; }

    /**
     * Settings of the active engine instance.
     */
    public static get setting(): EngineSetting { return Engine3D._active?.setting; }
    public static set setting(v: EngineSetting) { if (Engine3D._active) Engine3D._active.setting = v; }

    /**
     * @internal
     */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._active?.renderJobs; }

    public static get frameRate(): number { return Engine3D._active?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (Engine3D._active) Engine3D._active.frameRate = value; }

    public static get size(): number[] { return Engine3D._active?.size; }
    public static get aspect(): number { return Engine3D._active?.aspect; }
    public static get width(): number { return Engine3D._active?.width; }
    public static get height(): number { return Engine3D._active?.height; }

    /**
     * Initialise the default (singleton) engine instance.
     * Equivalent to: const engine = new Engine3D(); await engine.init(descriptor);
     */
    public static async init(descriptor: {
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
        const engine = new Engine3D();
        await engine.init(descriptor);
    }

    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._active?.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        Engine3D._active?.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._active?.getRenderJob(view);
    }

    public static pause(): void {
        Engine3D._active?.pause();
    }

    public static resume(): void {
        Engine3D._active?.resume();
    }
}
