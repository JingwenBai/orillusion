import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';
import { registerEngineAccessor } from './EngineRegistry';

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
 * Orillusion 3D Engine
 *
 * Can be used as a classic static singleton:
 *   Engine3D.setting.*
 *   await Engine3D.init();
 *
 * Or instantiated for multi-instance scenarios:
 *   const engine = new Engine3D();
 *   await engine.init({ canvasConfig: { canvas } });
 *
 * @group engine3D
 */
export class Engine3D {

    // -------------------------------------------------------------------------
    // Global (one-time) init guard – shared across all instances
    // -------------------------------------------------------------------------
    private static _globalInited: boolean = false;

    // -------------------------------------------------------------------------
    // Active/default instance registry
    // -------------------------------------------------------------------------

    /** The default Engine3D instance (first one created via static Engine3D.init). */
    public static _defaultInstance: Engine3D | null = null;

    /**
     * The engine instance that is currently executing its render frame.
     * Null between frames.  Used by static proxy helpers so that per-engine
     * resources (RTResourceMap, GBufferFrame, …) are automatically routed to
     * the correct instance during rendering.
     */
    public static _rendering: Engine3D | null = null;

    /**
     * Returns the engine that should service static resource requests right now:
     * the currently-rendering instance during a frame, or the default instance
     * between frames.
     */
    public static getActiveOrDefault(): Engine3D {
        return Engine3D._rendering ?? Engine3D._defaultInstance;
    }

    // -------------------------------------------------------------------------
    // Instance state  (previously all static)
    // -------------------------------------------------------------------------

    /** Resource manager for this engine instance */
    public res: Res;

    /** Input system for this engine instance */
    public inputSystem: InputSystem;

    /** Active views owned by this instance */
    public views: View3D[];

    /** Render job map for this instance */
    public renderJobs: Map<View3D, RendererJob>;

    /** Per-instance render texture store */
    public rtResourceMap: RTResourceMap;

    /** Per-instance GBuffer frame map */
    public gBufferFrameMap: Map<string, GBufferFrame>;

    /** WebGPU canvas context for this instance */
    public context: Context3D;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // Per-instance time tracking (mirrors the static Time class for single-instance compat)
    public engineTime: number = 0;
    public engineFrame: number = 0;

    /**
     * Engine render frame-rate.
     * Accepted values: 24 / 30 / 60 / 114 / 120 / 144 / 240 / 360 (≥360 = unlimited).
     */
    public get frameRate(): number {
        return this._frameRate;
    }

    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    /** Render window size [width, height] */
    public get size(): number[] {
        return this.context.presentationSize;
    }

    /** Render window aspect ratio */
    public get aspect(): number {
        return this.context.aspect;
    }

    /** Render window width */
    public get width(): number {
        return this.context.windowWidth;
    }

    /** Render window height */
    public get height(): number {
        return this.context.windowHeight;
    }

    /**
     * Engine configuration.  Each instance has its own independent copy.
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

    // -------------------------------------------------------------------------
    // Instance API
    // -------------------------------------------------------------------------

    /**
     * Initialise this engine instance against the given canvas / config.
     * Can be called on a `new Engine3D()` for multi-instance use, or via the
     * static `Engine3D.init()` helper for the classic single-instance pattern.
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

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // One-time global initialisation (shared across all instances)
        if (!Engine3D._globalInited) {
            Engine3D._globalInited = true;
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            ShaderLib.init();
            ShaderUtil.init();
        }

        // Per-instance canvas context
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);

        // Set this context as active so that downstream init code uses the
        // right device/canvas (important for the first GlobalBindGroup init).
        setWebGPUContext(this.context);

        //****pre compute setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Per-instance resource stores
        this.rtResourceMap = new RTResourceMap();
        this.gBufferFrameMap = new Map<string, GBufferFrame>();

        // Mark as active before calling getGBufferFrame so GBufferFrame proxy works
        Engine3D._rendering = this;

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        Engine3D._rendering = null;
        //****pre compute setting****/

