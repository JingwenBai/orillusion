import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { EntityCollect } from './gfx/renderJob/collect/EntityCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';
import { RenderTexture } from './textures/RenderTexture';

/**
 * Engine3D - instantiable 3D engine.
 * Multiple instances can run independently with their own canvases.
 *
 * Usage:
 *   const engine = new Engine3D();
 *   await engine.init({ canvasConfig: { canvas: myCanvas } });
 *   engine.startRenderView(view);
 *
 * Global/shared state (shared across all instances):
 *   Engine3D.setting  - engine-wide settings
 *   Engine3D.res      - shared default resources
 *
 * @group engine3D
 */
export class Engine3D {

    // ---- Shared global state (static, shared across all instances) ----

    /**
     * Shared resource manager (default textures, materials, geometries)
     */
    public static res: Res;

    /**
     * Global engine settings shared by all instances.
     * Individual instances can override via engine.instanceSetting.
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

    // ---- Per-instance state ----

    /**
     * Per-engine WebGPU canvas context
     * @internal
     */
    public context: Context3D;

    /**
     * Per-engine component update registry
     * @internal
     */
    public componentCollect: ComponentCollect;

    /**
     * Per-engine shadow light registry
     * @internal
     */
    public shadowLightsCollect: ShadowLightsCollect;

    /**
     * Per-engine render texture registry
     * @internal
     */
    public rtResourceMap: RTResourceMap;

    /**
     * Per-engine GBuffer frame registry (keyed by name)
     * @internal
     */
    public gBufferFrameMap: Map<string, GBufferFrame>;

    /**
     * Per-engine entity collect
     * @internal
     */
    public entityCollect: EntityCollect;

    /**
     * input system for this engine instance
     */
    public inputSystem: InputSystem;

    /**
     * active views for this engine instance
     */
    public views: View3D[];

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

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

    /**
     * get render window size [width, height]
     */
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

    /**
     * Get a GBuffer frame by name, creating it if needed.
     * @internal
     */
    public getGBufferFrame(key: string, fixedWidth: number = 0, fixedHeight: number = 0, outColor: boolean = true, depthTexture?: RenderTexture): GBufferFrame {
        let gBuffer: GBufferFrame;
        if (!this.gBufferFrameMap.has(key)) {
            gBuffer = new GBufferFrame();
            let size = this.context.presentationSize;
            gBuffer.createGBuffer(
                this.rtResourceMap,
                key,
                fixedWidth == 0 ? size[0] : fixedWidth,
                fixedHeight == 0 ? size[1] : fixedHeight,
                fixedWidth != 0 && fixedHeight != 0,
                outColor,
                depthTexture
            );
            this.gBufferFrameMap.set(key, gBuffer);
        } else {
            gBuffer = this.gBufferFrameMap.get(key);
        }
        return gBuffer;
    }

    /**
     * Get the GUI GBuffer frame for this engine instance.
     * @internal
     */
    public getGUIBufferFrame(): GBufferFrame {
        let colorRTFrame = this.getGBufferFrame(GBufferFrame.colorPass_GBuffer);
        return this.getGBufferFrame(GBufferFrame.gui_GBuffer, 0, 0, true, colorRTFrame.depthTexture);
    }

