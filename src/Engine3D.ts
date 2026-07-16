import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveGPUContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
 * Descriptor for Engine3D.init()
 */
export type Engine3DInitDescriptor = {
    canvasConfig?: CanvasConfig;
    beforeRender?: Function;
    renderLoop?: Function;
    lateRender?: Function;
    engineSetting?: EngineSetting;
    /**
     * Provide an existing GPUDevice to share with another Engine3D instance.
     * When undefined, a new device is created (or auto-shared with the first instance).
     * Set to null to always create a brand-new device.
     */
    sharedDevice?: GPUDevice | null;
};

/**
 * Orillusion 3D Engine — supports multiple simultaneous instances.
 *
 * **Single-instance (backward compatible):**
 * ```ts
 * await Engine3D.init({ canvasConfig: { canvas } });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-instance:**
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
 * @group engine3D
 */
export class Engine3D {

    // ===== PER-INSTANCE STATE =====

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system for this engine instance. */
    public inputSystem: InputSystem;

    /** Active viewports for this engine instance. */
    public views: View3D[] = [];

    /** Render jobs keyed by View3D for this engine instance. */
    public renderJobs: Map<View3D, RendererJob> = new Map();

    /** WebGPU context (canvas + device) for this engine instance. */
    public gpuContext: Context3D;

    /** Per-instance render texture registry. */
    public rtResourceMap: RTResourceMap;

    /** Per-instance GBuffer frame map. */
    public readonly gBufferMap: Map<string, GBufferFrame> = new Map();

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ===== STATIC SHARED STATE =====

