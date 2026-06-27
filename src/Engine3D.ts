import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { RenderTexture } from './textures/RenderTexture';

/**
 * Orillusion 3D Engine — instantiable for multi-instance support.
 *
 * New (multi-instance) usage:
 * ```ts
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas } });
 * engine.startRenderView(view);
 * ```
 *
 * Legacy (single-instance) static usage still works unchanged:
 * ```ts
 * await Engine3D.init();
 * Engine3D.startRenderView(view);
 * ```
 * @group engine3D
 */
export class Engine3D {

    // ─── Shared engine settings (global across all instances) ─────────────────
    /**
     * Shared engine settings. Mutating this affects all Engine3D instances.
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

    // ─── Instance state ────────────────────────────────────────────────────────

    /** Per-engine resource manager */
    public res: Res;

    /** Per-engine input handler */
    public inputSystem: InputSystem;

    /** Active render views for this engine instance */
    public views: View3D[] = [];

    /** Per-engine render jobs */
    public renderJobs: Map<View3D, RendererJob>;

    /** Per-engine component lifecycle collection */
    public readonly componentCollect: ComponentCollect;

    /** Per-engine render-node / entity collection */
    public readonly entityCollect: EntityCollect;

    /** Per-engine render-texture resource cache */
    public readonly rtResourceMap: RTResourceMap;

    /** Per-engine GBuffer frame cache */
    public readonly gBufferMap: Map<string, GBufferFrame>;

    // Private render-loop state
    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ─── Static backward-compat wrappers (single-engine legacy API) ────────────

    /**
     * @internal
     * The default engine instance used by static methods for backward compatibility.
     */
    public static _default: Engine3D | null = null;

    public static get res(): Res { return this._default?.res; }
    public static get inputSystem(): InputSystem { return this._default?.inputSystem; }

    public static get views(): View3D[] { return this._default?.views ?? []; }
    public static set views(v: View3D[]) { if (this._default) this._default.views = v; }

    public static get renderJobs(): Map<View3D, RendererJob> { return this._default?.renderJobs; }

    /** Frame rate for the default engine instance */
    public static get frameRate(): number { return this._default?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (this._default) this._default.frameRate = value; }

    public static get size(): number[] { return webGPUContext.presentationSize; }
    public static get aspect(): number { return webGPUContext.aspect; }
    public static get width(): number { return webGPUContext.windowWidth; }
    public static get height(): number { return webGPUContext.windowHeight; }

    /**
     * Initialize the default engine instance (legacy single-engine API).
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        this._default = new Engine3D();
        return this._default.init(descriptor);
    }

    public static startRenderView(view: View3D): RendererJob {
        return this._default!.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        this._default!.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return this._default!.getRenderJob(view);
    }

    public static pause(): void { this._default?.pause(); }
    public static resume(): void { this._default?.resume(); }

    // ─── Constructor ───────────────────────────────────────────────────────────

    constructor() {
        this.componentCollect = new ComponentCollect();
        this.entityCollect = new EntityCollect();
        this.rtResourceMap = new RTResourceMap();
        this.gBufferMap = new Map();
        this.renderJobs = new Map();
    }

    // ─── Instance getters / setters ────────────────────────────────────────────

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    public get size(): number[] { return webGPUContext.presentationSize; }
    public get aspect(): number { return webGPUContext.aspect; }
    public get width(): number { return webGPUContext.windowWidth; }
    public get height(): number { return webGPUContext.windowHeight; }

    // ─── Per-engine GBuffer helpers ────────────────────────────────────────────

    /**
     * Get or create a GBuffer frame keyed by name for this engine instance.
     * Each engine keeps its own cache so canvases with different sizes don't conflict.
     */
    public getGBufferFrame(key: string, fixedWidth: number = 0, fixedHeight: number = 0, outColor: boolean = true, depthTexture?: RenderTexture): GBufferFrame {
        let gBuffer = this.gBufferMap.get(key);
        if (!gBuffer) {
            gBuffer = new GBufferFrame();
            const size = webGPUContext.presentationSize;
            gBuffer.createGBuffer(
                key,
                fixedWidth === 0 ? size[0] : fixedWidth,
                fixedHeight === 0 ? size[1] : fixedHeight,
                fixedWidth !== 0 && fixedHeight !== 0,
                outColor,
                depthTexture,
                this.rtResourceMap,
            );
            this.gBufferMap.set(key, gBuffer);
        }
        return gBuffer;
    }

