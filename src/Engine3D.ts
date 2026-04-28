import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, webGPUContext, activateWebGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { EntityCollect } from './gfx/renderJob/collect/EntityCollect';
import { setCurrentEngineContext } from './core/EngineContext';

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
 * Supports multiple independent instances, each with its own canvas, render loop, and subsystems.
 *
 * Single-instance (backward-compat):
 *   await Engine3D.init({ canvasConfig: ... });
 *   Engine3D.startRenderView(view);
 *
 * Multi-instance:
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

    // =====================================================================
    // Static shared state
    // =====================================================================

    /** The most recently initialised Engine3D instance (used by the static backward-compat API). */
    public static current: Engine3D | null = null;

    private static _wasmInitialized: boolean = false;
    private static _shaderInitialized: boolean = false;

    // =====================================================================
    // Static backward-compat property accessors
    // (All delegate to Engine3D.current)
    // =====================================================================

    /**
     * resource manager in engine3d
     */
    public static get res(): Res { return Engine3D.current?.res; }

    /**
     * input system in engine3d
     */
    public static get inputSystem(): InputSystem { return Engine3D.current?.inputSystem; }

    /**
     * Active views in engine3d
     */
    public static get views(): View3D[] { return Engine3D.current?.views; }
    public static set views(v: View3D[]) { if (Engine3D.current) Engine3D.current.views = v; }

    /**
     * @internal
     */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D.current?.renderJobs; }

    /**
     * Engine settings. Accesses the current engine's settings, or a shared fallback.
     */
    public static get setting(): EngineSetting {
        return Engine3D.current?._setting ?? Engine3D._fallbackSetting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D.current) {
            Engine3D.current._setting = v;
        } else {
            Engine3D._fallbackSetting = v;
        }
    }
    private static _fallbackSetting: EngineSetting = createDefaultSetting();

    /** get render window size width and height */
    public static get size(): number[] { return Engine3D.current?._context?.presentationSize ?? [0, 0]; }

    /** get render window aspect */
    public static get aspect(): number { return Engine3D.current?._context?.aspect ?? 1; }

    /** get render window size width */
    public static get width(): number { return Engine3D.current?._context?.windowWidth ?? 0; }

    /** get render window size height */
    public static get height(): number { return Engine3D.current?._context?.windowHeight ?? 0; }

    /** set engine render frameRate 24/30/60/114/120/144/240/360 fps or other */
    public static get frameRate(): number { return Engine3D.current?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (Engine3D.current) Engine3D.current.frameRate = value; }

    // =====================================================================
    // Static backward-compat methods
    // =====================================================================

    /**
     * Create and initialise a new Engine3D instance (backward-compat static API).
     * Sets Engine3D.current to the newly created instance.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting
    } = {}): Promise<void> {
        const engine = new Engine3D();
        await engine.init(descriptor);
    }

    /** set render view and start renderer */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D.current?.startRenderView(view);
    }

    /** set render views and start renderer */
    public static startRenderViews(views: View3D[]): void {
        Engine3D.current?.startRenderViews(views);
    }

    /** get view render job instance */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.current?.getRenderJob(view);
    }

    /** Pause the engine render */
    public static pause(): void { Engine3D.current?.pause(); }

    /** Resume the engine render */
    public static resume(): void { Engine3D.current?.resume(); }

    // =====================================================================
    // Instance properties
    // =====================================================================

    /** resource manager for this engine instance */
    public res: Res;

    /** input system for this engine instance */
    public inputSystem: InputSystem;

    /** active views for this engine instance */
    public views: View3D[];

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /** @internal */
    public _context: Context3D;

    /** @internal Per-instance ComponentCollect */
    public _componentCollect: ComponentCollect;

    /** @internal Per-instance EntityCollect */
    public _entityCollect: EntityCollect;

    /** @internal Per-instance GlobalBindGroup */
    public _globalBindGroup: GlobalBindGroup;

    /** @internal Per-instance ShadowLightsCollect */
    public _shadowLightsCollect: ShadowLightsCollect;

    /** @internal Per-instance RTResourceMap */
    public _rtResourceMap: RTResourceMap;

    /** @internal Per-instance GBuffer map */
    public _gBufferMap: Map<string, GBufferFrame>;

    /** @internal Per-instance engine settings */
    public _setting: EngineSetting;

    private _frameRate: number = 360;
    private _frameRateValue: number = 0;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /** set/get frame rate for this engine instance */
    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    /** get render window size for this instance */
    public get size(): number[] { return this._context?.presentationSize ?? [0, 0]; }
    public get aspect(): number { return this._context?.aspect ?? 1; }
    public get width(): number { return this._context?.windowWidth ?? 0; }
    public get height(): number { return this._context?.windowHeight ?? 0; }

    // =====================================================================
    // Instance methods
    // =====================================================================

    /**
     * Initialise this Engine3D instance.
     * Creates a new WebGPU canvas context, per-instance subsystems, and starts resource loading.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting
    } = {}): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Per-instance settings (shallow-merge over defaults so each instance is independent)
        this._setting = { ...createDefaultSetting(), ...descriptor.engineSetting };

        // Create per-instance subsystems
        this._componentCollect = new ComponentCollect();
        this._entityCollect = new EntityCollect();
        this._globalBindGroup = new GlobalBindGroup();
        this._shadowLightsCollect = new ShadowLightsCollect();
        this._rtResourceMap = new RTResourceMap();
        this._gBufferMap = new Map<string, GBufferFrame>();

        // Register this instance as current BEFORE calling any subsystem init code
        // (GBufferFrame, RTResourceMap etc. read getCurrentEngineContext() during init)
        Engine3D.current = this;
        this._activateContext();

        // One-time WASM init (shared across all instances)
        if (!Engine3D._wasmInitialized) {
            await WasmMatrix.init(Matrix4.allocCount, this._setting.doublePrecision);
            Engine3D._wasmInitialized = true;
        }

        // Per-instance WebGPU canvas context
        this._context = new Context3D();
        await this._context.init(descriptor.canvasConfig);
        activateWebGPUContext(this._context);

        // Compute reflection buffer dimensions
        this._setting.reflectionSetting.width = this._setting.reflectionSetting.reflectionProbeSize * 6;
        this._setting.reflectionSetting.height = this._setting.reflectionSetting.reflectionProbeSize * this._setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this._setting.reflectionSetting.width,
            this._setting.reflectionSetting.height,
            false
        );

        // One-time shader init (shared across all instances)
        if (!Engine3D._shaderInitialized) {
            ShaderLib.init();
            ShaderUtil.init();
            Engine3D._shaderInitialized = true;
        }

        // Per-instance GPU resource init
        this._globalBindGroup.init();
        this._rtResourceMap.init();
        this._shadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this._context.canvas);
    }

    /**
     * Activate this engine instance as the current one for the static API and context delegates.
     * @internal
     */
    private _activateContext(): void {
        Engine3D.current = this;
        setCurrentEngineContext({
            componentCollect: this._componentCollect,
            entityCollect: this._entityCollect,
            globalBindGroup: this._globalBindGroup,
            shadowLightsCollect: this._shadowLightsCollect,
            rtResourceMap: this._rtResourceMap,
            gBufferMap: this._gBufferMap,
        });
        if (this._context) {
            activateWebGPUContext(this._context);
        }
    }

    private _startRenderJob(view: View3D): RendererJob {
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
    }

    /**
     * Set render view and start renderer
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        view.engine = this;
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set render views and start renderer
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            views[i].engine = this;
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get view render job instance
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause this engine's render loop
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume this engine's render loop
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    private async _render(time: number): Promise<void> {
        // Activate this engine as the current context before rendering its frame.
        // JS is single-threaded so this is safe — no two render loops run concurrently.
        this._activateContext();

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
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        let views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this._context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        /****** auto before update with component list *****/
        for (const iterator of this._componentCollect.componentsBeforeUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                }
            }
        }

        let command = this._context.device.createCommandEncoder();
        for (const iterator of this._componentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k, command);
                }
            }
        }

        this._context.device.queue.submit([command.finish()]);

        /****** auto update with component list *****/
        for (const iterator of this._componentCollect.componentsUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                }
            }
        }

        for (const iterator of this._componentCollect.graphicComponent) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (k && f.enable) {
                    c(k);
                }
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        /****** auto update global matrix share buffer write to gpu *****/
        let globalMatrixBindGroup = this._globalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        /****** auto late update with component list *****/
        for (const iterator of this._componentCollect.componentsLateUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
