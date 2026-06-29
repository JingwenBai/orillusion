import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { setActiveWebGPUContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
import { Context3D } from './gfx/graphics/webGpu/Context3D';
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
 * Orillusion 3D Engine — supports multiple independent instances.
 *
 * **Instance API (multi-instance support):**
 * ```ts
 * const engine = new Engine3D()
 * await engine.init({ canvasConfig: { canvas: myCanvas } })
 * engine.startRenderView(view)
 * ```
 *
 * **Static API (backward-compatible single-instance shortcut):**
 * ```ts
 * await Engine3D.init({ canvasConfig: { canvas: myCanvas } })
 * Engine3D.startRenderView(view)
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // ── Static multi-instance registry ──────────────────────────────────────

    /**
     * All Engine3D instances created in this page, in creation order.
     */
    public static readonly instances: Engine3D[] = [];

    /**
     * The most recently initialised (or currently rendering) Engine3D instance.
     * Set at init() time and refreshed at the start of every render frame.
     */
    public static current: Engine3D | null = null;

    /**
     * Default engine settings shared across all instances.
     * May be modified before calling init() for backward-compatible single-instance usage:
     *   Engine3D.setting.shadow.enable = true
     *   await Engine3D.init()
     * Each new Engine3D instance starts with a shallow copy of these defaults.
     */
    private static _defaultSetting: EngineSetting = {
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

    // ── Per-instance state ───────────────────────────────────────────────────

    /**
     * The WebGPU context (canvas, device, etc.) for this engine instance.
     */
    public context3d: Context3D;

    /**
     * Resource manager for this engine instance.
     */
    public res: Res;

    /**
     * Input system for this engine instance.
     */
    public inputSystem: InputSystem;

    /**
     * Active views rendered by this engine instance.
     */
    public views: View3D[];

    /**
     * Render jobs keyed by View3D for this engine instance.
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * Per-instance engine settings.
     * Initialised from Engine3D._defaultSetting in init().
     */
    public setting: EngineSetting;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /**
     * Set render frame rate (fps).
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
        return this.context3d.presentationSize;
    }

    public get aspect(): number {
        return this.context3d.aspect;
    }

    public get width(): number {
        return this.context3d.windowWidth;
    }

    public get height(): number {
        return this.context3d.windowHeight;
    }

    // ── Instance lifecycle ───────────────────────────────────────────────────

    /**
     * Initialise this Engine3D instance.
     * The GPU device is shared with any previously initialised Engine3D instances.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<this> {

        // Capture the current default settings (which may have been modified
        // before init via the static Engine3D.setting API) before overwriting current.
        const baseSettings = Engine3D._defaultSetting;

        // Make this instance "current" immediately so that per-engine routing
        // in RTResourceMap, GBufferFrame, etc. resolves correctly during setup.
        Engine3D.current = this;
        (globalThis as any).__Engine3D__ = Engine3D;

        if (Engine3D.instances.length === 0) {
            console.log('Engine Version', version);
        }
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Merge: pre-init static settings < descriptor.engineSetting
        this.setting = { ...baseSettings, ...descriptor.engineSetting };

        // WasmMatrix is global; only initialise once across all engine instances.
        if (Engine3D.instances.length === 0) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // Create and initialise a Context3D for this engine instance.
        // The GPU device is automatically shared with existing instances.
        this.context3d = new Context3D();
        await this.context3d.init(descriptor.canvasConfig);
        setActiveWebGPUContext(this.context3d);

        //****pre compute setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );
        //****pre compute setting****/

        // Shader libraries and GPU-pipeline utilities are shared across instances
        // (they are idempotent — subsequent calls are no-ops via init guards).
        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();

        RTResourceMap.init(); // no-op; kept for API compatibility

        ShadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context3d.canvas);

        Engine3D.instances.push(this);
        return this;
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
     * Set a render view and start the render loop for this engine instance.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        view.engine = this;
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop for this engine instance.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            views[i].engine = this;
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
        // Activate this engine's WebGPU context and mark it as "current"
        // so that per-engine static classes (RTResourceMap, GBufferFrame, etc.)
        // route to the correct instance's data.
        Engine3D.current = this;
        setActiveWebGPUContext(this.context3d);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        // Use a Set for O(1) view membership checks when iterating ComponentCollect
        // (which holds components from ALL engine instances).
        const ownViews = new Set<View3D>(this.views);

        let views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.context3d.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        for (const [view, components] of ComponentCollect.componentsBeforeUpdateList) {
            if (!ownViews.has(view)) continue;
            for (const [f, c] of components) {
                if (f.enable) c(view);
            }
        }

        let command = this.context3d.device.createCommandEncoder();
        for (const [view, components] of ComponentCollect.componentsComputeList) {
            if (!ownViews.has(view)) continue;
            for (const [f, c] of components) {
                if (f.enable) c(view, command);
            }
        }

        this.context3d.device.queue.submit([command.finish()]);

        for (const [view, components] of ComponentCollect.componentsUpdateList) {
            if (!ownViews.has(view)) continue;
            for (const [f, c] of components) {
                if (f.enable) c(view);
            }
        }

        for (const [view, components] of ComponentCollect.graphicComponent) {
            if (!view || !ownViews.has(view)) continue;
            for (const [f, c] of components) {
                if (f.enable) c(view);
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
            if (!ownViews.has(view)) continue;
            for (const [f, c] of components) {
                if (f.enable) c(view);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // ── Static backward-compatible API ───────────────────────────────────────
    // All static methods delegate to Engine3D.current (the most recently
    // initialised engine instance).  Single-instance code requires no changes.

    /**
     * Resource manager of the primary engine instance.
     */
    public static get res(): Res {
        return Engine3D.current?.res;
    }

    /**
     * Input system of the primary engine instance.
     */
    public static get inputSystem(): InputSystem {
        return Engine3D.current?.inputSystem;
    }

    /**
     * Active views of the primary engine instance.
     */
    public static get views(): View3D[] {
        return Engine3D.current?.views;
    }

    /** @deprecated Use Engine3D.current.renderJobs */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D.current?.renderJobs;
    }

    /**
     * Engine settings.
     * - Before init(): returns Engine3D._defaultSetting, which can be freely modified.
     *   These modifications are inherited by the next Engine3D instance created via init().
     * - After init(): returns Engine3D.current.setting (the active instance's copy).
     *
     * This makes the common single-instance pattern work unchanged:
     *   Engine3D.setting.shadow.enable = true   // pre-init
     *   await Engine3D.init()
     *   Engine3D.setting.render.debug = false   // post-init
     */
    public static get setting(): EngineSetting {
        return Engine3D.current?.setting ?? Engine3D._defaultSetting;
    }

    public static set setting(value: EngineSetting) {
        if (Engine3D.current) {
            Engine3D.current.setting = value;
        } else {
            Engine3D._defaultSetting = value;
        }
    }

    public static get frameRate(): number {
        return Engine3D.current?._frameRate ?? 360;
    }

    public static set frameRate(value: number) {
        if (Engine3D.current) Engine3D.current.frameRate = value;
    }

    public static get size(): number[] {
        return webGPUContext.presentationSize;
    }

    public static get aspect(): number {
        return webGPUContext.aspect;
    }

    public static get width(): number {
        return webGPUContext.windowWidth;
    }

    public static get height(): number {
        return webGPUContext.windowHeight;
    }

    /**
     * Create and initialise a new Engine3D instance.
     * The instance is registered in Engine3D.instances and set as Engine3D.current.
     * @returns the new Engine3D instance
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<Engine3D> {
        const instance = new Engine3D();
        await instance.init(descriptor);
        return instance;
    }

    public static startRenderView(view: View3D): RendererJob {
        return Engine3D.current?.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        Engine3D.current?.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.current?.getRenderJob(view);
    }

    public static pause(): void {
        Engine3D.current?.pause();
    }

    public static resume(): void {
        Engine3D.current?.resume();
    }
}
