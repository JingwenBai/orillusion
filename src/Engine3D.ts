import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setWebGPUContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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

function makeDefaultSetting(): EngineSetting {
    return {
        doublePrecision: false,
        occlusionQuery: { enable: true, debug: false },
        pick: { enable: true, mode: `bound`, detail: `mesh` },
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
                bloom: { downSampleStep: 3, downSampleBlurSize: 9, downSampleBlurSigma: 1.0, upSampleBlurSize: 9, upSampleBlurSigma: 1.0, luminanceThreshole: 1.0, bloomIntensity: 1.0, hdr: 1.0 },
                globalFog: { debug: false, enable: false, fogType: 0.0, fogHeightScale: 0.1, start: 400, end: 10, density: 0.02, ins: 0.5, skyFactor: 0.5, skyRoughness: 0.4, overrideSkyFactor: 0.8, fogColor: new Color(96/255, 117/255, 133/255, 1), falloff: 0.7, rayLength: 200.0, scatteringExponent: 2.7, dirHeightLine: 10.0 },
                godRay: { blendColor: true, rayMarchCount: 16, scatteringExponent: 5, intensity: 0.5 },
                ssao: { enable: false, radius: 0.15, bias: -0.1, aoPower: 2.0, debug: true },
                outline: { enable: false, strength: 1, groupCount: 4, outlinePixel: 2, fadeOutlinePixel: 4, textureScale: 1, useAddMode: false, debug: true },
                taa: { enable: false, jitterSeedCount: 8, blendFactor: 0.1, sharpFactor: 0.6, sharpPreBlurFactor: 0.5, temporalJitterScale: 0.13, debug: true },
                gtao: { enable: false, darkFactor: 1.0, maxDistance: 5.0, maxPixel: 50.0, rayMarchSegment: 6, multiBounce: false, usePosFloat32: true, blendColor: true, debug: true },
                ssr: { enable: false, pixelRatio: 1, fadeEdgeRatio: 0.2, rayMarchRatio: 0.5, fadeDistanceMin: 600, fadeDistanceMax: 2000, roughnessThreshold: 0.5, powDotRN: 0.2, mixThreshold: 0.1, debug: true },
                fxaa: { enable: false },
                depthOfView: { enable: false, iterationCount: 3, pixelOffset: 1.0, near: 150, far: 300 },
            },
        },
        shadow: {
            enable: true, type: 'HARD', pointShadowBias: 0.0005, shadowSize: 2048, pointShadowSize: 1024,
            shadowSoft: 0.005, shadowBound: 100, shadowBias: 0.05, needUpdate: true, autoUpdate: true,
            updateFrameRate: 2, csmMargin: 0.1, csmScatteringExp: 0.7, csmAreaScale: 0.4, debug: false,
        },
        gi: {
            enable: false, offsetX: 0, offsetY: 0, offsetZ: 0, probeSpace: 64,
            probeXCount: 4, probeYCount: 2, probeZCount: 4, probeSize: 32, probeSourceTextureSize: 2048,
            octRTMaxSize: 2048, octRTSideSize: 16, maxDistance: 64 * 1.73, normalBias: 0.25,
            depthSharpness: 1, hysteresis: 0.98, lerpHysteresis: 0.01, irradianceChebyshevBias: 0.01,
            rayNumber: 144, irradianceDistanceBias: 32, indirectIntensity: 1.0, ddgiGamma: 2.2,
            bounceIntensity: 0.025, probeRoughness: 1, realTimeGI: false, debug: false, autoRenderProbe: false,
        },
        sky: { type: 'HDRSKY', sky: null, skyExposure: 1.0, defaultFar: 65536, defaultNear: 1 },
        light: { maxLight: 4096 },
        material: { materialChannelDebug: false, materialDebug: false },
        loader: { numConcurrent: 20 },
        reflectionSetting: { reflectionProbeMaxCount: 8, reflectionProbeSize: 256, width: 256*6, height: 8*256, enable: true }
    };
}

/**
 * Orillusion 3D Engine
 *
 * Supports the classic single-instance static API (backward compatible):
 *   await Engine3D.init();
 *   Engine3D.startRenderView(view);
 *
 * And the explicit multi-instance API for running multiple canvases:
 *   const engine1 = new Engine3D();
 *   await engine1.init({ canvasConfig: { canvas: canvas1 } });
 *   engine1.startRenderView(view1);
 *
 *   const engine2 = new Engine3D();
 *   await engine2.init({ canvasConfig: { canvas: canvas2 } });
 *   engine2.startRenderView(view2);
 *
 * @group engine3D
 */
export class Engine3D {

    // ─── Per-instance state ─────────────────────────────────────────────────

    /** Unique string id for this instance, used to namespace shared resources. */
    public readonly id: string;

    /** Per-engine WebGPU canvas context (canvas, swap-chain, viewport dimensions). */
    public context: Context3D;

    public res: Res;
    public inputSystem: InputSystem;
    public views: View3D[] = [];
    public renderJobs: Map<View3D, RendererJob> = new Map();
    public setting: EngineSetting = makeDefaultSetting();

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ─── Singleton tracking ─────────────────────────────────────────────────