    public getGUIBufferFrame(): GBufferFrame {
        const colorRTFrame = this.getGBufferFrame(GBufferFrame.colorPass_GBuffer);
        return this.getGBufferFrame(GBufferFrame.gui_GBuffer, 0, 0, true, colorRTFrame.depthTexture);
    }

    // ─── Core lifecycle ────────────────────────────────────────────────────────

    /**
     * Initialize this engine instance.
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

        // Merge into shared static settings
        if (descriptor.engineSetting) {
            Engine3D.setting = { ...Engine3D.setting, ...descriptor.engineSetting };
        }

        await WasmMatrix.init(Matrix4.allocCount, Engine3D.setting.doublePrecision);
        await webGPUContext.init(descriptor.canvasConfig);

        // Pre-compute reflection settings
        Engine3D.setting.reflectionSetting.width =
            Engine3D.setting.reflectionSetting.reflectionProbeSize * 6;
        Engine3D.setting.reflectionSetting.height =
            Engine3D.setting.reflectionSetting.reflectionProbeSize *
            Engine3D.setting.reflectionSetting.reflectionProbeMaxCount;

        // Init shared global systems (safe to call multiple times)
        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        ShadowLightsCollect.init();

        // Init per-engine systems
        this.rtResourceMap.init();

        // Pre-create per-engine reflection GBuffer
        this.getGBufferFrame(
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
        this.inputSystem.initCanvas(webGPUContext.canvas);

        // Register as the backward-compat singletons for single-engine usage
        EntityCollect.instance = this.entityCollect;
        RTResourceMap.instance = this.rtResourceMap;
    }

    private _startRenderJob(view: View3D): RendererJob {
        const renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (Engine3D.setting.pick.mode === 'pixel') {
            const postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (Engine3D.setting.pick.mode === 'pixel' || Engine3D.setting.pick.mode === 'bound') {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Bind a single view to this engine and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        view.engine = this;
        this.renderJobs = this.renderJobs ?? new Map();
        this.views = [view];
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Bind multiple views to this engine and start the render loop.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs = this.renderJobs ?? new Map();
        this.views = views;
        for (const view of views) {
            view.engine = this;
            this._startRenderJob(view);
        }
        this.resume();
    }

    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    private async _render(time: number): Promise<void> {
        if (this._frameRateValue > 0) {
            const delta = time - this._time;
            if (delta < this._frameRateValue) {
                const t = performance.now();
                await new Promise<void>(res => {
                    setTimeout(() => {
                        time += (performance.now() - t);
                        res();
                    }, this._frameRateValue - delta);
                });
            }
            this._time = time;
        }
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    /** @internal */
    private async _updateFrame(time: number): Promise<void> {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        // Update scene transforms for each view
        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        // ── Per-engine component lifecycle iteration ─────────────────────────
        const cc = this.componentCollect;

        for (const [k, v] of cc.componentsBeforeUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        let command = webGPUContext.device.createCommandEncoder();
        for (const [k, v] of cc.componentsComputeList) {
            for (const [f, c] of v) {
                if (f.enable) c(k, command);
            }
        }
        webGPUContext.device.queue.submit([command.finish()]);

        for (const [k, v] of cc.componentsUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        for (const [k, v] of cc.graphicComponent) {
            for (const [f, c] of v) {
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop) await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);

        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const [k, v] of cc.componentsLateUpdateList) {
            for (const [f, c] of v) {
                if (f.enable) c(k);
            }
        }

        if (this._lateRender) await this._lateRender();
    }
}
