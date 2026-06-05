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

/**
 * Create the default engine settings object (each Engine3D instance gets its own copy).
 * @internal
 */
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
 * Supports multiple simultaneous instances, each with its own canvas, scene and renderer.
 *
 * Single-instance (backward-compatible) usage:
 * ```ts
 * Engine3D.setting.render.debug = true;
 * await Engine3D.init({ canvasConfig: {...} });
 * Engine3D.startRenderView(view);
 * ```
 *
 * Multi-instance usage:
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

    // ── Static multi-instance registry ─────────────────────────────────────

    /** The currently rendering Engine3D instance (updated before each render frame). */
    public static _current: Engine3D = null;

    /** Guard: WASM matrix system is initialized once globally (shared buffer pool). */
    private static _wasmInitialized: boolean = false;

    /** Guard: shader library is registered once (strings, not device-specific). */
    private static _shadersInitialized: boolean = false;

    /**
     * Default settings shared before any instance is created.
     * Users may configure Engine3D.setting before calling Engine3D.init().
     * @internal
     */
    private static _defaultSetting: EngineSetting = createDefaultSetting();

    // ── Static backward-compat facade ──────────────────────────────────────

    /**
     * Engine settings. Before init(), accesses/modifies the default template.
     * After init(), accesses the current instance's settings.
     */
    public static get setting(): EngineSetting {
        return Engine3D._current ? Engine3D._current._setting : Engine3D._defaultSetting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D._current) {
            Engine3D._current._setting = { ...Engine3D._current._setting, ...v };
        } else {
            Engine3D._defaultSetting = { ...Engine3D._defaultSetting, ...v };
        }
    }

    /** Resource manager of the current engine instance. */
    public static get res(): Res { return Engine3D._current?._res; }

    /** Input system of the current engine instance. */
    public static get inputSystem(): InputSystem { return Engine3D._current?._inputSystem; }

    /** Active views of the current engine instance. */
    public static get views(): View3D[] { return Engine3D._current?._views; }
    public static set views(v: View3D[]) { if (Engine3D._current) Engine3D._current._views = v; }

    /** Render jobs map of the current engine instance. */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._current?._renderJobs; }

    /** Render window width of the current engine instance. */
    public static get size(): number[] { return webGPUContext?.presentationSize; }
    public static get aspect(): number { return webGPUContext?.aspect; }
    public static get width(): number { return webGPUContext?.windowWidth; }
    public static get height(): number { return webGPUContext?.windowHeight; }

    /** Frame rate of the current engine instance. */
    public static get frameRate(): number { return Engine3D._current?._frameRate ?? 360; }
    public static set frameRate(v: number) { if (Engine3D._current) Engine3D._current.frameRate = v; }

    // ── Static facade methods (backward compat) ────────────────────────────

    /**
     * Initialize a single-instance engine (backward-compatible static API).
     * Creates an Engine3D instance internally and sets it as the current instance.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        // Apply any settings configured on the static default before creating the instance
        if (descriptor.engineSetting) {
            engine._setting = { ...Engine3D._defaultSetting, ...descriptor.engineSetting };
        } else {
            engine._setting = { ...Engine3D._defaultSetting };
        }
        await engine._initInternal(descriptor);
    }

    /** Set render view and start renderer (backward-compatible static API). */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._current?.startRenderView(view);
    }

    /** Set render views and start renderer (backward-compatible static API). */
    public static startRenderViews(views: View3D[]) {
        Engine3D._current?.startRenderViews(views);
    }

    /** Get the render job for a view (backward-compatible static API). */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._current?.getRenderJob(view);
    }

    /** Pause the render loop (backward-compatible static API). */
    public static pause() {
        Engine3D._current?.pause();
    }

    /** Resume the render loop (backward-compatible static API). */
    public static resume() {
        Engine3D._current?.resume();
    }

    // ── Instance state ─────────────────────────────────────────────────────

    /** This engine instance's WebGPU context (canvas + GPU context). */
    public context: Context3D;

    /** Resource manager for this engine instance. */
    public get res(): Res { return this._res; }

    /** Input system for this engine instance. */
    public get inputSystem(): InputSystem { return this._inputSystem; }

    /** Active views for this engine instance. */
    public get views(): View3D[] { return this._views; }

    /** Render jobs map for this engine instance. */
    public get renderJobs(): Map<View3D, RendererJob> { return this._renderJobs; }

    /** Frame rate for this engine instance. */
    public get frameRate(): number { return this._frameRate; }
    public set frameRate(v: number) {
        this._frameRate = v;
        this._frameRateValue = 1000 / v;
        if (v >= 360) this._frameRateValue = 0;
    }

    public _setting: EngineSetting;

    /** Engine settings for this instance. */
    public get setting(): EngineSetting { return this._setting; }
    public set setting(v: EngineSetting) { this._setting = { ...this._setting, ...v }; }

    private _res: Res;
    private _inputSystem: InputSystem;
    private _views: View3D[];
    private _renderJobs: Map<View3D, RendererJob>;

    private _frameRate: number = 360;
    private _frameRateValue: number = 0;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /** Per-engine GlobalBindGroup instance. */
    private _globalBindGroup: GlobalBindGroup;
    /** Per-engine RTResourceMap instance. */
    private _rtResourceMap: RTResourceMap;
    /** Per-engine GBuffer frame map. */
    private _gBufferMap: Map<string, GBufferFrame>;

    constructor() {
        this._setting = createDefaultSetting();
    }

    // ── Instance public API ────────────────────────────────────────────────

    /**
     * Initialize this Engine3D instance.
     * Multiple instances can be created and initialized independently.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        if (descriptor.engineSetting) {
            this._setting = { ...this._setting, ...descriptor.engineSetting };
        }
        await this._initInternal(descriptor);
    }

    /** Set render view and start renderer for this instance. */
    public startRenderView(view: View3D): RendererJob {
        this._renderJobs ||= new Map<View3D, RendererJob>();
        this._views = [view];
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /** Set multiple render views and start renderer for this instance. */
    public startRenderViews(views: View3D[]) {
        this._renderJobs ||= new Map<View3D, RendererJob>();
        this._views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /** Get the render job for a view belonging to this instance. */
    public getRenderJob(view: View3D): RendererJob {
        return this._renderJobs?.get(view);
    }

    /** Pause this engine's render loop. */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume this engine's render loop. */
    public resume() {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    // ── Private implementation ─────────────────────────────────────────────

    private async _initInternal(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
    }) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Activate this engine so subsystems that read Engine3D.setting work correctly
        Engine3D._current = this;

        // WASM matrix system is a global shared pool — initialize only once
        if (!Engine3D._wasmInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, this._setting.doublePrecision);
            Engine3D._wasmInitialized = true;
        }

        // Create this engine's WebGPU context (canvas), sharing the GPU device
        this.context = new Context3D();
        setActiveWebGPUContext(this.context);
        await this.context.init(descriptor.canvasConfig);

        // Pre-compute reflection settings
        this._setting.reflectionSetting.width = this._setting.reflectionSetting.reflectionProbeSize * 6;
        this._setting.reflectionSetting.height =
            this._setting.reflectionSetting.reflectionProbeSize * this._setting.reflectionSetting.reflectionProbeMaxCount;

        // Create per-engine GBuffer map and activate it
        this._gBufferMap = new Map<string, GBufferFrame>();
        GBufferFrame.setActive(this._gBufferMap);
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this._setting.reflectionSetting.width,
            this._setting.reflectionSetting.height,
            false
        );

        // Shader strings are device-independent — register only once
        if (!Engine3D._shadersInitialized) {
            ShaderLib.init();
            ShaderUtil.init();
            Engine3D._shadersInitialized = true;
        }

        // Per-engine bind group (owns the model matrix GPU buffer)
        this._globalBindGroup = GlobalBindGroup.init();

        // Per-engine render texture map
        this._rtResourceMap = RTResourceMap.init();

        // Shadow light tracking is scene-indexed and shared across engines; init is idempotent
        ShadowLightsCollect.init();

        this._res = new Res();
        this._res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this._inputSystem = new InputSystem();
        this._inputSystem.initCanvas(this.context.canvas);
    }

    private _startRenderJob(view: View3D): RendererJob {
        let renderJob = new ForwardRenderJob(view);
        this._renderJobs.set(view, renderJob);

        if (this._setting.pick.mode == `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this._setting.pick.mode == `pixel` || this._setting.pick.mode == `bound`) {
            view.enablePick = true;
        }
        return renderJob;
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
        // Activate this engine's subsystems for the duration of this frame
        Engine3D._current = this;
        setActiveWebGPUContext(this.context);
        GlobalBindGroup.setActive(this._globalBindGroup);
        RTResourceMap.setActive(this._rtResourceMap);
        GBufferFrame.setActive(this._gBufferMap);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        /* update all transform */
        let views = this._views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        /****** auto before update with component list *****/
        for (const iterator of ComponentCollect.componentsBeforeUpdateList) {
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
        for (const iterator of ComponentCollect.componentsComputeList) {
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

        /****** auto update with component list *****/
        for (const iterator of ComponentCollect.componentsUpdateList) {
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

        for (const iterator of ComponentCollect.graphicComponent) {
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
        /****** write model matrix data to GPU *****/
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this._renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        /****** auto late update with component list *****/
        for (const iterator of ComponentCollect.componentsLateUpdateList) {
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
}