    /**
     * Global engine settings (shared across all instances by default).
     * Configure before calling init().
     */
    public static setting: EngineSetting = {
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

    // ===== PER-INSTANCE GETTERS =====

    /** Target frame rate for this engine instance. */
    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    public get size(): number[] { return this.gpuContext.presentationSize; }
    public get aspect(): number { return this.gpuContext.aspect; }
    public get width(): number { return this.gpuContext.windowWidth; }
    public get height(): number { return this.gpuContext.windowHeight; }

    // ===== PER-INSTANCE METHODS =====

    /**
     * Initialize this engine instance.
     * Creates its own WebGPU canvas context and per-instance render resources.
     */
    public async init(descriptor: Engine3DInitDescriptor = {}): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Merge engine settings (modifies shared static setting)
        if (descriptor.engineSetting) {
            Engine3D.setting = { ...Engine3D.setting, ...descriptor.engineSetting };
        }

        // One-time WASM matrix init (shared across all instances)
        if (!Engine3D._wasmInitialized) {
            Engine3D._wasmInitialized = true;
            await WasmMatrix.init(Matrix4.allocCount, Engine3D.setting.doublePrecision);
            Engine3D.setting.reflectionSetting.width = Engine3D.setting.reflectionSetting.reflectionProbeSize * 6;
            Engine3D.setting.reflectionSetting.height = Engine3D.setting.reflectionSetting.reflectionProbeSize * Engine3D.setting.reflectionSetting.reflectionProbeMaxCount;
        }

        // Create per-instance GPU context
        this.gpuContext = new Context3D();

        // Determine device to use: explicit > auto-shared > new
        let deviceToShare: GPUDevice | undefined;
        if (descriptor.sharedDevice !== undefined) {
            // Explicit: null means new device, GPUDevice means share it
            deviceToShare = descriptor.sharedDevice ?? undefined;
        } else if (Engine3D._defaultInstance?.gpuContext?.device) {
            // Auto-share: reuse first engine's device for efficiency
            deviceToShare = Engine3D._defaultInstance.gpuContext.device;
        }
        await this.gpuContext.init(descriptor.canvasConfig, deviceToShare);

        // Activate this instance as the current render context
        this.activate();

        // One-time global subsystem inits (idempotent)
        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        ShadowLightsCollect.init();

        // Per-instance render resources
        this.rtResourceMap = new RTResourceMap();
        RTResourceMap.setActive(this.rtResourceMap);

        // Per-instance reflection GBuffer (uses active RTResourceMap + GBufferFrame)
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            Engine3D.setting.reflectionSetting.width,
            Engine3D.setting.reflectionSetting.height,
            false
        );

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.gpuContext.canvas);

        // Register as default instance if none exists yet
        if (!Engine3D._defaultInstance) {
            Engine3D._defaultInstance = this;
        }
    }

    /**
     * Activate this engine instance as the current render context.
     * Called automatically before each frame; call manually if you need to use
     * RTResourceMap/GBufferFrame outside of the render loop.
     */
    public activate(): void {
        setActiveGPUContext(this.gpuContext);
        RTResourceMap.setActive(this.rtResourceMap);
        GBufferFrame.setActiveMap(this.gBufferMap);
    }

    private _startRenderJob(view: View3D): RendererJob {
        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (Engine3D.setting.pick.mode === `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (Engine3D.setting.pick.mode === `pixel` || Engine3D.setting.pick.mode === `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Set a single render view and start the render loop for this instance.
     */
    public startRenderView(view: View3D): RendererJob {
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop for this instance.
     */
    public startRenderViews(views: View3D[]): void {
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the RendererJob for a given view in this instance.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause the render loop for this engine instance.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the render loop for this engine instance.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    private async _render(time: number): Promise<void> {
        // Activate this instance's context for the frame
        this.activate();

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
                // Re-activate after async gap (another engine may have changed context)
                this.activate();
            }
            this._time = time;
        }
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number): Promise<void> {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.gpuContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) {
            this.activate();
            await this._beforeRender();
            this.activate();
        }

        // Only process components belonging to this instance's views
        const viewSet = this._viewSet;

        for (const [view, componentMap] of ComponentCollect.componentsBeforeUpdateList) {
            if (!viewSet.has(view)) continue;
            for (const [component, call] of componentMap) {
                if (component.enable) call(view);
            }
        }

        let command = this.gpuContext.device.createCommandEncoder();
        for (const [view, componentMap] of ComponentCollect.componentsComputeList) {
            if (!viewSet.has(view)) continue;
            for (const [component, call] of componentMap) {
                if (component.enable) call(view, command);
            }
        }
        this.gpuContext.device.queue.submit([command.finish()]);

        for (const [view, componentMap] of ComponentCollect.componentsUpdateList) {
            if (!viewSet.has(view)) continue;
            for (const [component, call] of componentMap) {
                if (component.enable) call(view);
            }
        }

        for (const [view, componentMap] of ComponentCollect.graphicComponent) {
            if (!viewSet.has(view)) continue;
            for (const [component, call] of componentMap) {
                if (view && component.enable) call(view);
            }
        }

        if (this._renderLoop) {
            this.activate();
            await this._renderLoop();
            this.activate();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) { v.start(); }
            v.renderFrame();
        });

        for (const [view, componentMap] of ComponentCollect.componentsLateUpdateList) {
            if (!viewSet.has(view)) continue;
            for (const [component, call] of componentMap) {
                if (component.enable) call(view);
            }
        }

        if (this._lateRender) {
            this.activate();
            await this._lateRender();
        }
    }

    /** Cached Set of this instance's views for O(1) membership test. Updated on each frame. */
    private get _viewSet(): Set<View3D> {
        // Rebuild set lazily when views array changes
        if (!this.__viewSetCache || this.__viewSetVersion !== this.views) {
            this.__viewSetCache = new Set(this.views);
            this.__viewSetVersion = this.views;
        }
        return this.__viewSetCache;
    }
    private __viewSetCache: Set<View3D> | null = null;
    private __viewSetVersion: View3D[] | null = null;

    // ===== STATIC SHARED INTERNALS =====

    private static _wasmInitialized: boolean = false;
    private static _defaultInstance: Engine3D | null = null;

    private static _getDefault(): Engine3D {
        if (!this._defaultInstance) {
            throw new Error(
                'Engine3D static API used before initialization. ' +
                'Call "await Engine3D.init()" first, or use "new Engine3D()" for multi-instance.'
            );
        }
        return this._defaultInstance;
    }

    // ===== STATIC BACKWARD-COMPATIBLE API =====
    // All static methods delegate to the default (first) Engine3D instance.

    public static get res(): Res { return this._getDefault().res; }
    public static set res(v: Res) { this._getDefault().res = v; }

    public static get inputSystem(): InputSystem { return this._getDefault().inputSystem; }

    public static get views(): View3D[] { return this._getDefault().views; }
    public static set views(v: View3D[]) { this._getDefault().views = v; }

    /** @internal */
    public static get renderJobs(): Map<View3D, RendererJob> { return this._getDefault().renderJobs; }

    public static get frameRate(): number { return this._getDefault().frameRate; }
    public static set frameRate(v: number) { this._getDefault().frameRate = v; }

    public static get size(): number[] { return this._getDefault().size; }
    public static get aspect(): number { return this._getDefault().aspect; }
    public static get width(): number { return this._getDefault().width; }
    public static get height(): number { return this._getDefault().height; }

    /**
     * Create and initialize the default Engine3D instance (single-instance / backward-compat API).
     * Returns the created Engine3D instance.
     */
    public static async init(descriptor: Engine3DInitDescriptor = {}): Promise<Engine3D> {
        const instance = new Engine3D();
        // Set as default before await so static getters work during init callbacks
        if (!Engine3D._defaultInstance) {
            Engine3D._defaultInstance = instance;
        }
        await instance.init(descriptor);
        return instance;
    }

    public static startRenderView(view: View3D): RendererJob {
        return this._getDefault().startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        this._getDefault().startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return this._getDefault().getRenderJob(view);
    }

    public static pause(): void { this._getDefault().pause(); }
    public static resume(): void { this._getDefault().resume(); }
}
