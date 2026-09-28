import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveWebGPUContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { RenderTexture } from './textures/RenderTexture';
import { ViewQuad } from './core/ViewQuad';

/**
 * Orillusion 3D Engine
 *
 * Supports both the classic single-instance static API and a multi-instance API.
 *
 * **Single-instance (backward-compatible):**
 * ```ts
 * await Engine3D.init();
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

    // ─── Static fields kept for backward compatibility ─────────────────────────

    /**
     * The currently-active Engine3D instance (the one rendering the current frame).
     * All global singletons (webGPUContext, RTResourceMap, GBufferFrame) are swapped
     * to point to this instance's data at the start of each frame.
     */
    public static current: Engine3D;

    /**
     * All created Engine3D instances.
     */
    public static readonly instances: Engine3D[] = [];

    // ─── Per-instance fields ───────────────────────────────────────────────────

    /**
     * WebGPU context (canvas + swap chain) for this engine instance.
     */
    public webGPUContext: Context3D;

    /**
     * resource manager
     */
    public res: Res;

    /**
     * input system
     */
    public inputSystem: InputSystem;

    /**
     * render views
     */
    public views: View3D[];

    /**
     * @internal per-instance render texture map (isolated from other instances)
     */
    public _rtTextureMap: Map<string, RenderTexture> = new Map();

    /**
     * @internal per-instance view quad map
     */
    public _rtViewQuad: Map<string, ViewQuad> = new Map();

    /**
     * @internal per-instance GBuffer frame map (isolated from other instances)
     */
    public _gBufferMap: Map<string, GBufferFrame> = new Map();

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /**
     * engine setting (per instance)
     */
    public setting: EngineSetting = {
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
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    // ─── Per-instance getters ──────────────────────────────────────────────────

    /**
     * set engine render frameRate
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

    /** render window size [width, height] */
    public get size(): number[] {
        return this.webGPUContext.presentationSize;
    }

    /** render window aspect ratio */
    public get aspect(): number {
        return this.webGPUContext.aspect;
    }

    /** render window width */
    public get width(): number {
        return this.webGPUContext.windowWidth;
    }

    /** render window height */
    public get height(): number {
        return this.webGPUContext.windowHeight;
    }

    // ─── Instance lifecycle ────────────────────────────────────────────────────

    /**
     * Initialize the engine instance and request GPU resources.
     * Multiple Engine3D instances share the same GPUDevice but each gets its own canvas.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        if (Engine3D.instances.length === 0) {
            console.log('Engine Version', version);
            if (!window.isSecureContext) {
                console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
            }
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // WasmMatrix and ShaderLib are shared across instances — only init once
        if (Engine3D.instances.length === 0) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            ShadowLightsCollect.init();
        }

        this.webGPUContext = new Context3D();
        await this.webGPUContext.init(descriptor.canvasConfig);

        // Activate this instance so subsequent calls go to the right context
        this._activateContext();

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

        // RTResourceMap gets fresh maps per instance (already set via _activateContext)

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.webGPUContext.canvas);

        Engine3D.instances.push(this);
        return;
    }

    /**
     * Activate this instance as the current one.
     * Swaps all global static singletons to point at this instance's per-engine data.
     */
    private _activateContext(): void {
        Engine3D.current = this;
        setActiveWebGPUContext(this.webGPUContext);
        RTResourceMap.setActiveMaps(this._rtTextureMap, this._rtViewQuad);
        GBufferFrame.setActiveMap(this._gBufferMap);
    }

    private _startRenderJob(view: View3D): RendererJob {
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
     * Set render view and start renderer.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start renderer.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
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
        // Activate this engine's context before any rendering work
        this._activateContext();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        /* update all transform */
        let views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        /****** auto before update with component list (only this engine's views) *****/
        for (const view of this.views) {
            const beforeList = ComponentCollect.componentsBeforeUpdateList.get(view);
            if (beforeList) {
                for (const [component, callback] of beforeList) {
                    if (component.enable) callback(view);
                }
            }
        }

        let command = this.webGPUContext.device.createCommandEncoder();
        for (const view of this.views) {
            const computeList = ComponentCollect.componentsComputeList.get(view);
            if (computeList) {
                for (const [component, callback] of computeList) {
                    if (component.enable) callback(view, command);
                }
            }
        }

        this.webGPUContext.device.queue.submit([command.finish()]);

        /****** auto update with component list (only this engine's views) *****/
        for (const view of this.views) {
            const updateList = ComponentCollect.componentsUpdateList.get(view);
            if (updateList) {
                for (const [component, callback] of updateList) {
                    if (component.enable) callback(view);
                }
            }
        }

        for (const view of this.views) {
            const graphicList = ComponentCollect.graphicComponent.get(view);
            if (graphicList) {
                for (const [component, callback] of graphicList) {
                    if (view && component.enable) callback(view);
                }
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

        /****** auto late update with component list (only this engine's views) *****/
        for (const view of this.views) {
            const lateList = ComponentCollect.componentsLateUpdateList.get(view);
            if (lateList) {
                for (const [component, callback] of lateList) {
                    if (component.enable) callback(view);
                }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // ─── Static backward-compatibility API ────────────────────────────────────
    // These static methods delegate to a lazily-created default instance so that
    // existing single-instance code continues to work unchanged.

    private static get _default(): Engine3D {
        if (!Engine3D.current) {
            // A default instance is created on first static access if none exists yet.
            // This path is hit only if someone calls static methods before init().
        }
        return Engine3D.current;
    }

    /** @deprecated Use `new Engine3D()` for multi-instance; static API uses a default instance. */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {
        const instance = new Engine3D();
        await instance.init(descriptor);
    }

    /** @deprecated Use instance.startRenderView(). Static delegates to the current instance. */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._default.startRenderView(view);
    }

    /** @deprecated Use instance.startRenderViews(). Static delegates to the current instance. */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._default.startRenderViews(views);
    }

    /** @deprecated Use instance.getRenderJob(). Static delegates to the current instance. */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._default.getRenderJob(view);
    }

    /** @deprecated Use instance.pause(). Static delegates to the current instance. */
    public static pause(): void {
        Engine3D._default.pause();
    }

    /** @deprecated Use instance.resume(). Static delegates to the current instance. */
    public static resume(): void {
        Engine3D._default.resume();
    }

    // ─── Static property proxies for backward compatibility ────────────────────

    public static get res(): Res { return Engine3D._default?.res; }
    public static set res(v: Res) { if (Engine3D._default) Engine3D._default.res = v; }

    public static get inputSystem(): InputSystem { return Engine3D._default?.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D._default) Engine3D._default.inputSystem = v; }

    public static get views(): View3D[] { return Engine3D._default?.views; }
    public static set views(v: View3D[]) { if (Engine3D._default) Engine3D._default.views = v; }

    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._default?.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { if (Engine3D._default) Engine3D._default.renderJobs = v; }

    public static get setting(): EngineSetting { return Engine3D._default?.setting; }
    public static set setting(v: EngineSetting) { if (Engine3D._default) Engine3D._default.setting = v; }

    public static get frameRate(): number { return Engine3D._default?._frameRate ?? 360; }
    public static set frameRate(v: number) { if (Engine3D._default) Engine3D._default.frameRate = v; }

    public static get size(): number[] { return Engine3D._default?.size; }
    public static get aspect(): number { return Engine3D._default?.aspect; }
    public static get width(): number { return Engine3D._default?.width; }
    public static get height(): number { return Engine3D._default?.height; }
}