    private static _engineCounter: number = 0;
    /** Whether the one-time global GPU/shader initialisation has been done. */
    private static _globalInitialized: boolean = false;
    /** The default instance used by the static backward-compat API. */
    private static _default: Engine3D | null = null;

    constructor() {
        this.id = 'engine_' + Engine3D._engineCounter++;
    }

    // ─── Static backward-compat API ────────────────────────────────────────

    public static get res(): Res { return Engine3D._default?.res; }
    public static set res(v: Res) { if (Engine3D._default) Engine3D._default.res = v; }

    public static get setting(): EngineSetting { return Engine3D._default?.setting; }
    public static set setting(v: EngineSetting) { if (Engine3D._default) Engine3D._default.setting = v; }

    public static get views(): View3D[] { return Engine3D._default?.views; }
    public static set views(v: View3D[]) { if (Engine3D._default) Engine3D._default.views = v; }

    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._default?.renderJobs; }

    public static get inputSystem(): InputSystem { return Engine3D._default?.inputSystem; }

    public static get size(): number[] { return Engine3D._default?.context?.presentationSize ?? [0, 0]; }
    public static get aspect(): number { return Engine3D._default?.context?.aspect ?? 1; }
    public static get width(): number { return Engine3D._default?.context?.windowWidth ?? 0; }
    public static get height(): number { return Engine3D._default?.context?.windowHeight ?? 0; }

    public static get frameRate(): number { return Engine3D._default?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (Engine3D._default) Engine3D._default.frameRate = value; }

    /** Initialises the default single-instance (backward-compat static API). */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        Engine3D._default = new Engine3D();
        return Engine3D._default.init(descriptor);
    }

    public static startRenderView(view: View3D): RendererJob { return Engine3D._default?.startRenderView(view); }
    public static startRenderViews(views: View3D[]) { Engine3D._default?.startRenderViews(views); }
    public static getRenderJob(view: View3D): RendererJob { return Engine3D._default?.getRenderJob(view); }
    public static pause() { Engine3D._default?.pause(); }
    public static resume() { Engine3D._default?.resume(); }

    // ─── Instance API ───────────────────────────────────────────────────────

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    public get size(): number[] { return this.context.presentationSize; }
    public get aspect(): number { return this.context.aspect; }
    public get width(): number { return this.context.windowWidth; }
    public get height(): number { return this.context.windowHeight; }

    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }
        // First engine to call init() becomes the backward-compat default (covers direct new Engine3D() usage).
        if (!Engine3D._default) {
            Engine3D._default = this;
        }
        this.setting = { ...this.setting, ...descriptor.engineSetting };

        if (!Engine3D._globalInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // Create this engine's own canvas + GPU swap-chain context
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);

        // Publish the shared device through the module-level export so that the
        // ~65 files that import `webGPUContext.device` continue to work unchanged.
        if (!webGPUContext) {
            setWebGPUContext(this.context);
        }

        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        // Use engine-scoped key so each engine gets its own reflection GBuffer.
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false, undefined, this.id
        );

        // Global initialisation runs exactly once (shaders, pipelines, bind groups).
        if (!Engine3D._globalInitialized) {
            Engine3D._globalInitialized = true;
            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            RTResourceMap.init();
            ShadowLightsCollect.init();
        }

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);
    }

    private startRenderJob(view: View3D): RendererJob {
        // Bind this engine to the view so render-pass code can reach per-engine state.
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

    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    public startRenderViews(views: View3D[]) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this.startRenderJob(views[i]);
        }
        this.resume();
    }

    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

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
                    setTimeout(() => { time += (performance.now() - t); res(true); }, this._frameRateValue - delta);
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

        let views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            // Use this engine's own canvas size, not the global singleton.
            let [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        // Only tick components that belong to this engine's views.
        for (const view of this.views) {
            let list = ComponentCollect.componentsBeforeUpdateList.get(view);
            if (list) {
                for (const [component, callback] of list) {
                    if (component.enable) callback(view);
                }
            }
        }

        let command = this.context.device.createCommandEncoder();
        for (const view of this.views) {
            let list = ComponentCollect.componentsComputeList.get(view);
            if (list) {
                for (const [component, callback] of list) {
                    if (component.enable) callback(view, command);
                }
            }
        }
        this.context.device.queue.submit([command.finish()]);

        for (const view of this.views) {
            let list = ComponentCollect.componentsUpdateList.get(view);
            if (list) {
                for (const [component, callback] of list) {
                    if (component.enable) callback(view);
                }
            }
        }

        for (const view of this.views) {
            let list = ComponentCollect.graphicComponent.get(view);
            if (list) {
                for (const [component, callback] of list) {
                    if (component && component.enable) callback(view);
                }
            }
        }

        if (this._renderLoop) { await this._renderLoop(); }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) { v.start(); }
            v.renderFrame();
        });

        for (const view of this.views) {
            let list = ComponentCollect.componentsLateUpdateList.get(view);
            if (list) {
                for (const [component, callback] of list) {
                    if (component.enable) callback(view);
                }
            }
        }

        if (this._lateRender) await this._lateRender();
    }
}
