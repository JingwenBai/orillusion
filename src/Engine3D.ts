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

/**
 * The currently active Engine3D instance.
 * Set automatically by each engine before its frame starts.
 * Used by static backward-compat API.
 * @group engine3D
 */
export let activeEngine: Engine3D | null = null;

/** @internal Whether global (shared) subsystems have been initialized */
let _globalInitDone: boolean = false;

/**
 * Orillusion 3D Engine – supports multiple independent instances.
 *
 * **Single-engine (legacy / backward-compat):**
 * ```ts
 * await Engine3D.init({ canvasConfig });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-engine:**
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

    // ─────────────────────────────────────────────────────────────
    // Per-instance state
    // ─────────────────────────────────────────────────────────────

    /** This engine's WebGPU context (canvas + device + swap-chain). */
    public context: Context3D;

    /** This engine's resource manager. */
    public res: Res;

    /** This engine's input system. */
    public inputSystem: InputSystem;

    /** Active views for this engine. */
    public views: View3D[] = [];

    /** Render jobs keyed by View3D for this engine. */
    public renderJobs: Map<View3D, RendererJob> = new Map();

    /** Per-engine GBuffer frame map (avoids name collisions across instances). */
    public gBufferMap: Map<string, GBufferFrame> = new Map();

    /** Per-engine render-texture resource map. */
    public rtResourceMap: RTResourceMap;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ─────────────────────────────────────────────────────────────
    // Shared / global settings (same for all instances)
    // ─────────────────────────────────────────────────────────────

    /**
     * Engine render settings.
     * Shared across all instances. Modify before or after init.
     *
     * -- Engine3D.setting.*
     */
    public static setting: EngineSetting = {
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

    // ─────────────────────────────────────────────────────────────
    // Static backward-compat API
    //   All methods delegate to `activeEngine` so existing code
    //   continues to work without changes.
    // ─────────────────────────────────────────────────────────────

    /** @deprecated Use instance property instead. Reads from the active engine. */
    public static get res(): Res { return activeEngine?.res; }
    /** @deprecated Use instance property instead. Reads from the active engine. */
    public static get inputSystem(): InputSystem { return activeEngine?.inputSystem; }
    /** @deprecated Use instance property instead. Reads from the active engine. */
    public static get views(): View3D[] { return activeEngine?.views; }
    /** @deprecated Use instance property instead. Reads from the active engine. */
    public static get renderJobs(): Map<View3D, RendererJob> { return activeEngine?.renderJobs; }

    /** get render window size [width, height] */
    public static get size(): number[] { return webGPUContext.presentationSize; }
    /** get render window aspect ratio */
    public static get aspect(): number { return webGPUContext.aspect; }
    /** get render window width */
    public static get width(): number { return webGPUContext.windowWidth; }
    /** get render window height */
    public static get height(): number { return webGPUContext.windowHeight; }

    /** get/set engine render frameRate */
    public static get frameRate(): number { return activeEngine?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (activeEngine) activeEngine.frameRate = value; }

    /**
     * Create a WebGPU engine using static (single-engine) API.
     * @param descriptor  {@link CanvasConfig}
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        activeEngine = engine;
        return engine.init(descriptor);
    }

    /** @deprecated Use instance method. Delegates to active engine. */
    public static startRenderView(view: View3D): RendererJob {
        return activeEngine?.startRenderView(view);
    }

    /** @deprecated Use instance method. Delegates to active engine. */
    public static startRenderViews(views: View3D[]): void {
        activeEngine?.startRenderViews(views);
    }

    /** @deprecated Use instance method. Delegates to active engine. */
    public static getRenderJob(view: View3D): RendererJob {
        return activeEngine?.getRenderJob(view);
    }

    /** Pause the active engine render loop. */
    public static pause(): void { activeEngine?.pause(); }
    /** Resume the active engine render loop. */
    public static resume(): void { activeEngine?.resume(); }

    // ─────────────────────────────────────────────────────────────
    // Instance API
    // ─────────────────────────────────────────────────────────────

    /** Per-instance render frameRate */
    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    /**
     * Initialize this engine instance.
     * Creates a new WebGPU context bound to the provided canvas (or a new full-screen canvas).
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

        // Mark this engine as active so static API works during init
        activeEngine = this;

        if (descriptor.engineSetting) {
            Engine3D.setting = { ...Engine3D.setting, ...descriptor.engineSetting };
        }

        // Global one-time init (WASM matrix pool, shaders, bind groups, etc.)
        await Engine3D._globalInit();

        // Create this engine's own WebGPU context (canvas + device + swap-chain)
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);

        // Activate this engine's context for all subsystems
        this._setActive();

        // Per-engine reflection GBuffer (uses per-engine gBufferMap)
        Engine3D.setting.reflectionSetting.width = Engine3D.setting.reflectionSetting.reflectionProbeSize * 6;
        Engine3D.setting.reflectionSetting.height =
            Engine3D.setting.reflectionSetting.reflectionProbeSize *
            Engine3D.setting.reflectionSetting.reflectionProbeMaxCount;

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            Engine3D.setting.reflectionSetting.width,
            Engine3D.setting.reflectionSetting.height,
            false
        );

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);
    }

    /**
     * @internal
     * One-time global init for subsystems shared across all engine instances.
     */
    private static async _globalInit(): Promise<void> {
        if (_globalInitDone) return;
        _globalInitDone = true;

        await WasmMatrix.init(Matrix4.allocCount, Engine3D.setting.doublePrecision);

        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        ShadowLightsCollect.init();
    }

    /**
     * @internal
     * Activate this engine's per-engine resources (context, RTResourceMap, GBufferMap).
     * Called before each render frame and during init.
     */
    private _setActive(): void {
        activeEngine = this;
        setWebGPUContext(this.context);
        if (!this.rtResourceMap) {
            this.rtResourceMap = new RTResourceMap();
        }
        RTResourceMap.setActive(this.rtResourceMap);
        GBufferFrame.setActiveMap(this.gBufferMap);
    }

    /**
     * @internal
     */
    private startRenderJob(view: View3D): RendererJob {
        this._setActive();

        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (Engine3D.setting.pick.mode === `pixel`) {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (Engine3D.setting.pick.mode === `pixel` || Engine3D.setting.pick.mode === `bound`) {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Set the active view and start the render loop for this engine instance.
     */
    public startRenderView(view: View3D): RendererJob {
        this.views = [view];
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple active views and start the render loop.
     */
    public startRenderViews(views: View3D[]): void {
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this.startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the render job associated with a view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
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
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
        }
    }

    private async render(time: number): Promise<void> {
        // Activate this engine's context before doing any work
        this._setActive();

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
                // Re-activate after the async wait (another engine may have run)
                this._setActive();
            }
            this._time = time;
        }

        await this.updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async updateFrame(time: number): Promise<void> {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
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
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        for (const iterator of ComponentCollect.graphicComponent) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop)
            await this._renderLoop();

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
                if (f.enable) c(k);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
