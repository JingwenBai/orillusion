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
import { MatrixBindGroup } from './gfx/graphics/webGpu/core/bindGroups/MatrixBindGroup';
import { RenderTexture } from './textures/RenderTexture';
import { ViewQuad } from './core/ViewQuad';

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
 * Create one Engine3D instance per canvas and call await engine.init() on each.
 * The static accessors (Engine3D.setting, Engine3D.res, …) delegate to the most
 * recently activated engine and are kept for backward compatibility with existing
 * single-engine codebases.
 *
 * -- engine.setting.*
 * -- await engine.init();
 * @group engine3D
 */
export class Engine3D {

    // ─── static: active-engine registry ─────────────────────────────────────

    /** @internal */
    private static _activeEngine: Engine3D | null = null;

    /** The Engine3D instance that most recently called activate(). */
    public static get activeEngine(): Engine3D | null {
        return Engine3D._activeEngine;
    }

    /** All Engine3D instances that have been initialised. */
    private static _engines: Engine3D[] = [];
    public static get engines(): readonly Engine3D[] {
        return Engine3D._engines;
    }

    // Static default setting used before any engine is initialised (pre-init
    // configuration pattern: Engine3D.setting.shadow.enable = false; … init()).
    private static _preInitSetting: EngineSetting | null = null;
    private static _getPreInitSetting(): EngineSetting {
        if (!Engine3D._preInitSetting) {
            Engine3D._preInitSetting = createDefaultSetting();
        }
        return Engine3D._preInitSetting;
    }

    // ─── static backward-compat accessors ───────────────────────────────────

