import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveContext } from './gfx/graphics/webGpu/Context3D';
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
import { ViewQuad } from './core/ViewQuad';

/**
 * Orillusion 3D Engine
 *
 * Supports multiple independent instances. Each instance owns its own
 * WebGPU canvas context, render resource maps, and input system.
 *
 * Single-instance (backward-compatible) usage:
 * -- Engine3D.setting.*
 * -- await Engine3D.init();
 *
 * Multi-instance usage:
 * -- const engine = new Engine3D();
 * -- await engine.init({ canvasConfig });
 * -- engine.startRenderView(view);
 *
 * @group engine3D
 */
export class Engine3D {

    // =============================================
    // Static: global singleton state & backward-compat API
    // =============================================

    /** @internal */
    private static _activeEngine: Engine3D | null = null;

    /** @internal - all currently running engine instances */
    private static _instances: Set<Engine3D> = new Set();

    /** @internal - shared RAF id for the global render loop */
    private static _sharedRAFId: number = 0;

    /** @internal - WASM matrix buffer initialised once globally */
    private static _wasmInitialized: boolean = false;

    /**
     * Default settings object; modifications here before Engine3D.init()
     * are carried into the first engine instance.
     * @internal
     */
    private static _defaultSetting: EngineSetting = Engine3D._buildDefaultSetting();

    // ----- Static backward-compat property accessors -----

    /**
     * resource manager in engine3d
     */
    public static get res(): Res { return Engine3D._activeEngine?.res; }
    public static set res(v: Res) { if (Engine3D._activeEngine) Engine3D._activeEngine.res = v; }

