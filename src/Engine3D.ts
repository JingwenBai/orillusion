import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setWebGPUContext } from './gfx/graphics/webGpu/Context3D';
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
 * Usage:
 * ```
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas } });
 * engine.startRenderView(view);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    /**
     * resource manager for this engine instance
     */
    public res: Res;

    /**
     * input system for this engine instance
     */
    public inputSystem: InputSystem;

    /**
     * views managed by this engine instance
     */
    public views: View3D[];

    /**
     * WebGPU context owned by this engine instance
     */
    public context: Context3D;

    /**
     * Per-instance component lifecycle registry
     */
    public componentCollect: ComponentCollect;

    /**
     * Per-instance global bind group manager
     */
    public globalBindGroup: GlobalBindGroup;

    /**
     * Per-instance shadow light tracker
     */
    public shadowLightsCollect: ShadowLightsCollect;

    /**
     * Per-instance render-texture resource map
     */
    public rtResourceMap: RTResourceMap;

    /**
     * Per-instance GBuffer frame map
     */
    public gBufferMap: Map<string, GBufferFrame>;

    /**
     * Per-instance shader cache
     */
    public shaderUtil: ShaderUtil;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /**
     * render jobs registered for this instance
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * engine setting for this instance
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

    // ─── Current-instance tracking ───────────────────────────────────────────

    /**
     * The Engine3D instance that is currently executing its render frame.
     * All static subsystems (webGPUContext, ComponentCollect, …) proxy to this.
     */
    public static current: Engine3D = null;

    // ─── Static backward-compatibility accessors ─────────────────────────────
    // These delegate to Engine3D.current so existing code that calls
    // Engine3D.res / Engine3D.setting / … continues to work unchanged.

    public static get res(): Res { return Engine3D.current?.res; }
    public static get inputSystem(): InputSystem { return Engine3D.current?.inputSystem; }
    public static get views(): View3D[] { return Engine3D.current?.views; }
    public static get setting(): EngineSetting { return Engine3D.current?.setting; }
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D.current?.renderJobs; }
    public static get size(): number[] { return Engine3D.current?.size; }
    public static get aspect(): number { return Engine3D.current?.aspect; }
    public static get width(): number { return Engine3D.current?.width; }
    public static get height(): number { return Engine3D.current?.height; }
    public static get frameRate(): number { return Engine3D.current?._frameRate; }
    public static set frameRate(v: number) { if (Engine3D.current) Engine3D.current.frameRate = v; }

    // ─── Static convenience API (single-instance backward compatibility) ──────
    // These create / reuse a default Engine3D instance so existing code that
    // calls Engine3D.init() / Engine3D.startRenderView() without constructing
    // an instance continues to work without modification.

    /**
     * Initialise the default (single) Engine3D instance.
     * Equivalent to: `const engine = new Engine3D(); await engine.init(descriptor);`
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {
        const engine = new Engine3D();
        await engine.init(descriptor);
        Engine3D.current = engine;
    }

    /**
     * Start rendering a single view using the current default engine instance.
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D.current?.startRenderView(view);
    }

    /**
     * Start rendering multiple views using the current default engine instance.
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D.current?.startRenderViews(views);
    }

    /**
     * Get the render job for a view from the current default engine instance.
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.current?.getRenderJob(view);
    }

    /**
     * Pause the current default engine instance.
     */
    public static pause(): void {
        Engine3D.current?.pause();
    }

    /**
     * Resume the current default engine instance.
     */
    public static resume(): void {
        Engine3D.current?.resume();
    }

    /**
     * Activate this engine instance as the global "current" so that all
     * static subsystem proxies (ComponentCollect, GlobalBindGroup, …) point
     * to its per-instance state. Called automatically before each frame.
     */
    public activate() {
        Engine3D.current = this;
        setWebGPUContext(this.context);
        ComponentCollect._instance = this.componentCollect;
        GlobalBindGroup._instance = this.globalBindGroup;
        ShadowLightsCollect._instance = this.shadowLightsCollect;
        RTResourceMap._instance = this.rtResourceMap;
        ShaderUtil._instance = this.shaderUtil;
        GBufferFrame.gBufferMap = this.gBufferMap;
    }

    // ─── Frame-rate ──────────────────────────────────────────────────────────

    public get frameRate(): number {
        return this._frameRate;
    }

    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    // ─── Presentation size helpers ───────────────────────────────────────────

    public get size(): number[] {
        return this.context.presentationSize;
    }

    public get aspect(): number {
        return this.context.aspect;
    }

    public get width(): number {
        return this.context.windowWidth;
    }

    public get height(): number {
        return this.context.windowHeight;
    }

    // ─── Init ────────────────────────────────────────────────────────────────

    /**
     * Create and initialise a WebGPU 3D engine instance.
     * @param descriptor  {@link CanvasConfig} and optional callbacks
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // Create per-instance context and activate so subsystems initialise against it
        this.context = new Context3D();
        this.componentCollect = new ComponentCollect();
        this.globalBindGroup = new GlobalBindGroup();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.rtResourceMap = new RTResourceMap();
        this.gBufferMap = new Map<string, GBufferFrame>();
        this.shaderUtil = new ShaderUtil();
        this.activate();

        // Initialise WasmMatrix once (shared across all engine instances)
        if (!Matrix4.buffer) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        await this.context.init(descriptor.canvasConfig);

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

        // ShaderLib is device-independent (source text), initialise once
        if (!ShaderLib._initialized) ShaderLib.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);
    }

    // ─── Render job management ───────────────────────────────────────────────

    private startRenderJob(view: View3D): RendererJob {
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
     * Get the render job for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    // ─── Pause / resume ──────────────────────────────────────────────────────

    /**
     * Pause the render loop for this engine instance.
     */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the render loop for this engine instance.
     */
    public resume() {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
    }

    // ─── Render loop ─────────────────────────────────────────────────────────

    private async render(time: number) {
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

    private async updateFrame(time: number) {
        // Activate this instance so all static subsystem proxies point to its state
        this.activate();

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

        for (const iterator of this.componentCollect.componentsBeforeUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        let command = this.context.device.createCommandEncoder();
        for (const iterator of this.componentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k, command);
            }
        }

        this.context.device.queue.submit([command.finish()]);

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

        if (this._renderLoop) await this._renderLoop();

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

        if (this._lateRender) await this._lateRender();
    }
}
