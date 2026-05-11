import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setWebGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap } from './gfx/renderJob/frame/RTResourceMap';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';

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
 * Orillusion 3D Engine — instantiable for multi-canvas / multi-instance use.
 *
 * **Single-instance (backwards-compatible) usage:**
 * ```ts
 * await Engine3D.init({ canvasConfig });
 * Engine3D.startRenderView(view);
 * ```
 *
 * **Multi-instance usage:**
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

    // ─── per-engine state ──────────────────────────────────────────────────────

    /** WebGPU context for this engine's canvas. */
    public webGPUContext: Context3D;

    /** Resource manager for this engine. */
    public res: Res;

    /** Input system bound to this engine's canvas. */
    public inputSystem: InputSystem;

    /** Active views registered with this engine. */
    public views: View3D[];

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /** @internal Per-engine render texture pool (avoids name collisions across engines). */
    public rtResourceMap: RTResourceMap;

    /** @internal Per-engine GBuffer frame cache. */
    public gBufferMap: Map<string, GBufferFrame>;

    /** Engine-specific settings. */
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

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ─── per-engine render size helpers ────────────────────────────────────────

    public get size(): number[] { return this.webGPUContext.presentationSize; }
    public get aspect(): number { return this.webGPUContext.aspect; }
    public get width(): number { return this.webGPUContext.windowWidth; }
    public get height(): number { return this.webGPUContext.windowHeight; }

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    // ─── initialise ────────────────────────────────────────────────────────────

    /**
     * Initialise this engine instance.
     * The first engine to call `init()` also performs one-time global setup
     * (WASM matrix library, shader library, global bind groups, shadow collector).
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

        // Global one-time init (WASM, shaders, global GPU structures).
        await Engine3D._globalInit(this.setting);

        // Per-engine GPU context.
        this.webGPUContext = new Context3D();
        await this.webGPUContext.init(descriptor.canvasConfig);

        // Make this engine's context visible to code that still uses the
        // module-level `webGPUContext` import (backwards compat).
        this._activate();

        // Pre-compute reflection setting dimensions.
        this.setting.reflectionSetting.width =
            this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Per-engine render-resource pools.
        this.rtResourceMap = new RTResourceMap();
        this.gBufferMap = new Map<string, GBufferFrame>();

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.webGPUContext.canvas);

        // Register as the default engine (for static backward-compat API).
        if (!Engine3D._default) Engine3D._default = this;
    }

    // ─── view registration & render jobs ───────────────────────────────────────

    private _startRenderJob(view: View3D): RendererJob {
        view.engine = this;
        Engine3D._viewEngineMap.set(view, this);

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

    /** Register a single view and start rendering. */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /** Register multiple views and start rendering. */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (const view of views) this._startRenderJob(view);
        this.resume();
    }

    /** Return the RendererJob for a given view. */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    // ─── render loop ───────────────────────────────────────────────────────────

    /** Pause this engine's render loop. */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume this engine's render loop. */
    public resume(): void {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
    }

    private async _render(time: number): Promise<void> {
        if (this._frameRateValue > 0) {
            let delta = time - this._time;
            if (delta < this._frameRateValue) {
                const t = performance.now();
                await new Promise<void>(res => {
                    setTimeout(() => {
                        time += (performance.now() - t);
                        res();
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
        // Activate this engine: update webGPUContext live binding and Engine3D._current.
        this._activate();

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        const viewSet = new Set(views);

        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this.webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) await this._beforeRender();

        // Only iterate component lists for views that belong to THIS engine.
        for (const [view, componentMap] of ComponentCollect.componentsBeforeUpdateList) {
            if (!viewSet.has(view)) continue;
            for (const [f, c] of componentMap) {
                if (f.enable) c(view);
            }
        }

        let command = this.webGPUContext.device.createCommandEncoder();
        for (const [view, componentMap] of ComponentCollect.componentsComputeList) {
            if (!viewSet.has(view)) continue;
            for (const [f, c] of componentMap) {
                if (f.enable) c(view, command);
            }
        }
        this.webGPUContext.device.queue.submit([command.finish()]);

        for (const [view, componentMap] of ComponentCollect.componentsUpdateList) {
            if (!viewSet.has(view)) continue;
            for (const [f, c] of componentMap) {
                if (f.enable) c(view);
            }
        }

        for (const [view, componentMap] of ComponentCollect.graphicComponent) {
            if (!viewSet.has(view)) continue;
            for (const [f, c] of componentMap) {
                if (view && f.enable) c(view);
            }
        }

        if (this._renderLoop) await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const [view, componentMap] of ComponentCollect.componentsLateUpdateList) {
            if (!viewSet.has(view)) continue;
            for (const [f, c] of componentMap) {
                if (f.enable) c(view);
            }
        }

        if (this._lateRender) await this._lateRender();
    }

    // ─── context activation ────────────────────────────────────────────────────

    /**
     * Set this engine as the currently active context.
     * Updates the module-level `webGPUContext` live binding so that legacy
     * code importing it directly continues to work with the right device.
     * @internal
     */
    private _activate(): void {
        Engine3D._current = this;
        setWebGPUContext(this.webGPUContext);
    }

    // ─── static global state ───────────────────────────────────────────────────

    /** Currently rendering engine (set at the start of each frame). */
    public static _current: Engine3D | null = null;

    /** First engine to call init() – used for static backward-compat properties. */
    private static _default: Engine3D | null = null;

    /** View → Engine registry for component-level lookup. */
    public static readonly _viewEngineMap: Map<View3D, Engine3D> = new Map();

    /** Look up which engine owns a given view. */
    public static getForView(view: View3D): Engine3D | undefined {
        return Engine3D._viewEngineMap.get(view);
    }

    /** Flag to ensure one-time global init (WASM, shaders, etc.) runs only once. */
    private static _globalInitDone: boolean = false;

    private static async _globalInit(setting: EngineSetting): Promise<void> {
        if (Engine3D._globalInitDone) return;
        Engine3D._globalInitDone = true;

        await WasmMatrix.init(Matrix4.allocCount, setting.doublePrecision);

        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        ShadowLightsCollect.init();
    }

    // ─── static backward-compatible API ────────────────────────────────────────
    // All static accessors delegate to _current (active during render) or _default.

    private static get _active(): Engine3D | null {
        return Engine3D._current ?? Engine3D._default;
    }

    /** @deprecated Use an Engine3D instance instead. */
    public static get setting(): EngineSetting { return Engine3D._active?.setting; }
    public static set setting(v: EngineSetting) { if (Engine3D._active) Engine3D._active.setting = v; }

    /** @deprecated Use an Engine3D instance instead. */
    public static get res(): Res { return Engine3D._active?.res; }

    /** @deprecated Use an Engine3D instance instead. */
    public static get inputSystem(): InputSystem { return Engine3D._active?.inputSystem; }

    /** @deprecated Use an Engine3D instance instead. */
    public static get views(): View3D[] { return Engine3D._active?.views; }

    /** @deprecated Use an Engine3D instance instead. */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._active?.renderJobs; }

    /** @deprecated Use an Engine3D instance instead. */
    public static get size(): number[] { return Engine3D._active?.size; }

    /** @deprecated Use an Engine3D instance instead. */
    public static get aspect(): number { return Engine3D._active?.aspect; }

    /** @deprecated Use an Engine3D instance instead. */
    public static get width(): number { return Engine3D._active?.width; }

    /** @deprecated Use an Engine3D instance instead. */
    public static get height(): number { return Engine3D._active?.height; }

    /** @deprecated Use an Engine3D instance instead. */
    public static get frameRate(): number { return Engine3D._active?.frameRate; }
    public static set frameRate(v: number) { if (Engine3D._active) Engine3D._active.frameRate = v; }

    /**
     * Static init — creates a default Engine3D instance for backwards compat.
     * @deprecated Prefer `new Engine3D().init(...)` for multi-instance use.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        return engine.init(descriptor);
    }

    /** @deprecated Use an Engine3D instance instead. */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._default?.startRenderView(view);
    }

    /** @deprecated Use an Engine3D instance instead. */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._default?.startRenderViews(views);
    }

    /** @deprecated Use an Engine3D instance instead. */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._default?.getRenderJob(view);
    }

    /** @deprecated Use an Engine3D instance instead. */
    public static pause(): void { Engine3D._default?.pause(); }

    /** @deprecated Use an Engine3D instance instead. */
    public static resume(): void { Engine3D._default?.resume(); }
}