    /**
     * Initialize the engine. Creates the WebGPU context, sets up shaders,
     * global bind groups, and render textures.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        Engine3D.setting = { ...Engine3D.setting, ...descriptor.engineSetting };

        // Register as default engine for backward-compat static API
        if (!Engine3D.defaultEngine) {
            Engine3D.defaultEngine = this;
        }

        // Initialize per-engine subsystems
        this.componentCollect = new ComponentCollect();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.rtResourceMap = new RTResourceMap();
        this.gBufferFrameMap = new Map<string, GBufferFrame>();
        this.entityCollect = new EntityCollect();

        // WasmMatrix is shared — only initialize once
        if (Matrix4.allocCount > 0 && !Matrix4['_wasmInitialized']) {
            await WasmMatrix.init(Matrix4.allocCount, Engine3D.setting.doublePrecision);
            Matrix4['_wasmInitialized'] = true;
        }

        // Create per-engine WebGPU context (shares device with existing context)
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);

        // Set webGPUContext to first engine's context for backward compat with deep GPU code
        if (!webGPUContext.device) {
            Object.assign(webGPUContext, this.context);
        }

        Engine3D.setting.reflectionSetting.width = Engine3D.setting.reflectionSetting.reflectionProbeSize * 6;
        Engine3D.setting.reflectionSetting.height = Engine3D.setting.reflectionSetting.reflectionProbeSize * Engine3D.setting.reflectionSetting.reflectionProbeMaxCount;

        this.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            Engine3D.setting.reflectionSetting.width,
            Engine3D.setting.reflectionSetting.height,
            false
        );

        ShaderLib.init();
        ShaderUtil.init();

        // GlobalBindGroup is shared — only initialize once
        if (!GlobalBindGroup['_initialized']) {
            GlobalBindGroup.init();
            GlobalBindGroup['_initialized'] = true;
        }

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);

        // Initialize shared resources once
        if (!Engine3D.res) {
            Engine3D.res = new Res();
            Engine3D.res.initDefault();
        }

        return;
    }

    private startRenderJob(view: View3D): RendererJob {
        view.engine = this;
        // Re-create shadow buffer now that the engine is set on the view
        this.shadowLightsCollect.createBuffer(view);

        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (Engine3D.setting.pick.mode == `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (Engine3D.setting.pick.mode == `pixel` || Engine3D.setting.pick.mode == `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Set a render view and start the render loop.
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

    /**
     * Pause the engine render loop.
     */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the engine render loop.
     */
    public resume() {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
    }

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
        // Set this engine as the active context for the duration of this frame
        Context3D.currentContext = this.context;
        await this.updateFrame(time);
        Context3D.currentContext = null;
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async updateFrame(time: number) {
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
                if (f.enable) {
                    c(k);
                };
            }
        }

        let command = this.context.device.createCommandEncoder();
        for (const iterator of this.componentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k, command);
                };
            }
        }

        this.context.device.queue.submit([command.finish()]);

        for (const iterator of this.componentCollect.componentsUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                };
            }
        }

        for (const iterator of this.componentCollect.graphicComponent) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (k && f.enable) {
                    c(k);
                };
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

        for (const iterator of this.componentCollect.componentsLateUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                };
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // ---- Backward-compatible static API (delegates to defaultEngine) ----

    /** Default (first) engine instance for single-instance backward compat */
    public static defaultEngine: Engine3D | null = null;

    public static get inputSystem(): InputSystem {
        return Engine3D.defaultEngine?.inputSystem;
    }

    public static get views(): View3D[] {
        return Engine3D.defaultEngine?.views;
    }

    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D.defaultEngine?.renderJobs;
    }

    public static get aspect(): number {
        return Engine3D.defaultEngine?.aspect ?? 1;
    }

    public static get size(): number[] {
        return Engine3D.defaultEngine?.size ?? [0, 0];
    }

    public static get width(): number {
        return Engine3D.defaultEngine?.width ?? 0;
    }

    public static get height(): number {
        return Engine3D.defaultEngine?.height ?? 0;
    }

    public static get frameRate(): number {
        return Engine3D.defaultEngine?.frameRate ?? 360;
    }

    public static set frameRate(value: number) {
        if (Engine3D.defaultEngine) Engine3D.defaultEngine.frameRate = value;
    }

    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {
        const engine = new Engine3D();
        await engine.init(descriptor);
    }

    public static startRenderView(view: View3D): RendererJob {
        return Engine3D.defaultEngine?.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]) {
        Engine3D.defaultEngine?.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.defaultEngine?.getRenderJob(view);
    }

    public static pause() {
        Engine3D.defaultEngine?.pause();
    }

    public static resume() {
        Engine3D.defaultEngine?.resume();
    }
}
