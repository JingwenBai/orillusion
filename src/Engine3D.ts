import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap, setActiveRTResourceMap } from './gfx/renderJob/frame/RTResourceMap';
import { GBufferFrame, setActiveGBufferMap } from './gfx/renderJob/frame/GBufferFrame';

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

/**
 * Create the default engine settings object.  Called once per Engine3D
 * instance so each engine owns independent mutable settings.
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
 * Supports multiple independent instances (one per canvas / WebGPU context).
 *
 * **Single-instance (original API — unchanged):**
 * ```ts
 * await Engine3D.init({ canvasConfig: { ... } });
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
 * @group engine3D
 */
export class Engine3D {

    // ═══════════════════════════════════════════════════════════════════════
    // Static context management
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * The engine instance that is currently initialising or rendering.
     * All static accessors delegate here for backward compatibility.
     * @internal
     */
    private static _current: Engine3D | null = null;

    /** WasmMatrix is a process-level singleton — only initialise once. */
    private static _wasmInitialized: boolean = false;

    /** Currently active engine instance (backward-compat helper). */
    public static get current(): Engine3D {
        return Engine3D._current!;
    }

    // ── Static backward-compat accessors ──────────────────────────────────

    /** @see Engine3D#res */
    public static get res(): Res { return Engine3D._current!.res; }
    public static set res(v: Res) { if (Engine3D._current) Engine3D._current.res = v; }

    /** @see Engine3D#inputSystem */
    public static get inputSystem(): InputSystem { return Engine3D._current!.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D._current) Engine3D._current.inputSystem = v; }

    /** @see Engine3D#views */
    public static get views(): View3D[] { return Engine3D._current!.views; }
    public static set views(v: View3D[]) { if (Engine3D._current) Engine3D._current.views = v; }

    /** @see Engine3D#renderJobs */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._current!.renderJobs; }

    /** @see Engine3D#setting */
    public static get setting(): EngineSetting { return Engine3D._current!.setting; }
    public static set setting(v: EngineSetting) { if (Engine3D._current) Engine3D._current.setting = v; }

    /** @see Engine3D#frameRate */
    public static get frameRate(): number { return Engine3D._current!.frameRate; }
    public static set frameRate(v: number) { if (Engine3D._current) Engine3D._current.frameRate = v; }

    /** get render window size width and height */
    public static get size(): number[] { return Engine3D._current!.size; }

    /** get render window aspect */
    public static get aspect(): number { return Engine3D._current!.aspect; }

    /** get render window size width */
    public static get width(): number { return Engine3D._current!.width; }

    /** get render window size height */
    public static get height(): number { return Engine3D._current!.height; }

    // ── Static methods (backward compat — delegate to current instance) ───

    /**
     * Create a new Engine3D instance, initialise it, and return it.
     * The created engine becomes the static `current` engine.
     */
    public static async init(
        descriptor: {
            canvasConfig?: CanvasConfig;
            beforeRender?: Function;
            renderLoop?: Function;
            lateRender?: Function;
            engineSetting?: EngineSetting;
        } = {}
    ): Promise<Engine3D> {
        const engine = new Engine3D();
        await engine.init(descriptor);
        return engine;
    }

    /** @see Engine3D#startRenderView */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._current!.startRenderView(view);
    }

    /** @see Engine3D#startRenderViews */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._current!.startRenderViews(views);
    }

    /** @see Engine3D#getRenderJob */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._current!.getRenderJob(view);
    }

    /** @see Engine3D#pause */
    public static pause(): void {
        Engine3D._current?.pause();
    }

    /** @see Engine3D#resume */
    public static resume(): void {
        Engine3D._current?.resume();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Instance state
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Per-engine WebGPU context (canvas + adapter + device + swap-chain).
     * Becomes the active `webGPUContext` during this engine's render frame.
     */
    public context: Context3D;

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system bound to this engine's canvas. */
    public inputSystem: InputSystem;

    /** Active render views for this engine. */
    public views: View3D[] = [];

    /** @internal */
    public renderJobs: Map<View3D, RendererJob> = new Map();

    /** Per-engine render texture registry. */
    public rtResourceMap: RTResourceMap;

    /** Per-engine GBuffer frame registry. */
    public gBufferFrameMap: Map<string, GBufferFrame> = new Map();

    /** Engine settings — each instance starts with independent defaults. */
    public setting: EngineSetting = createDefaultEngineSetting();

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

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

    /** get render window size width and height */
    public get size(): number[] {
        return this.context.presentationSize;
    }

    /** get render window aspect */
    public get aspect(): number {
        return this.context.aspect;
    }

    /** get render window size width */
    public get width(): number {
        return this.context.windowWidth;
    }

    /** get render window size height */
    public get height(): number {
        return this.context.windowHeight;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────

    /**
     * Initialise this engine instance.
     *
     * @param descriptor  Canvas config + lifecycle hooks + optional settings override.
     */
    public async init(
        descriptor: {
            canvasConfig?: CanvasConfig;
            beforeRender?: Function;
            renderLoop?: Function;
            lateRender?: Function;
            engineSetting?: EngineSetting;
        } = {}
    ): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Register as the current engine so that static helpers work during init.
        Engine3D._current = this;

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // WasmMatrix is a process-level WASM module — initialise only once.
        if (!Engine3D._wasmInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            Engine3D._wasmInitialized = true;
        }

        // Create and initialise this engine's WebGPU context.
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);
        setActiveContext(this.context);

        // Activate per-engine render-resource registries.
        this.rtResourceMap = new RTResourceMap();
        setActiveRTResourceMap(this.rtResourceMap);

        this.gBufferFrameMap = new Map<string, GBufferFrame>();
        setActiveGBufferMap(this.gBufferFrameMap);

        // Pre-compute reflection probe GBuffer sizes.
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

        // These are guarded against double-init internally.
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

    /** @internal */
    private async render(time: number): Promise<void> {
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
        // Activate this engine's per-instance resources so all static helpers
        // (webGPUContext, RTResourceMap, GBufferFrame, Engine3D.setting …)
        // operate on the correct state during this frame.
        Engine3D._current = this;
        setActiveContext(this.context);
        setActiveRTResourceMap(this.rtResourceMap);
        setActiveGBufferMap(this.gBufferFrameMap);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        // Before-update — only process components registered to this engine's views.
        for (const view of views) {
            const list = ComponentCollect.componentsBeforeUpdateList.get(view);
            if (list) {
                for (const [f, c] of list) {
                    if (f.enable) c(view);
                }
            }
        }

        let command = this.context.device.createCommandEncoder();
        for (const view of views) {
            const list = ComponentCollect.componentsComputeList.get(view);
            if (list) {
                for (const [f, c] of list) {
                    if (f.enable) c(view, command);
                }
            }
        }
        this.context.device.queue.submit([command.finish()]);

        // Update — only this engine's views.
        for (const view of views) {
            const list = ComponentCollect.componentsUpdateList.get(view);
            if (list) {
                for (const [f, c] of list) {
                    if (f.enable) c(view);
                }
            }
        }

        for (const view of views) {
            const list = ComponentCollect.graphicComponent.get(view);
            if (list) {
                for (const [f, c] of list) {
                    if (view && f.enable) c(view);
                }
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

        // Late-update — only this engine's views.
        for (const view of views) {
            const list = ComponentCollect.componentsLateUpdateList.get(view);
            if (list) {
                for (const [f, c] of list) {
                    if (f.enable) c(view);
                }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
