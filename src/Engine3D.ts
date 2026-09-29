import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, updateWebGPUContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { setCurrentEngine } from './core/EngineRegistry';

/**
 * Returns a fresh copy of the engine default settings.
 * Called per Engine3D instance so each instance has isolated settings.
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
 * Orillusion 3D Engine — instantiable for multi-instance support.
 *
 * Single-instance (original API — unchanged):
 *   await Engine3D.init({ canvasConfig });
 *   Engine3D.startRenderView(view);
 *
 * Multi-instance (new API):
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

    // ── shared one-time global state (first engine init owns this) ──
    private static _globalInitDone: boolean = false;
    private static _sharedAdapter: GPUAdapter = null;
    private static _sharedDevice: GPUDevice = null;

    /**
     * The Engine3D instance whose render frame is currently executing.
     * Set at the start of each render frame; used by subsystems that
     * cannot receive the engine reference via a parameter (e.g. material
     * shaders, post-process passes that call static resource APIs).
     */
    public static current: Engine3D = null;

    // ── backward-compat static getters (delegate to Engine3D.current) ──

    /** @deprecated Use instance.setting — kept for backward compatibility */
    public static get setting(): EngineSetting {
        return Engine3D.current?.setting;
    }

    /** @deprecated Use instance.res — kept for backward compatibility */
    public static get res(): Res {
        return Engine3D.current?.res;
    }

    /** @deprecated Use instance.inputSystem — kept for backward compatibility */
    public static get inputSystem(): InputSystem {
        return Engine3D.current?.inputSystem;
    }

    /** @deprecated Use instance.views — kept for backward compatibility */
    public static get views(): View3D[] {
        return Engine3D.current?.views;
    }

    /** @deprecated Use instance.renderJobs — kept for backward compatibility */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D.current?.renderJobs;
    }

    /** @deprecated Use instance.size — kept for backward compatibility */
    public static get size(): number[] {
        return Engine3D.current?.context?.presentationSize;
    }

    /** @deprecated Use instance.aspect — kept for backward compatibility */
    public static get aspect(): number {
        return Engine3D.current?.context?.aspect;
    }

    /** @deprecated Use instance.width — kept for backward compatibility */
    public static get width(): number {
        return Engine3D.current?.context?.windowWidth;
    }

    /** @deprecated Use instance.height — kept for backward compatibility */
    public static get height(): number {
        return Engine3D.current?.context?.windowHeight;
    }

    // ── static backward-compat init / lifecycle methods ─────────────

    /**
     * Single-instance convenience entry point (original API).
     * Creates and initialises a shared default Engine3D instance.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const instance = new Engine3D();
        await instance.init(descriptor);
        return;
    }

    /**
     * Single-instance convenience: set one render view.
     * @deprecated Create an Engine3D instance and call instance.startRenderView()
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D.current.startRenderView(view);
    }

    /**
     * Single-instance convenience: set multiple render views.
     * @deprecated Create an Engine3D instance and call instance.startRenderViews()
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D.current.startRenderViews(views);
    }

    /**
     * Single-instance convenience: get the RendererJob for a view.
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.current?.renderJobs?.get(view);
    }

    /** Single-instance: pause the default engine's render loop. */
    public static pause(): void {
        Engine3D.current?.pause();
    }

    /** Single-instance: resume the default engine's render loop. */
    public static resume(): void {
        Engine3D.current?.resume();
    }

    /** @deprecated Use instance.frameRate */
    public static get frameRate(): number {
        return Engine3D.current?._frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (Engine3D.current) Engine3D.current.frameRate = value;
    }

    // ── instance state ───────────────────────────────────────────────

    /**
     * Per-engine WebGPU context (canvas + swap chain).
     * All Engine3D instances share the same GPUDevice but each has its own canvas.
     */
    public context: Context3D;

    /**
     * Resource manager for this engine instance.
     */
    public res: Res;

    /**
     * Input system for this engine instance.
     */
    public inputSystem: InputSystem;

    /**
     * Active render views for this engine instance.
     */
    public views: View3D[];

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * Per-instance engine settings.
     */
    public setting: EngineSetting;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

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
        return this.context?.presentationSize;
    }

    public get aspect(): number {
        return this.context?.aspect;
    }

    public get width(): number {
        return this.context?.windowWidth;
    }

    public get height(): number {
        return this.context?.windowHeight;
    }

    // ── instance lifecycle ───────────────────────────────────────────

    /**
     * Initialise this Engine3D instance.
     * The first call also initialises shared GPU infrastructure (adapter, device,
     * shaders, bind groups). Subsequent instances reuse the same GPUDevice while
     * creating their own canvas contexts.
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

        // Per-instance settings (deep-copied from defaults, then merged)
        this.setting = { ...createDefaultSetting(), ...descriptor.engineSetting };

        // Make this the current engine so subsystems initialised below route correctly
        Engine3D.current = this;
        setCurrentEngine(this);

        if (!Engine3D._globalInitDone) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // ── WebGPU context ──
        this.context = new Context3D();
        if (Engine3D._globalInitDone && Engine3D._sharedDevice) {
            // Subsequent engine: reuse the existing GPU device, create new canvas context
            await this.context.initWithSharedDevice(
                Engine3D._sharedAdapter,
                Engine3D._sharedDevice,
                descriptor.canvasConfig
            );
        } else {
            // First engine: full initialisation (requests adapter + device)
            await this.context.init(descriptor.canvasConfig);
            Engine3D._sharedAdapter = this.context.adapter;
            Engine3D._sharedDevice = this.context.device;
        }

        // Point the module-level webGPUContext at this engine's context so that
        // all existing code importing webGPUContext works correctly during this
        // engine's init and render frames.
        updateWebGPUContext(this.context);

        // ── Reflection GBuffer (per-engine) ──
        this.setting.reflectionSetting.width =
            this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;

        // RTResourceMap is per-engine; init clears the map for this engine
        RTResourceMap.init();

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        if (!Engine3D._globalInitDone) {
            Engine3D._globalInitDone = true;

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
    }

    private _startRenderJob(view: View3D): RendererJob {
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
     * Set a single render view and start the render loop for this engine instance.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        view.engine = this;
        Engine3D.current = this;
        setCurrentEngine(this);
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop for this engine instance.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        Engine3D.current = this;
        setCurrentEngine(this);
        for (let i = 0; i < views.length; i++) {
            views[i].engine = this;
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the RendererJob for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
    }

    /**
     * Pause this engine's render loop.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume this engine's render loop.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    private async _render(time: number): Promise<void> {
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

    private async _updateFrame(time: number): Promise<void> {
        // Activate this engine for all per-engine subsystems
        Engine3D.current = this;
        setCurrentEngine(this);
        updateWebGPUContext(this.context);

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
    }
}
