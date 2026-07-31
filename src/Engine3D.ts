import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, webGPUContext, setActiveWebGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap, setActiveRTResourceMap } from './gfx/renderJob/frame/RTResourceMap';
import { GBufferFrame, setActiveGBufferResources } from './gfx/renderJob/frame/GBufferFrame';

import { ForwardRenderJob } from './gfx/renderJob/jobs/ForwardRenderJob';
import { GlobalBindGroup } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { Interpolator } from './math/TimeInterpolator';
import { RendererJob } from './gfx/renderJob/jobs/RendererJob';
import { Res } from './assets/Res';
import { ShaderLib } from './assets/shader/ShaderLib';
import { ShaderUtil } from './gfx/graphics/webGpu/shader/util/ShaderUtil';
import { ComponentCollect } from './gfx/renderJob/collect/ComponentCollect';
import { ShadowLightsCollect } from './gfx/renderJob/collect/ShadowLightsCollect';
import { EntityCollect, setActiveEntityCollect } from './gfx/renderJob/collect/EntityCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';

/**
 * Default engine settings, deep-cloned for each Engine3D instance.
 * @internal
 */
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
 * Orillusion 3D Engine — instantiable, supporting multiple concurrent instances.
 *
 * Basic single-engine usage (unchanged from v1):
 * ```ts
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas } });
 * engine.startRenderView(view);
 * ```
 *
 * Multi-engine usage:
 * ```ts
 * const engineA = new Engine3D();
 * await engineA.init({ canvasConfig: { canvas: canvasA } });
 * engineA.startRenderView(viewA);
 *
 * const engineB = new Engine3D();
 * await engineB.init({ canvasConfig: { canvas: canvasB } });
 * engineB.startRenderView(viewB);
 * ```
 *
 * Legacy static API (`Engine3D.setting`, `Engine3D.res`, etc.) is preserved via
 * static getters that delegate to the currently-rendering engine instance.
 * @group engine3D
 */
export class Engine3D {

    // -------------------------------------------------------------------------
    // Per-instance state
    // -------------------------------------------------------------------------

    /** WebGPU canvas + context for this engine instance */
    public context: Context3D;

    /** Resource manager for this engine instance */
    public res: Res;

    /** Input system for this engine instance */
    public inputSystem: InputSystem;

    /** The views managed by this engine instance */
    public views: View3D[];

    /** Engine settings for this instance */
    public setting: EngineSetting;

    /**
     * Per-engine entity / light / render-node collector.
     * Replaces the old global EntityCollect.instance singleton.
     */
    public entityCollect: EntityCollect;

    /** Per-engine render-texture registry */
    public rtResourceMap: RTResourceMap;

