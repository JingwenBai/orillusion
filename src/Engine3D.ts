import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { webGPUContext, setActiveContext, Context3D } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap } from './gfx/renderJob/frame/RTResourceMap';
import { RTResourceConfig } from './gfx/renderJob/config/RTResourceConfig';

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

/**
 * Orillusion 3D Engine — supports multiple independent instances.
 *
 * **Single-instance (unchanged API):**
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
 * @group engine3D
 */
export class Engine3D {

    // ─── Instance state ──────────────────────────────────────────────────────

    /** Unique engine instance identifier */
    public readonly id: string;

    /** Resource manager */
    public res: Res;

    /** Input system bound to this engine's canvas */
    public inputSystem: InputSystem;

    /** Active views for this engine */
    public views: View3D[];

    /** Active render jobs keyed by view */
    public renderJobs: Map<View3D, RendererJob>;

    /** Per-instance entity collect (scene/render-node registry) */
    public entityCollect: EntityCollect;

    /** Per-instance render-texture resource map */
    public rtResourceMap: RTResourceMap;

    /** Engine settings */
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

    private _context: Context3D;
    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /** Per-engine GBufferFrame cache — keys are prefixed with engine id */
    private _gBufferFrameMap: Map<string, GBufferFrame> = new Map();

    private static _idCounter: number = 0;

    constructor() {
        this.id = `engine_${Engine3D._idCounter++}`;
    }

