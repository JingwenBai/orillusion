import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setCurrentContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { setCurrentEngine } from './util/EngineHolder';

/**
 * Global engine settings shared across all Engine3D instances.
 * Per-instance overrides can be passed via the engineSetting option in init().
 * @group engine3D
 */
export const defaultEngineSetting: EngineSetting = {
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

/**
 * Orillusion 3D Engine
 *
 * Can be used as a static singleton (backward-compatible):
 *   await Engine3D.init({ canvasConfig });
 *   Engine3D.startRenderView(view);
 *
 * Or instantiated for multi-instance use:
 *   const engine = new Engine3D();
 *   await engine.init({ canvasConfig: { canvas: canvas1 } });
 *   engine.startRenderView(view);
 *
 * @group engine3D
 */
export class Engine3D {

    // ═══════════════════════════════════════════════════════════════════════════
    // PER-INSTANCE STATE
    // ═══════════════════════════════════════════════════════════════════════════

    /** WebGPU context for this engine instance. */
    public context: Context3D;

    /** Per-instance component lifecycle tracking. */
    public componentCollect: ComponentCollect;

    /** Per-instance GPU bind-group registry. */
    public globalBindGroup: GlobalBindGroup;

    /** Per-instance render-texture registry. */
    public rtResourceMap: RTResourceMap;

    /** Per-instance shadow-light tracking. */
    public shadowLightsCollect: ShadowLightsCollect;

    /** Resource manager for this engine instance. */
    public res: Res;

    /** Input handler for this engine instance. */
    public inputSystem: InputSystem;

    /** Active views for this engine instance. */
    public views: View3D[];

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /** Per-instance copy of engine settings. */
    public setting: EngineSetting;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ═══════════════════════════════════════════════════════════════════════════
    // INSTANCE GETTERS / SETTERS
    // ═══════════════════════════════════════════════════════════════════════════

    public get frameRate(): number { return this._frameRate; }

    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    public get size(): number[] { return this.context.presentationSize; }
    public get aspect(): number { return this.context.aspect; }
    public get width(): number { return this.context.windowWidth; }
    public get height(): number { return this.context.windowHeight; }

    // ═══════════════════════════════════════════════════════════════════════════
    // INSTANCE METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Initialise this engine instance against the given canvas / settings.
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

        // Create per-instance sub-systems BEFORE activating this engine so that
        // sub-system constructors that call back into the static facades still use
        // the correct (empty) initial state.
        this.context = new Context3D();
        this.componentCollect = new ComponentCollect();
        this.globalBindGroup = new GlobalBindGroup();
        this.rtResourceMap = new RTResourceMap();
        this.shadowLightsCollect = new ShadowLightsCollect();

        // Make this the active engine so all static-facade calls route here.
        setCurrentEngine(this);
        setCurrentContext(this.context);

        // Merge settings (deep-enough copy for top-level keys).
        this.setting = { ...defaultEngineSetting, ...descriptor.engineSetting };

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        await this.context.init(descriptor.canvasConfig);

        // Pre-compute reflection settings.
        this.setting.reflectionSetting.width =
            this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        ShaderLib.init();
        ShaderUtil.init();

        // These now route through static facades → current engine's instances.
        GlobalBindGroup.init();
        RTResourceMap.init();
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
        // Stamp the view with this engine so ComponentCollect facade can route
        // lifecycle calls to this engine's componentCollect instance.
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
     * Register a single view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Register multiple views and start the render loop.
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
     * Return the RendererJob associated with a view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /** Pause rendering for this engine instance. */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /** Resume rendering for this engine instance. */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    private async _render(time: number): Promise<void> {
        if (this._frameRateValue > 0) {
            const delta = time - this._time;
            if (delta < this._frameRateValue) {
                const t = performance.now();
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
        // Activate this engine's context so all subsystem singletons see the
        // right GPU state for the duration of this frame.
        setCurrentEngine(this);
        setCurrentContext(this.context);

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

        if (this._beforeRender) await this._beforeRender();

        const collect = this.componentCollect;

        for (const iterator of collect.componentsBeforeUpdateList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        let command = this.context.device.createCommandEncoder();
        for (const iterator of collect.componentsComputeList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k, command);
            }
        }
        this.context.device.queue.submit([command.finish()]);

        for (const iterator of collect.componentsUpdateList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        for (const iterator of collect.graphicComponent) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (k && f.enable) c(k);
            }
        }

        if (this._renderLoop) await this._renderLoop();

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);

        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, _k) => {
            if (!v.renderState) v.start();
            v.renderFrame();
        });

        for (const iterator of collect.componentsLateUpdateList) {
            const k = iterator[0];
            const v = iterator[1];
            for (const iterator2 of v) {
                const f = iterator2[0];
                const c = iterator2[1];
                if (f.enable) c(k);
            }
        }

        if (this._lateRender) await this._lateRender();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATIC BACKWARD-COMPATIBLE API
    // All static members delegate to the default singleton instance.
    // Existing code that calls Engine3D.init() / Engine3D.startRenderView() etc.
    // continues to work without modification.
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Global default settings object.
     * Kept static so external code can configure it before calling init().
     */
    public static setting: EngineSetting = defaultEngineSetting;

    private static _defaultInstance: Engine3D | null = null;

    private static _inst(): Engine3D {
        if (!Engine3D._defaultInstance) {
            Engine3D._defaultInstance = new Engine3D();
        }
        return Engine3D._defaultInstance;
    }

    // ── Static property shims ──────────────────────────────────────────────────

    public static get res(): Res { return Engine3D._defaultInstance?.res; }
    public static set res(v: Res) { Engine3D._inst().res = v; }

    public static get inputSystem(): InputSystem { return Engine3D._defaultInstance?.inputSystem; }
    public static set inputSystem(v: InputSystem) { Engine3D._inst().inputSystem = v; }

    public static get views(): View3D[] { return Engine3D._defaultInstance?.views; }
    public static set views(v: View3D[]) { Engine3D._inst().views = v; }

    /** @internal */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._defaultInstance?.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { Engine3D._inst().renderJobs = v; }

    public static get frameRate(): number { return Engine3D._defaultInstance?._frameRate ?? 360; }
    public static set frameRate(value: number) { Engine3D._inst().frameRate = value; }

    public static get size(): number[] { return webGPUContext.presentationSize; }
    public static get aspect(): number { return webGPUContext.aspect; }
    public static get width(): number { return webGPUContext.windowWidth; }
    public static get height(): number { return webGPUContext.windowHeight; }

    // ── Static method shims ───────────────────────────────────────────────────

    /**
     * Initialise the default singleton engine.
     * @param descriptor  {@link CanvasConfig}
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        // Always rebuild so repeated static calls get a fresh engine.
        Engine3D._defaultInstance = new Engine3D();
        // Propagate the static setting object as a base.
        const merged = { ...descriptor, engineSetting: { ...Engine3D.setting, ...descriptor.engineSetting } };
        await Engine3D._defaultInstance.init(merged);
        // Keep the static setting in sync with what the instance resolved.
        Engine3D.setting = Engine3D._defaultInstance.setting;
    }

    /**
     * Set render view and start renderer (static singleton variant).
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._inst().startRenderView(view);
    }

    /**
     * Set render views and start renderer (static singleton variant).
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._inst().startRenderViews(views);
    }

    /**
     * Get view render job instance (static singleton variant).
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._inst().getRenderJob(view);
    }

    /** Pause the default singleton engine. */
    public static pause(): void {
        Engine3D._defaultInstance?.pause();
    }

    /** Resume the default singleton engine. */
    public static resume(): void {
        Engine3D._inst().resume();
    }
}
