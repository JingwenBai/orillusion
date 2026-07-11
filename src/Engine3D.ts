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
import { EntityCollect } from './gfx/renderJob/collect/EntityCollect';

/**
 * Returns a fresh copy of the default engine settings.
 * Called once per engine instance so each engine has independent settings.
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
 * Supports both single-instance (static API, backward-compatible) and
 * multi-instance usage (create multiple `new Engine3D()` instances, each
 * with its own canvas, scene, and render loop).
 *
 * -- Single-instance (legacy): `await Engine3D.init(); Engine3D.startRenderView(view);`
 * -- Multi-instance: `const e = new Engine3D(); await e.init({ canvasConfig: { canvas } }); e.startRenderView(view);`
 *
 * @group engine3D
 */
export class Engine3D {

    // ─────────────────────────────────────────────────────────────────────────
    //  Static: active-engine pointer + backward-compat proxy API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * The engine instance that is currently initialising or rendering.
     * JavaScript is single-threaded so only one engine is active at a time.
     * All per-engine static getters read from this pointer.
     */
    public static current: Engine3D | null = null;

    /** Default engine created by the static `Engine3D.init()` shorthand. */
    private static _default: Engine3D | null = null;

    /** Returns the active engine: whichever is currently rendering, or the default instance. */
    private static get _active(): Engine3D | null {
        return Engine3D.current ?? Engine3D._default;
    }

    // ── Static proxy getters (backward-compat, delegate to active engine) ──

    /** @deprecated Use engine instance instead for multi-instance setups. */
    public static get res(): Res { return Engine3D._active?._res; }
    public static set res(v: Res) { const e = Engine3D._active; if (e) e._res = v; }

    /** @deprecated Use engine instance instead for multi-instance setups. */
    public static get inputSystem(): InputSystem { return Engine3D._active?._inputSystem; }
    public static set inputSystem(v: InputSystem) { const e = Engine3D._active; if (e) e._inputSystem = v; }

    /** @deprecated Use engine instance instead for multi-instance setups. */
    public static get views(): View3D[] { return Engine3D._active?._views; }
    public static set views(v: View3D[]) { const e = Engine3D._active; if (e) e._views = v; }

