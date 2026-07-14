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
import { RenderTexture } from './textures/RenderTexture';

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
 * Can be used as a static singleton (backward compatible):
 *   Engine3D.setting.*
 *   await Engine3D.init();
 *
 * Or as multiple independent instances:
 *   const engine = new Engine3D();
 *   await engine.init();
 *
 * @group engine3D
 */
export class Engine3D {

    // ─── Per-instance state ────────────────────────────────────────────────────

    /**
     * Resource manager for this engine instance.
     */
    public res: Res;

    /**
     * Input system for this engine instance.
     */
    public inputSystem: InputSystem;

    /**
     * Active views for this engine instance.
     */
    public views: View3D[];

    /**
     * Per-engine render-texture resource map (avoids key collisions between engines).
     */
    public rtResourceMap: RTResourceMap;

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * Engine settings for this instance.
     */
    public setting: EngineSetting;

    private _gBufferMap: Map<string, GBufferFrame>;
    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.setting = createDefaultSetting();
        this.rtResourceMap = new RTResourceMap();
        this._gBufferMap = new Map<string, GBufferFrame>();
    }

    // ─── GBuffer helpers ───────────────────────────────────────────────────────

    /**
     * Get or create a GBufferFrame for this engine by key.
     */
    public getGBufferFrame(key: string, fixedWidth: number = 0, fixedHeight: number = 0, outColor: boolean = true, depthTexture?: RenderTexture): GBufferFrame {
        let gBuffer: GBufferFrame;
        if (!this._gBufferMap.has(key)) {
            gBuffer = new GBufferFrame();
            let size = webGPUContext.presentationSize;
            gBuffer.createGBuffer(
                key,
                fixedWidth === 0 ? size[0] : fixedWidth,
                fixedHeight === 0 ? size[1] : fixedHeight,
                fixedWidth !== 0 && fixedHeight !== 0,
                outColor,
                depthTexture,
                this.rtResourceMap,
            );
            this._gBufferMap.set(key, gBuffer);
        } else {
            gBuffer = this._gBufferMap.get(key);
        }
        return gBuffer;
    }

    /**
     * Get the GUI GBuffer frame, creating it alongside the colour pass frame.
     */
    public getGUIBufferFrame(): GBufferFrame {
        let colorRTFrame = this.getGBufferFrame(GBufferFrame.colorPass_GBuffer);
        return this.getGBufferFrame(GBufferFrame.gui_GBuffer, 0, 0, true, colorRTFrame.depthTexture);
    }

    // ─── Frame rate ────────────────────────────────────────────────────────────

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

    // ─── Canvas size helpers (delegating to shared webGPUContext) ──────────────

    public get size(): number[] {
        return webGPUContext.presentationSize;
    }

    public get aspect(): number {
        return webGPUContext.aspect;
    }

    public get width(): number {
        return webGPUContext.windowWidth;
    }

    public get height(): number {
        return webGPUContext.windowHeight;
    }

    // ─── Instance lifecycle ────────────────────────────────────────────────────

    /**
     * Initialise this engine instance.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        await webGPUContext.init(descriptor.canvasConfig);

        // Pre-compute reflection GBuffer
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        this.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

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
        this.inputSystem.initCanvas(webGPUContext.canvas);
        return;
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
     * Set a render view and start the renderer.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        view.engine = this;
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the renderer.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            views[i].engine = this;
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
     * Pause rendering.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume rendering.
     */
    public resume(): void {
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
        await this.updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async updateFrame(time: number) {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        // Before-update phase — iterate only this engine's views
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const beforeMap = ComponentCollect.componentsBeforeUpdateList.get(view);
            if (beforeMap) {
                for (const [f, c] of beforeMap) {
                    if (f.enable) c(view);
                }
            }
        }

        let command = webGPUContext.device.createCommandEncoder();
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const computeMap = ComponentCollect.componentsComputeList.get(view);
            if (computeMap) {
                for (const [f, c] of computeMap) {
                    if (f.enable) c(view, command);
                }
            }
        }
        webGPUContext.device.queue.submit([command.finish()]);

        // Update phase
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const updateMap = ComponentCollect.componentsUpdateList.get(view);
            if (updateMap) {
                for (const [f, c] of updateMap) {
                    if (f.enable) c(view);
                }
            }
        }

        // Graphic phase
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const graphicMap = ComponentCollect.graphicComponent.get(view);
            if (graphicMap) {
                for (const [f, c] of graphicMap) {
                    if (f.enable) c(view);
                }
            }
        }

        if (this._renderLoop)
            await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        // Late-update phase
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const lateMap = ComponentCollect.componentsLateUpdateList.get(view);
            if (lateMap) {
                for (const [f, c] of lateMap) {
                    if (f.enable) c(view);
                }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // ─── Static backward-compatibility facade ─────────────────────────────────
    // All existing code using Engine3D.init(), Engine3D.setting, etc. continues
    // to work unchanged. New multi-instance code uses `new Engine3D()` instead.

    private static _default: Engine3D = new Engine3D();

    /** @deprecated Use `new Engine3D()` for multi-instance support */
    public static get res(): Res { return Engine3D._default.res; }
    public static set res(value: Res) { Engine3D._default.res = value; }

    /** @deprecated Use `new Engine3D()` for multi-instance support */
    public static get inputSystem(): InputSystem { return Engine3D._default.inputSystem; }

    /** @deprecated Use `new Engine3D()` for multi-instance support */
    public static get views(): View3D[] { return Engine3D._default.views; }

    /** @deprecated Use `new Engine3D()` for multi-instance support */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._default.renderJobs; }

    /** @deprecated Use `new Engine3D()` for multi-instance support */
    public static get setting(): EngineSetting { return Engine3D._default.setting; }
    public static set setting(value: EngineSetting) { Engine3D._default.setting = value; }

    /** @deprecated Use `new Engine3D()` for multi-instance support */
    public static get frameRate(): number { return Engine3D._default.frameRate; }
    public static set frameRate(value: number) { Engine3D._default.frameRate = value; }

    /** @deprecated Use `new Engine3D()` for multi-instance support */
    public static get size(): number[] { return Engine3D._default.size; }

    /** @deprecated Use `new Engine3D()` for multi-instance support */
    public static get aspect(): number { return Engine3D._default.aspect; }

    /** @deprecated Use `new Engine3D()` for multi-instance support */
    public static get width(): number { return Engine3D._default.width; }

    /** @deprecated Use `new Engine3D()` for multi-instance support */
    public static get height(): number { return Engine3D._default.height; }

    /** @deprecated Use `new Engine3D()` for multi-instance support */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        return Engine3D._default.init(descriptor);
    }

    /** @deprecated Use `new Engine3D()` for multi-instance support */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._default.startRenderView(view);
    }

    /** @deprecated Use `new Engine3D()` for multi-instance support */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._default.startRenderViews(views);
    }

    /** @deprecated Use `new Engine3D()` for multi-instance support */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._default.getRenderJob(view);
    }

    /** @deprecated Use `new Engine3D()` for multi-instance support */
    public static pause(): void {
        Engine3D._default.pause();
    }

    /** @deprecated Use `new Engine3D()` for multi-instance support */
    public static resume(): void {
        Engine3D._default.resume();
    }
}
