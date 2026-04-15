import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap } from './gfx/renderJob/frame/RTResourceMap';
import { EngineContext } from './util/EngineContext';

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
 * Orillusion 3D Engine — supports multiple simultaneous instances.
 *
 * Usage:
 * ```typescript
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas: myCanvas } });
 * engine.startRenderView(view);
 * ```
 * @group engine3D
 */
export class Engine3D {

    // ---- Static registry -------------------------------------------------------

    /**
     * The engine instance that is currently executing its render frame.
     * Backed by `EngineContext.current` to avoid circular imports in subsystems.
     */
    public static get current(): Engine3D | null {
        return EngineContext.current as Engine3D | null;
    }
    public static set current(value: Engine3D | null) {
        EngineContext.current = value;
    }

    /** All live engine instances. */
    public static readonly instances: Engine3D[] = [];

    /** Auto-incremented unique id counter. */
    private static _nextId: number = 0;

    // ---- Backward-compat static proxies (delegate to the most-recently created engine) ----

    /** @deprecated Use engine instance directly. */
    public static get res(): Res { return Engine3D.instances[Engine3D.instances.length - 1]?.res; }
    /** @deprecated Use engine instance directly. */
    public static get inputSystem(): InputSystem { return Engine3D.instances[Engine3D.instances.length - 1]?.inputSystem; }
    /** @deprecated Use engine instance directly. */
    public static get views(): View3D[] { return Engine3D.instances[Engine3D.instances.length - 1]?.views; }
    /** @deprecated Use engine instance directly. */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D.instances[Engine3D.instances.length - 1]?.renderJobs; }
    /** @deprecated Use engine instance directly. */
    public static get setting(): EngineSetting { return Engine3D.instances[Engine3D.instances.length - 1]?.setting; }
    /** @deprecated Use engine instance directly. */
    public static get size(): number[] { return Engine3D.instances[Engine3D.instances.length - 1]?.size; }
    /** @deprecated Use engine instance directly. */
    public static get aspect(): number { return Engine3D.instances[Engine3D.instances.length - 1]?.aspect; }
    /** @deprecated Use engine instance directly. */
    public static get width(): number { return Engine3D.instances[Engine3D.instances.length - 1]?.width; }
    /** @deprecated Use engine instance directly. */
    public static get height(): number { return Engine3D.instances[Engine3D.instances.length - 1]?.height; }

    /**
     * Get the render job for a view.
     * Prefers the view's own engine; falls back to the last initialized engine.
     * @deprecated Use view.engine.getRenderJob(view) directly.
     */
    public static getRenderJob(view: View3D): RendererJob {
        return (view.engine ?? Engine3D.instances[Engine3D.instances.length - 1])?.getRenderJob(view);
    }

    // ---- Instance state --------------------------------------------------------

    /** Unique id for this engine instance. */
    public readonly id: number;

    /**
     * Per-engine WebGPU canvas context.
     * All instances share the same GPUDevice (`context.device`) but each has its
     * own HTMLCanvasElement and GPUCanvasContext.
     */
    public readonly context: Context3D;

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input system bound to this engine's canvas. */
    public inputSystem: InputSystem;

    /** Active render views. */
    public views: View3D[];

    /** Per-view render jobs. */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * Per-engine GBufferFrame cache.
     * Populated by GBufferFrame.getGBufferFrame() while Engine3D.current === this.
     */
    public gBufferMap: Map<string, GBufferFrame> = new Map();

    /**
     * Per-engine render-target texture / view-quad cache.
     * Used by RTResourceMap static helpers while Engine3D.current === this.
     */
    public rtTextureMap: Map<string, any> = new Map();
    public rtViewQuad: Map<string, any> = new Map();

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /**
     * Engine rendering settings.
     * Each instance carries its own copy so that settings can differ per engine.
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

    constructor() {
        this.id = Engine3D._nextId++;
        this.context = new Context3D();
        Engine3D.instances.push(this);
    }

    // ---- Convenience getters ---------------------------------------------------

    /**
     * Set engine render frameRate 24/30/60/114/120/144/240/360 fps or other.
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

    /** Render window size [width, height]. */
    public get size(): number[] {
        return this.context.presentationSize;
    }

    /** Render window aspect ratio. */
    public get aspect(): number {
        return this.context.aspect;
    }

    /** Render window width in pixels. */
    public get width(): number {
        return this.context.windowWidth;
    }

    /** Render window height in pixels. */
    public get height(): number {
        return this.context.windowHeight;
    }

    // ---- Lifecycle -------------------------------------------------------------

    /**
     * Initialize this engine instance.
     * The WebGPU device is created once on the first call and reused by subsequent instances.
     * @param descriptor
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
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // WasmMatrix and GlobalBindGroup/ShaderLib/RTResourceMap are initialized once globally.
        const isFirstEngine = Engine3D.instances.indexOf(this) === 0;

        if (isFirstEngine) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // Initialize this engine's canvas context (device is shared automatically).
        await this.context.init(descriptor.canvasConfig);

        if (isFirstEngine) {
            // Pre-compute reflection settings
            this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
            this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;

            // Set this engine as current so GBufferFrame/RTResourceMap use the right scope
            Engine3D.current = this;
            GBufferFrame.getGBufferFrame(
                GBufferFrame.reflections_GBuffer,
                this.setting.reflectionSetting.width,
                this.setting.reflectionSetting.height,
                false
            );
            Engine3D.current = null;

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

    private _startRenderJob(view: View3D): RendererJob {
        // Tag the view with this engine instance
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
        let renderJob = this._startRenderJob(view);
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
            this._startRenderJob(views[i]);
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

    /**
     * Destroy this engine instance, releasing its canvas and stopping the render loop.
     */
    public destroy() {
        this.pause();
        const idx = Engine3D.instances.indexOf(this);
        if (idx !== -1) Engine3D.instances.splice(idx, 1);
    }

    // ---- Internal render loop --------------------------------------------------

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
        // Mark this engine as the currently-active engine so that all subsystems
        // (GBufferFrame, RTResourceMap …) resolve per-engine state correctly.
        const prev = Engine3D.current;
        Engine3D.current = this;

        try {
            Time.delta = time - Time.time;
            Time.time = time;
            Time.frame += 1;
            Interpolator.tick(Time.delta);

            /* update all transform */
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
            /****** write global matrix share buffer to GPU *****/
            let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
            globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

            this.renderJobs.forEach((v, k) => {
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
        } finally {
            Engine3D.current = prev;
        }
    }
}