    /** @deprecated Use engine instance instead for multi-instance setups. */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._active?._renderJobs; }

    /**
     * Engine settings. In multi-instance mode each engine has independent settings;
     * this getter returns the active engine's settings.
     * @deprecated Use engine instance instead for multi-instance setups.
     */
    public static get setting(): EngineSetting { return Engine3D._active?._setting; }
    public static set setting(v: EngineSetting) { const e = Engine3D._active; if (e) e._setting = v; }

    /** @deprecated Use engine instance instead for multi-instance setups. */
    public static get frameRate(): number { return Engine3D._active?._frameRate ?? 360; }
    public static set frameRate(value: number) { const e = Engine3D._active; if (e) e.frameRate = value; }

    /** @deprecated Use engine instance instead for multi-instance setups. */
    public static get size(): number[] { return Engine3D._active?.size ?? [0, 0]; }

    /** @deprecated Use engine instance instead for multi-instance setups. */
    public static get aspect(): number { return Engine3D._active?.aspect ?? 1; }

    /** @deprecated Use engine instance instead for multi-instance setups. */
    public static get width(): number { return Engine3D._active?.width ?? 0; }

    /** @deprecated Use engine instance instead for multi-instance setups. */
    public static get height(): number { return Engine3D._active?.height ?? 0; }

    // ── Static proxy methods ──

    /**
     * Static shorthand — creates a default Engine3D instance and initialises it.
     * Equivalent to `const engine = new Engine3D(); await engine.init(descriptor);`
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<Engine3D> {
        const engine = new Engine3D();
        Engine3D._default = engine;
        await engine.init(descriptor);
        return engine;
    }

    /**
     * Static shorthand — starts rendering the given view on the default engine instance.
     * @deprecated Use engine instance instead for multi-instance setups.
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._active?.startRenderView(view);
    }

    /**
     * Static shorthand — starts rendering multiple views on the default engine instance.
     * @deprecated Use engine instance instead for multi-instance setups.
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._active?.startRenderViews(views);
    }

    /**
     * Returns the RendererJob for the given view on the default engine instance.
     * @deprecated Use engine instance instead for multi-instance setups.
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._active?.getRenderJob(view);
    }

    /** @deprecated Use engine instance instead for multi-instance setups. */
    public static pause(): void { Engine3D._active?.pause(); }

    /** @deprecated Use engine instance instead for multi-instance setups. */
    public static resume(): void { Engine3D._active?.resume(); }


    // ─────────────────────────────────────────────────────────────────────────
    //  Instance members — one per Engine3D instance
    // ─────────────────────────────────────────────────────────────────────────

    /** Per-instance WebGPU context (canvas + swap-chain). Device is shared. */
    public context: Context3D;

    /** Per-instance entity collect (render nodes, lights, sky, etc.). */
    public entityCollect: EntityCollect;

    private _res: Res;
    private _inputSystem: InputSystem;
    private _views: View3D[];
    private _renderJobs: Map<View3D, RendererJob>;
    private _setting: EngineSetting = createDefaultSetting();
    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /** Instance getters expose internal fields publicly on the instance. */
    public get res(): Res { return this._res; }
    public set res(v: Res) { this._res = v; }
    public get inputSystem(): InputSystem { return this._inputSystem; }
    public get views(): View3D[] { return this._views; }
    public get renderJobs(): Map<View3D, RendererJob> { return this._renderJobs; }
    public get setting(): EngineSetting { return this._setting; }
    public set setting(v: EngineSetting) { this._setting = v; }

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    public get size(): number[] { return this.context?.presentationSize ?? [0, 0]; }
    public get aspect(): number { return this.context?.aspect ?? 1; }
    public get width(): number { return this.context?.windowWidth ?? 0; }
    public get height(): number { return this.context?.windowHeight ?? 0; }

    /**
     * Initialise this engine instance.
     * Creates a new WebGPU canvas context (sharing the global device/adapter)
     * and sets up all subsystems.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Set this instance as the currently active engine
        Engine3D.current = this;

        this._setting = { ...this._setting, ...descriptor.engineSetting };

        await WasmMatrix.init(Matrix4.allocCount, this._setting.doublePrecision);

        // Create and initialise this engine's own WebGPU canvas context
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);

        // Make this context visible to all subsystem code via the module-level variable
        setWebGPUContext(this.context);

        // Pre-compute reflection settings
        this._setting.reflectionSetting.width = this._setting.reflectionSetting.reflectionProbeSize * 6;
        this._setting.reflectionSetting.height = this._setting.reflectionSetting.reflectionProbeSize * this._setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this._setting.reflectionSetting.width,
            this._setting.reflectionSetting.height,
            false
        );

        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        RTResourceMap.init();
        ShadowLightsCollect.init();

        // Per-instance resource manager
        this._res = new Res();
        this._res.initDefault();

        // Per-instance entity collector
        this.entityCollect = new EntityCollect();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this._inputSystem = new InputSystem();
        this._inputSystem.initCanvas(this.context.canvas);
    }

    private startRenderJob(view: View3D): RendererJob {
        let renderJob = new ForwardRenderJob(view);
        this._renderJobs.set(view, renderJob);

        if (this._setting.pick.mode === 'pixel') {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this._setting.pick.mode === 'pixel' || this._setting.pick.mode === 'bound') {
            view.enablePick = true;
        }
        return renderJob;
    }

    /**
     * Set the render view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this._renderJobs ||= new Map<View3D, RendererJob>();
        this._views = [view];
        // Register this scene so EntityCollect.instance resolves correctly
        EntityCollect.register(view.scene, this.entityCollect);
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop.
     */
    public startRenderViews(views: View3D[]): void {
        this._renderJobs ||= new Map<View3D, RendererJob>();
        this._views = views;
        for (let i = 0; i < views.length; i++) {
            EntityCollect.register(views[i].scene, this.entityCollect);
            this.startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Returns the RendererJob for the given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this._renderJobs?.get(view);
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
     * Resume (or start) this engine's render loop.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
    }

    private async render(time: number): Promise<void> {
        // Mark this instance as the active engine for the duration of this frame
        Engine3D.current = this;
        // Point the module-level webGPUContext at this engine's canvas context
        setWebGPUContext(this.context);

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
        await this.updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async updateFrame(time: number): Promise<void> {
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this._views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.context.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        // Only process components that belong to this engine's views
        const myViewSet = new Set(views);

        for (const [view, compMap] of ComponentCollect.componentsBeforeUpdateList) {
            if (!myViewSet.has(view)) continue;
            for (const [comp, fn] of compMap) {
                if (comp.enable) fn(view);
            }
        }

        let command = this.context.device.createCommandEncoder();
        for (const [view, compMap] of ComponentCollect.componentsComputeList) {
            if (!myViewSet.has(view)) continue;
            for (const [comp, fn] of compMap) {
                if (comp.enable) fn(view, command);
            }
        }
        this.context.device.queue.submit([command.finish()]);

        for (const [view, compMap] of ComponentCollect.componentsUpdateList) {
            if (!myViewSet.has(view)) continue;
            for (const [comp, fn] of compMap) {
                if (comp.enable) fn(view);
            }
        }

        for (const [view, compMap] of ComponentCollect.graphicComponent) {
            if (!myViewSet.has(view)) continue;
            for (const [comp, fn] of compMap) {
                if (view && comp.enable) fn(view);
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this._renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        for (const [view, compMap] of ComponentCollect.componentsLateUpdateList) {
            if (!myViewSet.has(view)) continue;
            for (const [comp, fn] of compMap) {
                if (comp.enable) fn(view);
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