    // ─── Instance getters ────────────────────────────────────────────────────

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
        return this._context?.presentationSize ?? [0, 0];
    }

    public get aspect(): number {
        return this._context?.aspect ?? 1;
    }

    public get width(): number {
        return this._context?.windowWidth ?? 0;
    }

    public get height(): number {
        return this._context?.windowHeight ?? 0;
    }

    // ─── GBufferFrame per-engine factory ─────────────────────────────────────

    /**
     * Get or create a GBufferFrame for this engine instance.
     * Keys are automatically scoped to this engine so multiple instances
     * never share render-target textures.
     */
    public getGBufferFrame(key: string, fixedWidth: number = 0, fixedHeight: number = 0, outColor: boolean = true, depthTexture?: any): GBufferFrame {
        const scopedKey = `${this.id}_${key}`;
        if (!this._gBufferFrameMap.has(scopedKey)) {
            const gBuffer = new GBufferFrame();
            const size = this._context?.presentationSize ?? [0, 0];
            gBuffer.createGBuffer(
                scopedKey,
                fixedWidth === 0 ? size[0] : fixedWidth,
                fixedHeight === 0 ? size[1] : fixedHeight,
                fixedWidth !== 0 && fixedHeight !== 0,
                outColor,
                depthTexture
            );
            this._gBufferFrameMap.set(scopedKey, gBuffer);
            // Register the main color buffer texture so PostBase.getOutTexture() fallback works
            if (key === GBufferFrame.colorPass_GBuffer && gBuffer.getColorTexture()) {
                this.rtResourceMap.rtTextureMap.set(RTResourceConfig.colorBufferTex_NAME, gBuffer.getColorTexture());
            }
        }
        return this._gBufferFrameMap.get(scopedKey);
    }

    /**
     * Get the GUI (overlay) GBufferFrame, sharing depth with the main color pass.
     */
    public getGUIBufferFrame(): GBufferFrame {
        const colorRTFrame = this.getGBufferFrame(GBufferFrame.colorPass_GBuffer);
        return this.getGBufferFrame(GBufferFrame.gui_GBuffer, 0, 0, true, colorRTFrame.depthTexture);
    }

    // ─── Lifecycle ───────────────────────────────────────────────────────────

    /**
     * Initialise this engine instance: create a WebGPU context, compile shaders,
     * set up GPU resources and the input system.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        console.log('Engine Version', version, '| Instance:', this.id);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        this._context = new Context3D();
        await this._context.init(descriptor.canvasConfig);

        // Make this context the active one so all rendering code below uses it
        setActiveContext(this._context);

        //****pre compute setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        this.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );
        //****pre compute setting****/

        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        ShadowLightsCollect.init();

        this.entityCollect = new EntityCollect();
        this.rtResourceMap = new RTResourceMap();
        this.rtResourceMap.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this._context.canvas);

        // Register as the default instance if this is the first engine
        if (!Engine3D._default) {
            Engine3D._default = this;
        }
    }

    private startRenderJob(view: View3D): RendererJob {
        view.engine = this;

        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this.setting.pick.mode === `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this.setting.pick.mode === `pixel` || this.setting.pick.mode === `bound`) {
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
        const renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop.
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

    /** Pause the render loop. */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume the render loop. */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
        }
    }

    private async render(time: number): Promise<void> {
        if (this._frameRateValue > 0) {
            let delta = time - this._time;
            if (delta < this._frameRateValue) {
                const t = performance.now();
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
        // Set this engine as the active context for downstream static callers
        currentEngine = this;
        setActiveContext(this._context);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this._context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        for (const iterator of ComponentCollect.componentsBeforeUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                }
            }
        }

        let command = this._context.device.createCommandEncoder();
        for (const iterator of ComponentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k, command);
                }
            }
        }

        this._context.device.queue.submit([command.finish()]);

        for (const iterator of ComponentCollect.componentsUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                }
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
                }
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
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
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // ─── Static backward-compatibility API ───────────────────────────────────
    // All static members proxy to the default instance so existing code
    // that uses Engine3D.xxx continues to work unchanged.

    /** @internal */
    private static _default: Engine3D = null;

    private static _ensureDefault(): Engine3D {
        if (!Engine3D._default) {
            Engine3D._default = new Engine3D();
        }
        return Engine3D._default;
    }

    public static get res(): Res { return Engine3D._ensureDefault().res; }
    public static set res(v: Res) { Engine3D._ensureDefault().res = v; }

    public static get inputSystem(): InputSystem { return Engine3D._ensureDefault().inputSystem; }
    public static set inputSystem(v: InputSystem) { Engine3D._ensureDefault().inputSystem = v; }

    public static get views(): View3D[] { return Engine3D._ensureDefault().views; }
    public static set views(v: View3D[]) { Engine3D._ensureDefault().views = v; }

    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._ensureDefault().renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { Engine3D._ensureDefault().renderJobs = v; }

    public static get setting(): EngineSetting { return Engine3D._ensureDefault().setting; }
    public static set setting(v: EngineSetting) { Engine3D._ensureDefault().setting = v; }

    public static get frameRate(): number { return Engine3D._ensureDefault().frameRate; }
    public static set frameRate(v: number) { Engine3D._ensureDefault().frameRate = v; }

    public static get size(): number[] { return Engine3D._ensureDefault().size; }
    public static get aspect(): number { return Engine3D._ensureDefault().aspect; }
    public static get width(): number { return Engine3D._ensureDefault().width; }
    public static get height(): number { return Engine3D._ensureDefault().height; }

    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const instance = new Engine3D();
        Engine3D._default = instance;
        return instance.init(descriptor);
    }

    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._ensureDefault().startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        Engine3D._ensureDefault().startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._ensureDefault().getRenderJob(view);
    }

    public static pause(): void {
        Engine3D._default?.pause();
    }

    public static resume(): void {
        Engine3D._default?.resume();
    }
}

/**
 * The Engine3D instance currently executing a render frame.
 * Set at the top of each Engine3D.updateFrame() call so that static helper
 * classes (PostBase, RenderNode, etc.) can access the active engine's
 * per-instance resources (rtResourceMap, entityCollect, etc.) without
 * needing an explicit reference.
 *
 * Because JavaScript is single-threaded, this is always the correct engine
 * for the currently-executing frame.
 * @internal
 */
export let currentEngine: Engine3D = null;