    /**
     * input system in engine3d
     */
    public static get inputSystem(): InputSystem { return Engine3D._activeEngine?.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D._activeEngine) Engine3D._activeEngine.inputSystem = v; }

    /**
     * active views in engine3d
     */
    public static get views(): View3D[] { return Engine3D._activeEngine?.views; }
    public static set views(v: View3D[]) { if (Engine3D._activeEngine) Engine3D._activeEngine.views = v; }

    /** @internal */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._activeEngine?.renderJobs; }

    /**
     * engine setting — readable before Engine3D.init()
     */
    public static get setting(): EngineSetting {
        return Engine3D._activeEngine?.setting ?? Engine3D._defaultSetting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D._activeEngine) {
            Engine3D._activeEngine.setting = v;
        } else {
            Engine3D._defaultSetting = v;
        }
    }

    // Dimension getters forward to the active context via proxy
    public static get size(): number[] { return webGPUContext.presentationSize; }
    public static get aspect(): number { return webGPUContext.aspect; }
    public static get width(): number { return webGPUContext.windowWidth; }
    public static get height(): number { return webGPUContext.windowHeight; }

    public static get frameRate(): number { return Engine3D._activeEngine?._frameRate ?? 360; }
    public static set frameRate(v: number) { if (Engine3D._activeEngine) Engine3D._activeEngine.frameRate = v; }

    // ----- Static backward-compat methods -----

    /**
     * Create the default engine instance and initialize WebGPU.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        // Merge pre-init setting modifications into the descriptor
        if (!descriptor.engineSetting) {
            descriptor = { ...descriptor, engineSetting: Engine3D._defaultSetting };
        }
        Engine3D._activeEngine = engine;
        await engine.init(descriptor);
    }

    /**
     * set render view and start renderer (default engine)
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._activeEngine.startRenderView(view);
    }

    /**
     * set render views and start renderer (default engine)
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._activeEngine.startRenderViews(views);
    }

    /**
     * get view render job instance (default engine)
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._activeEngine?.getRenderJob(view);
    }

    /**
     * Pause the default engine render
     */
    public static pause(): void { Engine3D._activeEngine?.pause(); }

    /**
     * Resume the default engine render
     */
    public static resume(): void { Engine3D._activeEngine?.resume(); }

    // =============================================
    // Instance members
    // =============================================

    /**
     * resource manager
     */
    public res: Res;

    /**
     * input system
     */
    public inputSystem: InputSystem;

    /**
     * active views
     */
    public views: View3D[];

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * engine setting
     */
    public setting: EngineSetting;

    /**
     * WebGPU context owned by this engine instance
     */
    public context: Context3D;

    // Per-instance render resource storage
    /** @internal */ public _rtTextureMap: Map<string, RenderTexture>;
    /** @internal */ public _rtViewQuadMap: Map<string, ViewQuad>;
    /** @internal */ public _gBufferMap: Map<string, GBufferFrame>;

    private _frameRateValue: number = 0;
    /** @internal */ public _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _active: boolean = false;

    get frameRate(): number { return this._frameRate; }
    set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    /**
     * Initialize this engine instance.
     * Creates a dedicated WebGPU canvas context and allocates per-instance resource maps.
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

        // Build per-instance settings
        this.setting = Engine3D._buildDefaultSetting();
        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // Init shared WASM matrix buffer (global — only once across all engines)
        if (!Engine3D._wasmInitialized) {
            Engine3D._wasmInitialized = true;
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // Create a dedicated GPU context for this engine instance
        this.context = new Context3D();
        setActiveContext(this.context);
        await this.context.init(descriptor.canvasConfig);

        // Create per-instance render resource maps and activate them
        this._rtTextureMap = new Map();
        this._rtViewQuadMap = new Map();
        this._gBufferMap = new Map();
        this._activateResources();

        // Compute reflection settings
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false,
        );

        // Global singletons — guarded against double-init
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
        this.inputSystem.initCanvas(this.context.canvas);
    }

    /**
     * Activate this engine's resource maps and GPU context as the global active context.
     * Called automatically before each render frame in the shared render loop.
     * @internal
     */
    private _activateResources(): void {
        setActiveContext(this.context);
        RTResourceMap.rtTextureMap = this._rtTextureMap;
        RTResourceMap.rtViewQuad = this._rtViewQuadMap;
        GBufferFrame.gBufferMap = this._gBufferMap;
        Engine3D._activeEngine = this;
    }

    private _startRenderJob(view: View3D): RendererJob {
        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this.setting.pick.mode === 'pixel') {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this.setting.pick.mode === 'pixel' || this.setting.pick.mode === 'bound') {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * set render view and start renderer for this engine instance
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * set render views and start renderer for this engine instance
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * get view render job instance
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Remove this engine from the shared render loop
     */
    public pause(): void {
        this._active = false;
        Engine3D._instances.delete(this);
        if (Engine3D._instances.size === 0) {
            if (Engine3D._sharedRAFId !== 0) {
                cancelAnimationFrame(Engine3D._sharedRAFId);
                Engine3D._sharedRAFId = 0;
            }
        }
    }

    /**
     * Add this engine to the shared render loop
     */
    public resume(): void {
        if (!this._active) {
            this._active = true;
            Engine3D._instances.add(this);
        }
        Engine3D._startSharedLoop();
    }

    // =============================================
    // Shared (static) render loop — renders all active instances sequentially
    // =============================================

    private static _startSharedLoop(): void {
        if (Engine3D._sharedRAFId === 0) {
            Engine3D._sharedRAFId = requestAnimationFrame((t) => Engine3D._sharedRender(t));
        }
    }

    private static async _sharedRender(time: number): Promise<void> {
        Engine3D._sharedRAFId = 0;

        // Render every active engine instance in turn
        for (const engine of Engine3D._instances) {
            if (engine._frameRateValue > 0) {
                const delta = time - engine._time;
                if (delta < engine._frameRateValue) {
                    const t = performance.now();
                    await new Promise<void>((res) => {
                        setTimeout(() => {
                            time += performance.now() - t;
                            res();
                        }, engine._frameRateValue - delta);
                    });
                }
                engine._time = time;
            }
            await engine._updateFrame(time);
        }

        Engine3D._startSharedLoop();
    }

    private async _updateFrame(time: number): Promise<void> {
        // Activate this engine's resources before accessing any global singletons
        this._activateResources();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        for (const iterator of ComponentCollect.componentsBeforeUpdateList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        const command = webGPUContext.device.createCommandEncoder();
        for (const iterator of ComponentCollect.componentsComputeList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k, command);
            }
        }
        webGPUContext.device.queue.submit([command.finish()]);

        for (const iterator of ComponentCollect.componentsUpdateList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        for (const iterator of ComponentCollect.graphicComponent) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop)
            await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const iterator of ComponentCollect.componentsLateUpdateList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // =============================================
    // Build fresh default EngineSetting
    // Returns a new object each time to ensure per-instance isolation.
    // =============================================
    private static _buildDefaultSetting(): EngineSetting {
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
                        hdr: 1.0,
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
                        intensity: 0.5,
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
                materialDebug: false,
            },
            loader: {
                numConcurrent: 20,
            },
            reflectionSetting: {
                reflectionProbeMaxCount: 8,
                reflectionProbeSize: 256,
                width: 256 * 6,
                height: 8 * 256,
                enable: true,
            },
        };
    }
}