    /**
     * engine setting – reads/writes the active engine's setting.
     * Pre-init reads/writes target the shared default that new engines inherit.
     */
    public static get setting(): EngineSetting {
        return Engine3D._activeEngine ? Engine3D._activeEngine.setting : Engine3D._getPreInitSetting();
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D._activeEngine) {
            Engine3D._activeEngine.setting = v;
        } else {
            Engine3D._preInitSetting = v;
        }
    }

    /** resource manager – delegates to the active engine */
    public static get res(): Res {
        return Engine3D._activeEngine?.res;
    }

    /** input system – delegates to the active engine */
    public static get inputSystem(): InputSystem {
        return Engine3D._activeEngine?.inputSystem;
    }

    /** views – delegates to the active engine */
    public static get views(): View3D[] {
        return Engine3D._activeEngine?.views;
    }
    public static set views(v: View3D[]) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.views = v;
    }

    /**
     * @internal
     * render job map – delegates to the active engine
     */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._activeEngine?.renderJobs;
    }

    /** render window size [width, height] */
    public static get size(): number[] {
        return webGPUContext?.presentationSize;
    }

    /** render window aspect ratio */
    public static get aspect(): number {
        return webGPUContext?.aspect;
    }

    /** render window width */
    public static get width(): number {
        return webGPUContext?.windowWidth;
    }

    /** render window height */
    public static get height(): number {
        return webGPUContext?.windowHeight;
    }

    /** frame rate limit */
    public static get frameRate(): number {
        return Engine3D._activeEngine?.frameRate ?? 360;
    }
    public static set frameRate(value: number) {
        if (Engine3D._activeEngine) Engine3D._activeEngine.frameRate = value;
    }

    // ─── static backward-compat methods ─────────────────────────────────────

    /**
     * Initialise a new Engine3D instance and set it as the active engine.
     * Returned for convenience; the instance is also available via Engine3D.activeEngine.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<Engine3D> {
        const engine = new Engine3D();
        await engine.init(descriptor);
        return engine;
    }

    /** @see Engine3D#startRenderView */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._activeEngine.startRenderView(view);
    }

    /** @see Engine3D#startRenderViews */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._activeEngine.startRenderViews(views);
    }

    /** @see Engine3D#getRenderJob */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._activeEngine?.getRenderJob(view);
    }

    /** @see Engine3D#pause */
    public static pause(): void {
        Engine3D._activeEngine?.pause();
    }

    /** @see Engine3D#resume */
    public static resume(): void {
        Engine3D._activeEngine?.resume();
    }

    // ─── instance state ──────────────────────────────────────────────────────

    /**
     * resource manager for this engine instance
     */
    public res: Res;

    /**
     * input system for this engine instance
     */
    public inputSystem: InputSystem;

    /**
     * render views managed by this engine instance
     */
    public views: View3D[];

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * Per-engine settings (copy of the defaults, merged with descriptor on init).
     */
    public setting: EngineSetting = createDefaultSetting();

    /** The WebGPU context (canvas + device) owned by this engine instance. */
    public context: Context3D;

    // per-engine GPU resource maps
    private _matrixBindGroup: MatrixBindGroup;
    private _rtTextureMap: Map<string, RenderTexture>;
    private _rtViewQuad: Map<string, ViewQuad>;
    private _gBufferMap: Map<string, GBufferFrame>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /**
     * set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
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

    // ─── instance methods ────────────────────────────────────────────────────

    /**
     * Install this engine as the active engine and redirect all module-level
     * singletons (webGPUContext, RTResourceMap, GBufferFrame, GlobalBindGroup)
     * to this instance's GPU resources.  Must be called before any rendering
     * or resource creation that touches those singletons.
     * @internal
     */
    public activate(): void {
        Engine3D._activeEngine = this;
        setActiveWebGPUContext(this.context);
        if (this._matrixBindGroup) {
            GlobalBindGroup.modelMatrixBindGroup = this._matrixBindGroup;
        }
        if (this._rtTextureMap) {
            RTResourceMap.rtTextureMap = this._rtTextureMap;
            RTResourceMap.rtViewQuad = this._rtViewQuad;
        }
        if (this._gBufferMap) {
            GBufferFrame.gBufferMap = this._gBufferMap;
        }
    }

    /**
     * Initialise this engine instance.
     * @param descriptor  engine configuration
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

        // Merge: pre-init static changes < instance defaults < descriptor overrides
        this.setting = {
            ...Engine3D._getPreInitSetting(),
            ...this.setting,
            ...descriptor.engineSetting,
        };

        // Set as the active engine immediately so downstream calls can find us
        Engine3D._activeEngine = this;
        Engine3D._engines.push(this);

        // WASM matrix library is shared across all engine instances; only init once
        if (!WasmMatrix.wasm) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // Create this engine's WebGPU context and make it the active global
        this.context = new Context3D();
        setActiveWebGPUContext(this.context);
        await this.context.init(descriptor.canvasConfig);

        // Compute reflection texture dimensions
        this.setting.reflectionSetting.width =
            this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Per-engine GBuffer map — install before any GBufferFrame calls
        this._gBufferMap = new Map();
        GBufferFrame.gBufferMap = this._gBufferMap;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        ShaderLib.init();
        ShaderUtil.init();

        // GlobalBindGroup.init() creates a fresh MatrixBindGroup (per-device GPU
        // buffer) and leaves the Camera3D/Scene3D maps untouched if they already
        // exist (they are shared across instances keyed by scene/camera objects).
        GlobalBindGroup.init();
        this._matrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;

        // Per-engine RT resource maps
        this._rtTextureMap = new Map();
        this._rtViewQuad = new Map();
        RTResourceMap.rtTextureMap = this._rtTextureMap;
        RTResourceMap.rtViewQuad = this._rtViewQuad;

        ShadowLightsCollect.init();

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

        if (this.setting.pick.mode === `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this.setting.pick.mode === `pixel` || this.setting.pick.mode === `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Set render view and start renderer.
     */
    public startRenderView(view: View3D): RendererJob {
        this.activate();
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        view.engine = this;
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start renderer.
     */
    public startRenderViews(views: View3D[]): void {
        this.activate();
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            views[i].engine = this;
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the render job for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
    }

    /**
     * Pause rendering for this engine instance.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume rendering for this engine instance.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    /** @internal */
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
        // Make this engine's GPU resources the active globals for this frame
        this.activate();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
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
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                }
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
                }
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
                }
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
                }
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
                }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