        // Global shared subsystems – idempotent so safe to call per instance
        GlobalBindGroup.init();
        ShadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);

        // Register as default instance if none set yet
        if (!Engine3D._defaultInstance) {
            Engine3D._defaultInstance = this;
        }
    }

    private _startRenderJob(view: View3D): RendererJob {
        // Ensure view knows its owner engine
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
     * Set render view and start the render loop for this engine instance.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop for this engine instance.
     */
    public startRenderViews(views: View3D[]) {
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
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume this engine's render loop.
     */
    public resume() {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    private async _render(time: number) {
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
        // Activate this engine's context and mark it as the rendering instance
        setWebGPUContext(this.context);
        Engine3D._rendering = this;

        // Update per-instance time; also keep the global Time in sync for
        // single-instance backward compatibility.
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        this.engineTime = time;
        this.engineFrame = Time.frame;

        Interpolator.tick(Time.delta);

        let views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        for (const iterator of ComponentCollect.componentsBeforeUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            // Only process components that belong to this engine's views
            if (!this.views.includes(k)) continue;
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        let command = this.context.device.createCommandEncoder();
        for (const iterator of ComponentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            if (!this.views.includes(k)) continue;
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k, command);
            }
        }
        this.context.device.queue.submit([command.finish()]);

        for (const iterator of ComponentCollect.componentsUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            if (!this.views.includes(k)) continue;
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        for (const iterator of ComponentCollect.graphicComponent) {
            let k = iterator[0];
            let v = iterator[1];
            if (!this.views.includes(k)) continue;
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (k && f.enable) c(k);
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

        for (const iterator of ComponentCollect.componentsLateUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            if (!this.views.includes(k)) continue;
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        if (this._lateRender)
            await this._lateRender();

        Engine3D._rendering = null;
    }

    // -------------------------------------------------------------------------
    // Static backward-compatibility API
    // All static members below delegate to Engine3D._defaultInstance so that
    // existing code continues to work without modification.
    // -------------------------------------------------------------------------

    /** @deprecated Use instance member.  Prefer engine.res for multi-instance. */
    public static get res(): Res {
        return (Engine3D._rendering ?? Engine3D._defaultInstance)?.res;
    }
    public static set res(v: Res) {
        const target = Engine3D._rendering ?? Engine3D._defaultInstance;
        if (target) target.res = v;
    }

    /** @deprecated Use instance member.  Prefer engine.inputSystem for multi-instance. */
    public static get inputSystem(): InputSystem {
        return (Engine3D._rendering ?? Engine3D._defaultInstance)?.inputSystem;
    }
    public static set inputSystem(v: InputSystem) {
        const target = Engine3D._rendering ?? Engine3D._defaultInstance;
        if (target) target.inputSystem = v;
    }

    /** @deprecated Use instance member.  Kept for backward compatibility. */
    public static get views(): View3D[] {
        return Engine3D._defaultInstance?.views;
    }
    public static set views(v: View3D[]) {
        if (Engine3D._defaultInstance) Engine3D._defaultInstance.views = v;
    }

    /** @deprecated Use instance member.  Kept for backward compatibility. */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._defaultInstance?.renderJobs;
    }
    public static set renderJobs(v: Map<View3D, RendererJob>) {
        if (Engine3D._defaultInstance) Engine3D._defaultInstance.renderJobs = v;
    }

    /**
     * Returns the setting of the currently-rendering engine during a frame,
     * or the default instance's setting between frames.
     * @deprecated Prefer engine.setting for multi-instance usage.
     */
    public static get setting(): EngineSetting {
        return (Engine3D._rendering ?? Engine3D._defaultInstance)?.setting;
    }
    public static set setting(v: EngineSetting) {
        const target = Engine3D._rendering ?? Engine3D._defaultInstance;
        if (target) target.setting = v;
    }

    /** @deprecated Use instance member.  Kept for backward compatibility. */
    public static get frameRate(): number {
        return Engine3D._defaultInstance?.frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (Engine3D._defaultInstance) Engine3D._defaultInstance.frameRate = value;
    }

    /** @deprecated Use instance member.  Kept for backward compatibility. */
    public static get size(): number[] {
        return Engine3D._defaultInstance?.size;
    }

    /** @deprecated Use instance member.  Kept for backward compatibility. */
    public static get aspect(): number {
        return Engine3D._defaultInstance?.aspect;
    }

    /** @deprecated Use instance member.  Kept for backward compatibility. */
    public static get width(): number {
        return Engine3D._defaultInstance?.width;
    }

    /** @deprecated Use instance member.  Kept for backward compatibility. */
    public static get height(): number {
        return Engine3D._defaultInstance?.height;
    }

    /**
     * @deprecated Use `new Engine3D()` + `engine.init()` for multi-instance.
     * Kept as the classic single-instance entry point.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<Engine3D> {
        const engine = new Engine3D();
        Engine3D._defaultInstance = engine;
        await engine.init(descriptor);
        return engine;
    }

    /** @deprecated Use instance method.  Kept for backward compatibility. */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._defaultInstance.startRenderView(view);
    }

    /** @deprecated Use instance method.  Kept for backward compatibility. */
    public static startRenderViews(views: View3D[]) {
        Engine3D._defaultInstance.startRenderViews(views);
    }

    /** @deprecated Use instance method.  Kept for backward compatibility. */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._defaultInstance?.getRenderJob(view);
    }

    /** @deprecated Use instance method.  Kept for backward compatibility. */
    public static pause() {
        Engine3D._defaultInstance?.pause();
    }

    /** @deprecated Use instance method.  Kept for backward compatibility. */
    public static resume() {
        Engine3D._defaultInstance?.resume();
    }
}

// Register Engine3D as the provider for per-engine resource maps.
// EngineRegistry is imported by RTResourceMap and GBufferFrame to avoid circular
// dependencies; Engine3D sets the accessor here after the class is defined.
registerEngineAccessor({
    getActiveOrDefault: () => Engine3D.getActiveOrDefault(),
});
