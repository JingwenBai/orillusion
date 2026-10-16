import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { EngineContext } from './core/EngineContext';
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

/** Default engine settings factory */
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

/** Flag ensuring one-time global inits (WASM, ShaderLib) only run once across all Engine3D instances. */
let _globalInitDone = false;

/**
 * Orillusion 3D Engine
 *
 * Supports multiple concurrent instances — each with its own canvas, scene, and render pipeline.
 *
 * **Single-instance (legacy) usage:**
 * ```ts
 * Engine3D.setting.render.hdrExposure = 1.5;
 * await Engine3D.init({ canvasConfig: { ... } });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-instance usage:**
 * ```ts
 * const engineA = new Engine3D();
 * await engineA.init({ canvasConfig: { canvas: canvasA } });
 * engineA.startRenderView(viewA);
 *
 * const engineB = new Engine3D();
 * await engineB.init({ canvasConfig: { canvas: canvasB } });
 * engineB.startRenderView(viewB);
 * ```
 * @group engine3D
 */
export class Engine3D {

    // ─────────────────────────────────────────────
    // Instance state
    // ─────────────────────────────────────────────

    public res: Res;
    public inputSystem: InputSystem;
    public views: View3D[];
    public renderJobs: Map<View3D, RendererJob>;
    public setting: EngineSetting;

    /** Per-engine GPU context (canvas, swap-chain, etc.). */
    public engineContext: EngineContext;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.setting = createDefaultSetting();
    }

    // ─────────────────────────────────────────────
    // Instance getters / setters
    // ─────────────────────────────────────────────

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
        return this.engineContext.webGPUContext.presentationSize;
    }

    public get aspect(): number {
        return this.engineContext.webGPUContext.aspect;
    }

    public get width(): number {
        return this.engineContext.webGPUContext.windowWidth;
    }

    public get height(): number {
        return this.engineContext.webGPUContext.windowHeight;
    }

    // ─────────────────────────────────────────────
    // Instance methods
    // ─────────────────────────────────────────────

    /**
     * Create WebGPU 3D engine instance.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // Create per-engine GPU context and activate it so all subsystems see the right canvas.
        this.engineContext = new EngineContext();
        EngineContext.activate(this.engineContext);

        if (!_globalInitDone) {
            _globalInitDone = true;
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        await this.engineContext.webGPUContext.init(descriptor.canvasConfig);

        //****pre compute reflection setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );
        //****pre compute reflection setting****/

        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        RTResourceMap.init();
        ShadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.engineContext.webGPUContext.canvas);

        // Set this instance as the default static target for backward-compat APIs.
        Engine3D._defaultInstance = this;
        return;
    }

    private startRenderJob(view: View3D) {
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
    public startRenderView(view: View3D) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set render views and start renderer.
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
     * Get view render job instance.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause this engine instance.
     */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume this engine instance.
     */
    public resume() {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
    }

    private async _render(time: number) {
        // Activate this engine's per-instance GPU context before rendering.
        EngineContext.activate(this.engineContext);

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

    private async _updateFrame(time: number) {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const ctx = this.engineContext.webGPUContext;

        /* update all transform */
        let views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = ctx.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        /****** auto before update — only this engine's views *****/
        for (const [view, callbacks] of ComponentCollect.componentsBeforeUpdateList) {
            if (!this.views.includes(view)) continue;
            for (const [f, c] of callbacks) {
                if (f.enable) c(view);
            }
        }

        let command = ctx.device.createCommandEncoder();
        for (const [view, callbacks] of ComponentCollect.componentsComputeList) {
            if (!this.views.includes(view)) continue;
            for (const [f, c] of callbacks) {
                if (f.enable) c(view, command);
            }
        }
        ctx.device.queue.submit([command.finish()]);

        /****** auto update — only this engine's views *****/
        for (const [view, callbacks] of ComponentCollect.componentsUpdateList) {
            if (!this.views.includes(view)) continue;
            for (const [f, c] of callbacks) {
                if (f.enable) c(view);
            }
        }

        for (const [view, callbacks] of ComponentCollect.graphicComponent) {
            if (!this.views.includes(view)) continue;
            for (const [f, c] of callbacks) {
                if (view && f.enable) c(view);
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        /****** write global matrix buffer to GPU *****/
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        /****** auto late update — only this engine's views *****/
        for (const [view, callbacks] of ComponentCollect.componentsLateUpdateList) {
            if (!this.views.includes(view)) continue;
            for (const [f, c] of callbacks) {
                if (f.enable) c(view);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // ─────────────────────────────────────────────
    // Static backward-compat API (delegates to _defaultInstance)
    // ─────────────────────────────────────────────

    /**
     * The default engine instance, used by static backward-compat methods.
     * Set automatically when `Engine3D.init()` or `new Engine3D().init()` is called.
     */
    private static _defaultInstance: Engine3D;

    private static get _inst(): Engine3D {
        if (!Engine3D._defaultInstance) {
            Engine3D._defaultInstance = new Engine3D();
        }
        return Engine3D._defaultInstance;
    }

    /** @deprecated Prefer `new Engine3D()` for multi-instance support. */
    public static get res(): Res { return Engine3D._inst.res; }
    public static set res(v: Res) { Engine3D._inst.res = v; }

    /** @deprecated Prefer `new Engine3D()` for multi-instance support. */
    public static get inputSystem(): InputSystem { return Engine3D._inst.inputSystem; }
    public static set inputSystem(v: InputSystem) { Engine3D._inst.inputSystem = v; }

    /** @deprecated Prefer `new Engine3D()` for multi-instance support. */
    public static get views(): View3D[] { return Engine3D._inst.views; }
    public static set views(v: View3D[]) { Engine3D._inst.views = v; }

    /** @deprecated Prefer `new Engine3D()` for multi-instance support. */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._inst.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { Engine3D._inst.renderJobs = v; }

    /** @deprecated Prefer `new Engine3D()` for multi-instance support. */
    public static get setting(): EngineSetting { return Engine3D._inst.setting; }
    public static set setting(v: EngineSetting) { Engine3D._inst.setting = v; }

    /** @deprecated Prefer instance `frameRate`. */
    public static get frameRate(): number { return Engine3D._inst.frameRate; }
    public static set frameRate(v: number) { Engine3D._inst.frameRate = v; }

    /** @deprecated Prefer instance `size`. */
    public static get size(): number[] { return Engine3D._inst.size; }

    /** @deprecated Prefer instance `aspect`. */
    public static get aspect(): number { return Engine3D._inst.aspect; }

    /** @deprecated Prefer instance `width`. */
    public static get width(): number { return Engine3D._inst.width; }

    /** @deprecated Prefer instance `height`. */
    public static get height(): number { return Engine3D._inst.height; }

    /**
     * Create WebGPU 3D engine (single-instance static API).
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        return Engine3D._inst.init(descriptor);
    }

    /** @deprecated Prefer instance `startRenderView()`. */
    public static startRenderView(view: View3D) {
        return Engine3D._inst.startRenderView(view);
    }

    /** @deprecated Prefer instance `startRenderViews()`. */
    public static startRenderViews(views: View3D[]) {
        return Engine3D._inst.startRenderViews(views);
    }

    /** @deprecated Prefer instance `getRenderJob()`. */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._inst.getRenderJob(view);
    }

    /** @deprecated Prefer instance `pause()`. */
    public static pause() {
        Engine3D._inst.pause();
    }

    /** @deprecated Prefer instance `resume()`. */
    public static resume() {
        Engine3D._inst.resume();
    }
}