    /** Per-engine GBuffer frame cache */
    public gBufferMap: Map<string, GBufferFrame>;

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _prevTime: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.setting = createDefaultSetting();
        this.rtResourceMap = new RTResourceMap();
        this.gBufferMap = new Map<string, GBufferFrame>();
        this.entityCollect = new EntityCollect(this.setting);
        Engine3D.instances.push(this);
    }

    // -------------------------------------------------------------------------
    // Per-instance getters / setters
    // -------------------------------------------------------------------------

    /** Frames per second limit for this engine instance */
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
        return this.context?.presentationSize;
    }

    public get aspect(): number {
        return this.context?.aspect;
    }

    public get width(): number {
        return this.context?.windowWidth;
    }

    public get height(): number {
        return this.context?.windowHeight;
    }

    // -------------------------------------------------------------------------
    // Initialisation
    // -------------------------------------------------------------------------

    /**
     * Create the WebGPU context and initialise all per-engine subsystems.
     * @param descriptor  Canvas config, callbacks, and optional per-engine settings override.
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

        // Merge per-engine setting overrides
        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // Update EntityCollect's reference to this engine's (possibly updated) setting
        this.entityCollect = new EntityCollect(this.setting);

        // Global one-time init (WasmMatrix, ShaderLib, ShaderUtil, GlobalBindGroup)
        if (!Engine3D._globalInitDone) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            Engine3D._globalInitDone = true;
        }

        // Per-engine WebGPU context (shares the underlying GPUDevice)
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);

        // Make this engine's context the active one for subsequent setup calls
        this._activateSelf();

        // Per-engine reflection GBuffer (uses per-engine rtResourceMap)
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // Shared one-time init for shader library and pipeline
        if (!Engine3D._shaderInitDone) {
            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            ShadowLightsCollect.init();
            Engine3D._shaderInitDone = true;
        }

        // Per-engine resources
        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);
    }

    // -------------------------------------------------------------------------
    // Render loop management
    // -------------------------------------------------------------------------

    private startRenderJob(view: View3D): RendererJob {
        // Link view ↔ engine so subsystems can find their engine via view.engine
        view.engine = this;

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
     * Register a single view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Register multiple views and start the render loop.
     */
    public startRenderViews(views: View3D[]) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this.startRenderJob(views[i]);
        }
        this.resume();
    }

    /** Get the RendererJob for a given view. */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /** Pause this engine's render loop. */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume this engine's render loop. */
    public resume() {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
        }
    }

    /**
     * Activate this engine as the "current" engine before rendering.
     * Updates all module-level active pointers so that subsystems that still
     * use static/module-level access get the right per-engine data.
     * @internal
     */
    private _activateSelf() {
        Engine3D._activeEngine = this;
        setActiveWebGPUContext(this.context);
        setActiveGBufferResources(this.gBufferMap, this.rtResourceMap);
        setActiveEntityCollect(this.entityCollect);
    }

    private async render(time: number) {
        if (this._frameRateValue > 0) {
            let delta = time - this._prevTime;
            if (delta < this._frameRateValue) {
                let t = performance.now();
                await new Promise(res => {
                    setTimeout(() => {
                        time += (performance.now() - t);
                        res(true);
                    }, this._frameRateValue - delta);
                });
            }
            this._prevTime = time;
        }
        await this.updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async updateFrame(time: number) {
        // Activate this engine's per-engine resources for the duration of this frame
        this._activateSelf();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
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
            // Only process views that belong to this engine
            if (!this.views.includes(k)) continue;
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k); }
            }
        }

        let command = this.context.device.createCommandEncoder();
        for (const iterator of ComponentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            if (!this.views.includes(k)) continue;
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k, command); }
            }
        }
        this.context.device.queue.submit([command.finish()]);

        for (const iterator of ComponentCollect.componentsUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            if (!this.views.includes(k)) continue;
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k); }
            }
        }

        for (const iterator of ComponentCollect.graphicComponent) {
            let k = iterator[0];
            let v = iterator[1];
            if (!this.views.includes(k)) continue;
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (k && f.enable) { c(k); }
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
            if (!this.views.includes(k)) continue;
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k); }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // =========================================================================
    // Static registry and backward-compat API
    //
    // Engine3D.setting, Engine3D.res, Engine3D.init(), Engine3D.startRenderView()
    // etc. all still work by delegating to the "active" engine instance so that
    // existing single-engine code requires zero changes.
    // =========================================================================

    /** All Engine3D instances created in this page, in creation order. */
    public static readonly instances: Engine3D[] = [];

    /** @internal — the currently-rendering (or most recently initialised) engine */
    private static _activeEngine: Engine3D = null;

    /** @internal — WasmMatrix + other one-time global inits */
    private static _globalInitDone: boolean = false;

    /** @internal — ShaderLib / ShaderUtil / GlobalBindGroup one-time inits */
    private static _shaderInitDone: boolean = false;

    /** The currently-active Engine3D instance. Useful for subsystems that need
     *  per-engine data but receive no direct engine reference. */
    public static get current(): Engine3D {
        return Engine3D._activeEngine;
    }

    // --- Backward-compat static property delegators ---

    /** @deprecated Use `engine.setting` on your instance instead. */
    public static get setting(): EngineSetting {
        return Engine3D._activeEngine?.setting;
    }
    public static set setting(value: EngineSetting) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.setting = value;
    }

    /** @deprecated Use `engine.res` on your instance instead. */
    public static get res(): Res {
        return Engine3D._activeEngine?.res;
    }
    public static set res(value: Res) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.res = value;
    }

    /** @deprecated Use `engine.inputSystem` on your instance instead. */
    public static get inputSystem(): InputSystem {
        return Engine3D._activeEngine?.inputSystem;
    }

    /** @deprecated Use `engine.views` on your instance instead. */
    public static get views(): View3D[] {
        return Engine3D._activeEngine?.views;
    }

    /** @deprecated Use `engine.renderJobs` on your instance instead. */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._activeEngine?.renderJobs;
    }

    /** @deprecated Use `engine.width` on your instance instead. */
    public static get width(): number {
        return Engine3D._activeEngine?.width;
    }

    /** @deprecated Use `engine.height` on your instance instead. */
    public static get height(): number {
        return Engine3D._activeEngine?.height;
    }

    /** @deprecated Use `engine.size` on your instance instead. */
    public static get size(): number[] {
        return Engine3D._activeEngine?.size;
    }

    /** @deprecated Use `engine.aspect` on your instance instead. */
    public static get aspect(): number {
        return Engine3D._activeEngine?.aspect;
    }

    /** @deprecated Use `engine.frameRate` on your instance instead. */
    public static get frameRate(): number {
        return Engine3D._activeEngine?.frameRate;
    }
    public static set frameRate(value: number) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.frameRate = value;
    }

    // --- Backward-compat static method delegators ---

    /**
     * Single-engine convenience: create a default Engine3D instance, initialise it,
     * and return the instance.
     * @deprecated Prefer `new Engine3D(); engine.init(...)` for clarity.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<Engine3D> {
        // If there's already an active engine (e.g. from a previous call), reuse it;
        // otherwise create a fresh default instance.
        let engine = Engine3D._activeEngine;
        if (!engine) {
            engine = new Engine3D();
        }
        await engine.init(descriptor);
        return engine;
    }

    /** @deprecated Use `engine.startRenderView(view)` instead. */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._activeEngine?.startRenderView(view);
    }

    /** @deprecated Use `engine.startRenderViews(views)` instead. */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._activeEngine?.startRenderViews(views);
    }

    /** @deprecated Use `engine.getRenderJob(view)` instead. */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._activeEngine?.getRenderJob(view);
    }

    /** @deprecated Use `engine.pause()` instead. */
    public static pause(): void {
        Engine3D._activeEngine?.pause();
    }

    /** @deprecated Use `engine.resume()` instead. */
    public static resume(): void {
        Engine3D._activeEngine?.resume();
    }
}
