import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap, setActiveRTMaps } from './gfx/renderJob/frame/RTResourceMap';

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
import { GBufferFrame, setActiveGBufferFrameMap } from './gfx/renderJob/frame/GBufferFrame';
import { RenderTexture } from './textures/RenderTexture';
import { ViewQuad } from './core/ViewQuad';

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
 * Supports multiple concurrent instances, each with its own canvas, scene and render loop.
 *
 * Single-instance (backward-compatible) usage:
 *   await Engine3D.init({ canvasConfig });
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

    // ===== Multi-instance bookkeeping =====

    private static _activeInstance: Engine3D | null = null;
    private static _primaryInstance: Engine3D | null = null;
    // Global registry of all view→renderJob mappings across all engine instances
    private static _globalRenderJobs: Map<View3D, RendererJob> = new Map();
    // WASM matrix pool is shared across instances and only initialized once
    private static _wasmInitialized: boolean = false;

    // ===== Instance state =====

    /** The WebGPU context for this engine instance (canvas + swap chain) */
    public context: Context3D;

    /** Resource manager for this engine instance */
    public res: Res;

    /** Input system for this engine instance */
    public inputSystem: InputSystem;

    /** Active views for this engine instance */
    public views: View3D[] = [];

    /** Render jobs for this engine instance's views */
    public renderJobs: Map<View3D, RendererJob> = new Map();

    /** Per-engine GBuffer frame storage */
    public readonly gBufferFrames: Map<string, GBufferFrame> = new Map();

    /** Per-engine render texture storage */
    public readonly rtTextures: Map<string, RenderTexture> = new Map();

    /** Per-engine view quad storage */
    public readonly rtViewQuads: Map<string, ViewQuad> = new Map();

    /** Engine settings for this instance */
    public setting: EngineSetting;

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

    // ===== Instance getters =====

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

    /** Render window size [width, height] */
    public get size(): number[] { return this.context.presentationSize; }
    /** Render window aspect ratio */
    public get aspect(): number { return this.context.aspect; }
    /** Render window width in pixels */
    public get width(): number { return this.context.windowWidth; }
    /** Render window height in pixels */
    public get height(): number { return this.context.windowHeight; }

    // ===== Static backward-compatible API =====
    // All static methods delegate to the primary instance or the active instance.

    /**
     * resource manager in engine3d
     */
    public static get res(): Res {
        return Engine3D._primaryInstance?.res;
    }

    /**
     * input system in engine3d
     */
    public static get inputSystem(): InputSystem {
        return Engine3D._primaryInstance?.inputSystem;
    }

    /**
     * views in engine3d
     */
    public static get views(): View3D[] {
        return Engine3D._primaryInstance?.views;
    }

    /**
     * @internal
     * Global render job registry across all engine instances.
     */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._globalRenderJobs;
    }

    /**
     * engine setting — returns the active (currently rendering) instance's setting
     */
    public static get setting(): EngineSetting {
        return Engine3D._activeInstance?.setting ?? createDefaultSetting();
    }

    public static set setting(v: EngineSetting) {
        if (Engine3D._activeInstance) {
            Engine3D._activeInstance.setting = v;
        }
    }

    /**
     * set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
     */
    public static get frameRate(): number {
        return Engine3D._primaryInstance?._frameRate ?? 360;
    }

    public static set frameRate(value: number) {
        if (Engine3D._primaryInstance) {
            Engine3D._primaryInstance.frameRate = value;
        }
    }

    /**
     * get render window size width and height
     */
    public static get size(): number[] {
        return Engine3D._primaryInstance?.context.presentationSize;
    }

    /**
     * get render window aspect
     */
    public static get aspect(): number {
        return Engine3D._primaryInstance?.context.aspect;
    }

    /**
     * get render window size width
     */
    public static get width(): number {
        return Engine3D._primaryInstance?.context.windowWidth;
    }

    /**
     * get render window size height
     */
    public static get height(): number {
        return Engine3D._primaryInstance?.context.windowHeight;
    }

    /**
     * Create a webgpu 3D engine instance (static factory — backward-compatible entry point).
     * Creates and returns the primary engine instance. Subsequent calls create additional instances.
     * @param descriptor  {@link CanvasConfig}
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<Engine3D> {
        const instance = new Engine3D();
        await instance.init(descriptor);
        if (!Engine3D._primaryInstance) {
            Engine3D._primaryInstance = instance;
        }
        return instance;
    }

    /**
     * set render view and start renderer
     * @param view
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._primaryInstance.startRenderView(view);
    }

    /**
     * set render views and start renderer
     * @param views
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._primaryInstance.startRenderViews(views);
    }

    /**
     * get view render job instance
     * @param view
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._globalRenderJobs.get(view);
    }

    /**
     * Pause the primary engine render
     */
    public static pause(): void {
        Engine3D._primaryInstance?.pause();
    }

    /**
     * Resume the primary engine render
     */
    public static resume(): void {
        Engine3D._primaryInstance?.resume();
    }

    // ===== Instance methods =====

    /**
     * Activate this engine instance as the currently operating one.
     * Sets the module-level context references so that static GPU code
     * (webGPUContext, GBufferFrame, RTResourceMap) uses this instance's resources.
     * @internal
     */
    private _activate(): void {
        Engine3D._activeInstance = this;
        setActiveContext(this.context);
        setActiveGBufferFrameMap(this.gBufferFrames);
        setActiveRTMaps(this.rtTextures, this.rtViewQuads);
    }

    /**
     * Initialize this engine instance.
     * Creates a new WebGPU context for the given canvas.
     * The GPUDevice is shared across all engine instances on the same page.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // WASM matrix pool is shared across all engine instances — initialize only once
        if (!Engine3D._wasmInitialized) {
            Engine3D._wasmInitialized = true;
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // Create per-engine WebGPU context (own canvas + swap chain, shared device)
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);

        // Activate this engine — sets webGPUContext and per-engine resource maps
        this._activate();

        // Pre-compute reflection GBuffer dimensions
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // Shared GPU resources (each guarded against double-init)
        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        ShadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);
    }

    private _startRenderJob(view: View3D): RendererJob {
        view.engine = this;
        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);
        Engine3D._globalRenderJobs.set(view, renderJob);

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
     * Set a render view and start the render loop for this engine instance.
     */
    public startRenderView(view: View3D): RendererJob {
        this._activate();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop for this engine instance.
     */
    public startRenderViews(views: View3D[]): void {
        this._activate();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
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
     * Pause this engine's render loop.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume this engine's render loop.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
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
        // Activate this engine for the duration of this frame
        this._activate();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const viewSet = new Set(this.views);

        let views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        for (const [view, components] of ComponentCollect.componentsBeforeUpdateList) {
            if (!viewSet.has(view)) continue;
            for (const [component, fn] of components) {
                if (component.enable) { fn(view); }
            }
        }

        let command = this.context.device.createCommandEncoder();
        for (const [view, components] of ComponentCollect.componentsComputeList) {
            if (!viewSet.has(view)) continue;
            for (const [component, fn] of components) {
                if (component.enable) { fn(view, command); }
            }
        }
        this.context.device.queue.submit([command.finish()]);

        for (const [view, components] of ComponentCollect.componentsUpdateList) {
            if (!viewSet.has(view)) continue;
            for (const [component, fn] of components) {
                if (component.enable) { fn(view); }
            }
        }

        for (const [view, components] of ComponentCollect.graphicComponent) {
            if (!viewSet.has(view)) continue;
            for (const [component, fn] of components) {
                if (view && component.enable) { fn(view); }
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

        for (const [view, components] of ComponentCollect.componentsLateUpdateList) {
            if (!viewSet.has(view)) continue;
            for (const [component, fn] of components) {
                if (component.enable) { fn(view); }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
