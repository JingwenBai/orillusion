import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, webGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap, _setEngineRef as _rtSetEngineRef } from './gfx/renderJob/frame/RTResourceMap';
import { GBufferFrame, _setEngineRef as _gbufSetEngineRef } from './gfx/renderJob/frame/GBufferFrame';

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

/**
 * Factory that returns a fresh copy of the default engine settings.
 * Called once per Engine3D instance so each instance has independent settings.
 */
function createDefaultEngineSetting(): EngineSetting {
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
 * Supports both instance-based usage (for multiple simultaneous engines on
 * separate canvases) and the classic static API (backward compatible).
 *
 * Instance usage:
 *   const engine = new Engine3D();
 *   await engine.init({ canvasConfig: { canvas: myCanvas } });
 *   engine.startRenderView(view);
 *
 * Classic static usage (unchanged):
 *   await Engine3D.init();
 *   Engine3D.startRenderView(view);
 *
 * @group engine3D
 */
export class Engine3D {

    // =====================================================================
    // Instance state  (one set per engine instance)
    // =====================================================================

    /** Resource manager for this engine instance */
    public res: Res;

    /** Input system bound to this instance's canvas */
    public inputSystem: InputSystem;

    /** Active views registered with this instance */
    public views: View3D[];

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /** WebGPU canvas context for this instance */
    public context: Context3D;

    /**
     * Per-instance GBuffer frame registry.
     * Populated by GBufferFrame.getGBufferFrame() during rendering.
     */
    public gBufferFrameMap: Map<string, GBufferFrame> = new Map();

    /** Per-instance render-texture registry */
    public rtResourceMap: RTResourceMap;

    /** @internal */
    public _setting: EngineSetting;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // =====================================================================
    // Static cross-instance state
    // =====================================================================

    /**
     * The Engine3D instance that is currently executing its render frame.
     * Set at the start of each frame; cleared when the frame ends.
     * Used by GBufferFrame and RTResourceMap to route to the right per-instance
     * resource maps without requiring API changes throughout the render pipeline.
     * @internal
     */
    public static _current: Engine3D | null = null;

    /**
     * The first Engine3D instance created; used by the static backward-compat API.
     * @internal
     */
    public static _defaultInstance: Engine3D | null = null;

    /** True once the shared GPU infrastructure has been initialized */
    private static _globalInitialized: boolean = false;

    // =====================================================================
    // Constructor
    // =====================================================================

    constructor() {
        this._setting = createDefaultEngineSetting();
        this.gBufferFrameMap = new Map();
        this.rtResourceMap = new RTResourceMap();

        // The first instance created is the default (used by the static API).
        if (!Engine3D._defaultInstance) {
            Engine3D._defaultInstance = this;
        }
    }

    // =====================================================================
    // Instance getters / setters
    // =====================================================================

    public get setting(): EngineSetting { return this._setting; }
    public set setting(v: EngineSetting) { this._setting = v; }

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    public get size(): number[] { return this.context?.presentationSize; }
    public get aspect(): number { return this.context?.aspect; }
    public get width(): number { return this.context?.windowWidth; }
    public get height(): number { return this.context?.windowHeight; }

    // =====================================================================
    // Static backward-compatible API
    // (delegates to the default/current instance)
    // =====================================================================

    /** Lazily returns the default instance, creating it if necessary. */
    private static get _inst(): Engine3D {
        if (!Engine3D._defaultInstance) {
            Engine3D._defaultInstance = new Engine3D();
        }
        return Engine3D._defaultInstance;
    }

    public static get res(): Res { return Engine3D._inst.res; }
    public static set res(v: Res) { Engine3D._inst.res = v; }

    public static get inputSystem(): InputSystem { return Engine3D._inst.inputSystem; }
    public static set inputSystem(v: InputSystem) { Engine3D._inst.inputSystem = v; }

    public static get views(): View3D[] { return Engine3D._inst.views; }
    public static set views(v: View3D[]) { Engine3D._inst.views = v; }

    /**
     * Engine settings.
     * During a render frame the getter returns the settings of the currently
     * rendering instance so that render-pipeline code (RendererJob, ForwardRenderJob,
     * post-processing passes) automatically sees the correct per-instance config.
     */
    public static get setting(): EngineSetting {
        return (Engine3D._current ?? Engine3D._inst)._setting;
    }
    public static set setting(v: EngineSetting) {
        Engine3D._inst._setting = v;
    }

    /** @internal */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._inst.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { Engine3D._inst.renderJobs = v; }

    public static get size(): number[] { return Engine3D._inst.size; }
    public static get aspect(): number { return Engine3D._inst.aspect; }
    public static get width(): number { return Engine3D._inst.width; }
    public static get height(): number { return Engine3D._inst.height; }

    public static get frameRate(): number { return Engine3D._inst.frameRate; }
    public static set frameRate(v: number) { Engine3D._inst.frameRate = v; }

    /**
     * Create the WebGPU 3D engine (static convenience wrapper).
     * Equivalent to `new Engine3D().init(descriptor)` for single-instance use.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}) {
        return Engine3D._inst.init(descriptor);
    }

    /**
     * Set render view and start renderer (static convenience wrapper).
     */
    public static startRenderView(view: View3D) {
        return Engine3D._inst.startRenderView(view);
    }

    /**
     * Set render views and start renderer (static convenience wrapper).
     */
    public static startRenderViews(views: View3D[]) {
        return Engine3D._inst.startRenderViews(views);
    }

    /**
     * Get view render job instance (static convenience wrapper).
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._inst.getRenderJob(view);
    }

    /** Pause the engine render (static convenience wrapper). */
    public static pause() { Engine3D._inst.pause(); }

    /** Resume the engine render (static convenience wrapper). */
    public static resume() { Engine3D._inst.resume(); }

    // =====================================================================
    // Instance methods
    // =====================================================================

    /**
     * Initialize this engine instance.
     * The first call also initializes shared GPU infrastructure (device, shaders,
     * bind groups).  Subsequent instances reuse the same GPUDevice.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)')
        }

        this._setting = { ...this._setting, ...descriptor.engineSetting };

        // Shared WASM matrix library — safe to call multiple times (idempotent).
        await WasmMatrix.init(Matrix4.allocCount, this._setting.doublePrecision);

        // Each instance gets its own canvas context.
        // The default (first) instance reuses the module-level webGPUContext so
        // that all existing code that references webGPUContext directly keeps working.
        if (this === Engine3D._defaultInstance) {
            this.context = webGPUContext;
        } else {
            this.context = new Context3D();
        }
        await this.context.init(descriptor.canvasConfig);

        // Expose this instance as the active one so that GBufferFrame and
        // RTResourceMap resolve to the correct per-instance maps during init.
        Engine3D._current = this;
        Context3D.activeContext = this.context;

        try {
            this._setting.reflectionSetting.width = this._setting.reflectionSetting.reflectionProbeSize * 6;
            this._setting.reflectionSetting.height = this._setting.reflectionSetting.reflectionProbeSize * this._setting.reflectionSetting.reflectionProbeMaxCount;
            GBufferFrame.getGBufferFrame(
                GBufferFrame.reflections_GBuffer,
                this._setting.reflectionSetting.width,
                this._setting.reflectionSetting.height,
                false
            );

            // Shared GPU infrastructure — initialize only once across all instances.
            if (!Engine3D._globalInitialized) {
                Engine3D._globalInitialized = true;
                ShaderLib.init();
                ShaderUtil.init();
                GlobalBindGroup.init();
                ShadowLightsCollect.init();
            }

            this.res = new Res();
            this.res.initDefault();

            this._beforeRender = descriptor.beforeRender;
            this._renderLoop = descriptor.renderLoop;
            this._lateRender = descriptor.lateRender;
            this.inputSystem = new InputSystem();
            this.inputSystem.initCanvas(this.context.canvas);
        } finally {
            Engine3D._current = null;
            Context3D.activeContext = null;
        }
    }

    private _startRenderJob(view: View3D) {
        // Activate this instance so ForwardRenderJob / GBufferFrame / RTResourceMap
        // resolve to the correct per-instance resource maps.
        Engine3D._current = this;
        Context3D.activeContext = this.context;

        try {
            let renderJob = new ForwardRenderJob(view);
            this.renderJobs.set(view, renderJob);

            if (this._setting.pick.mode == `pixel`) {
                let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
                postProcessing.addPost(FXAAPost);
            }

            if (this._setting.pick.mode == `pixel` || this._setting.pick.mode == `bound`) {
                view.enablePick = true;
            }
            return renderJob;
        } finally {
            Engine3D._current = null;
            Context3D.activeContext = null;
        }
    }

    /**
     * Set render view and start renderer.
     */
    public startRenderView(view: View3D) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
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
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get view render job instance.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
    }

    /**
     * Pause this engine instance's render loop.
     */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume this engine instance's render loop.
     */
    public resume() {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
    }

    private async _render(time: number) {
        if (this._frameRateValue > 0) {
            let delta = time - this._time;
            if (delta < this._frameRateValue) {
                let t = performance.now()
                await new Promise(res => {
                    setTimeout(() => {
                        time += (performance.now() - t)
                        res(true)
                    }, this._frameRateValue - delta)
                })
            }
            this._time = time;
        }
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume()
    }

    private async _updateFrame(time: number) {
        // Mark this instance as the one currently rendering so that all render-pipeline
        // code (GBufferFrame, RTResourceMap, Engine3D.setting, etc.) resolves to the
        // correct per-instance state.
        Engine3D._current = this;
        Context3D.activeContext = this.context;

        try {
            Time.delta = time - Time.time;
            Time.time = time;
            Time.frame += 1;
            Interpolator.tick(Time.delta);

            let views = this.views;
            let i = 0;
            for (i = 0; i < views.length; i++) {
                const view = views[i];
                view.scene.waitUpdate();
                // Use this instance's canvas size (not the global webGPUContext).
                let [w, h] = this.context.presentationSize;
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
        } finally {
            Engine3D._current = null;
            Context3D.activeContext = null;
        }
    }
}

// Wire up late-bound accessors in RTResourceMap and GBufferFrame.
// This breaks the circular import at module-load time while still giving those
// modules a way to reach Engine3D._current / Engine3D._defaultInstance at call time.
_rtSetEngineRef(Engine3D);
_gbufSetEngineRef(Engine3D);
