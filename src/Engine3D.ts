import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, activateWebGPUContext, webGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap, setActiveRTResourceMap } from './gfx/renderJob/frame/RTResourceMap';

import { ForwardRenderJob } from './gfx/renderJob/jobs/ForwardRenderJob';
import { GlobalBindGroup, setActiveGlobalBindGroup } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { Interpolator } from './math/TimeInterpolator';
import { RendererJob } from './gfx/renderJob/jobs/RendererJob';
import { Res } from './assets/Res';
import { ShaderLib } from './assets/shader/ShaderLib';
import { ShaderUtil } from './gfx/graphics/webGpu/shader/util/ShaderUtil';
import { ComponentCollect, setActiveComponentCollect } from './gfx/renderJob/collect/ComponentCollect';
import { ShadowLightsCollect, setActiveShadowLightsCollect } from './gfx/renderJob/collect/ShadowLightsCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame, setActiveGBufferMap } from './gfx/renderJob/frame/GBufferFrame';
import { EntityCollect, setActiveEntityCollect } from './gfx/renderJob/collect/EntityCollect';

/**
 * Orillusion 3D Engine
 *
 * Supports multiple independent instances. Each instance manages its own canvas,
 * render pipeline, component system, and per-engine state.
 *
 * Usage (new multi-instance API):
 *   const engine = new Engine3D();
 *   await engine.init({ canvasConfig: { canvas: myCanvas } });
 *   engine.startRenderView(view);
 *
 * Legacy single-instance API (backwards compatible):
 *   await Engine3D.init();
 *   Engine3D.startRenderView(view);
 *
 * -- Engine3D.setting.*
 * -- await Engine3D.init();
 * @group engine3D
 */
export class Engine3D {

    // ----------------------------------------------------------------
    // Instance properties
    // ----------------------------------------------------------------

    /** Resource manager for this engine instance */
    public res: Res;

    /** Input system for this engine instance */
    public inputSystem: InputSystem;

    /** Active render views for this engine instance */
    public views: View3D[];

    /** Per-instance component registration system */
    public componentCollect: ComponentCollect;

    /** Per-instance entity/render-node registry */
    public entityCollect: EntityCollect;

    /** Per-instance GPU bind group manager */
    public globalBindGroup: GlobalBindGroup;

    /** Per-instance render-target resource map */
    public rtResourceMap: RTResourceMap;

    /** Per-instance shadow light collector */
    public shadowLightsCollect: ShadowLightsCollect;

    /** Per-instance GBuffer frame map */
    public gBufferMap: Map<string, GBufferFrame>;

    /** Per-instance engine settings */
    public setting: EngineSetting = Engine3D._makeDefaultSetting();

    /** @internal Render job map for this instance */
    public renderJobs: Map<View3D, RendererJob>;

    /** @internal WebGPU context (canvas + surface) for this instance */
    public context: Context3D;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // ----------------------------------------------------------------
    // Static state – shared default instance for backwards compat
    // ----------------------------------------------------------------

    /** @internal The currently active (rendering) engine instance */
    public static current: Engine3D | null = null;

    /** @internal Default instance for static API backwards compatibility */
    private static _default: Engine3D | null = null;

    /** All created engine instances */
    public static readonly instances: Engine3D[] = [];

    // ----------------------------------------------------------------
    // Instance getters
    // ----------------------------------------------------------------

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

    // ----------------------------------------------------------------
    // Instance init
    // ----------------------------------------------------------------

    /**
     * Initialize this engine instance.
     * @param descriptor  {@link CanvasConfig}
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

        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // WasmMatrix is shared across all engine instances
        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        // Each engine instance has its own WebGPU canvas context
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);

        // Activate this engine's context so per-frame singletons use it
        this._activateContext();

        //****pre compute setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Per-instance sub-systems
        this.gBufferMap = new Map<string, GBufferFrame>();
        this.rtResourceMap = new RTResourceMap();
        this.rtResourceMap.init();
        this.globalBindGroup = new GlobalBindGroup();
        this.globalBindGroup.init();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.shadowLightsCollect.init();
        this.shadowLightsCollect.globalBindGroup = this.globalBindGroup;
        this.componentCollect = new ComponentCollect();
        this.entityCollect = new EntityCollect();
        this.entityCollect.engineSetting = this.setting;

        // Activate per-instance singletons for subsequent init code
        this._activateAllSingletons();

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );
        //****pre compute setting****/

        // ShaderLib and ShaderUtil are shared across all engine instances
        ShaderLib.init();
        ShaderUtil.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);

        Engine3D.instances.push(this);
    }

    private _activateContext(): void {
        activateWebGPUContext(this.context);
    }

    private _activateAllSingletons(): void {
        activateWebGPUContext(this.context);
        setActiveComponentCollect(this.componentCollect);
        setActiveEntityCollect(this.entityCollect);
        setActiveGlobalBindGroup(this.globalBindGroup);
        setActiveRTResourceMap(this.rtResourceMap);
        setActiveGBufferMap(this.gBufferMap);
        setActiveShadowLightsCollect(this.shadowLightsCollect);
        Engine3D.current = this;
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
     * Set render view and start renderer for this engine instance.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];

        // Associate the view and its scene with this engine
        view.engine = this;
        if (view.scene) {
            view.scene.engine = this;
            this.shadowLightsCollect.createBuffer(view);
        }

        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set render views and start renderer for this engine instance.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.engine = this;
            if (view.scene) {
                view.scene.engine = this;
                this.shadowLightsCollect.createBuffer(view);
            }
            this._startRenderJob(view);
        }
        this.resume();
    }

    /**
     * Get view render job instance.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause the engine render.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the engine render.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
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
        // Activate this engine's context and per-instance singletons for this frame
        this._activateAllSingletons();

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

        for (const iterator of this.componentCollect.componentsBeforeUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k); }
            }
        }

        let command = this.context.device.createCommandEncoder();
        for (const iterator of this.componentCollect.componentsComputeList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k, command); }
            }
        }

        this.context.device.queue.submit([command.finish()]);

        for (const iterator of this.componentCollect.componentsUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k); }
            }
        }

        for (const iterator of this.componentCollect.graphicComponent) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (k && f.enable) { c(k); }
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        let globalMatrixBindGroup = this.globalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        for (const iterator of this.componentCollect.componentsLateUpdateList) {
            let k = iterator[0];
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) { c(k); }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }

    // ----------------------------------------------------------------
    // Static helpers
    // ----------------------------------------------------------------

    private static _makeDefaultSetting(): EngineSetting {
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

    // ----------------------------------------------------------------
    // Static backwards-compatibility API
    // ----------------------------------------------------------------

    private static _getDefault(): Engine3D {
        if (!Engine3D._default) {
            Engine3D._default = new Engine3D();
        }
        return Engine3D._default;
    }

    /** @deprecated Use instance property. Provided for backwards compatibility. */
    public static get res(): Res { return Engine3D._default?.res; }
    public static set res(v: Res) { if (Engine3D._default) Engine3D._default.res = v; }

    /** @deprecated Use instance property. Provided for backwards compatibility. */
    public static get inputSystem(): InputSystem { return Engine3D._default?.inputSystem; }
    public static set inputSystem(v: InputSystem) { if (Engine3D._default) Engine3D._default.inputSystem = v; }

    /** @deprecated Use instance property. Provided for backwards compatibility. */
    public static get views(): View3D[] { return Engine3D._default?.views; }
    public static set views(v: View3D[]) { if (Engine3D._default) Engine3D._default.views = v; }

    /** @deprecated Use instance property. Provided for backwards compatibility. */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._default?.renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { if (Engine3D._default) Engine3D._default.renderJobs = v; }

    /** @deprecated Use instance property. Provided for backwards compatibility. */
    public static get setting(): EngineSetting {
        return Engine3D._default?.setting ?? Engine3D._makeDefaultSetting();
    }
    public static set setting(v: EngineSetting) {
        const d = Engine3D._getDefault();
        d.setting = v;
    }

    /** @deprecated Use instance getter. Provided for backwards compatibility. */
    public static get size(): number[] { return Engine3D._default?.size; }

    /** @deprecated Use instance getter. Provided for backwards compatibility. */
    public static get aspect(): number { return Engine3D._default?.aspect; }

    /** @deprecated Use instance getter. Provided for backwards compatibility. */
    public static get width(): number { return Engine3D._default?.width; }

    /** @deprecated Use instance getter. Provided for backwards compatibility. */
    public static get height(): number { return Engine3D._default?.height; }

    /** @deprecated Use instance property. Provided for backwards compatibility. */
    public static get frameRate(): number { return Engine3D._default?._frameRate ?? 360; }
    public static set frameRate(v: number) { if (Engine3D._default) Engine3D._default.frameRate = v; }

    /**
     * Create webgpu 3d engine (static legacy API – creates the default instance)
     * @param descriptor  {@link CanvasConfig}
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const d = Engine3D._getDefault();
        await d.init(descriptor);
        Engine3D._default = d;
    }

    /** @deprecated Use instance method. Provided for backwards compatibility. */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._getDefault().startRenderView(view);
    }

    /** @deprecated Use instance method. Provided for backwards compatibility. */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._getDefault().startRenderViews(views);
    }

    /** @deprecated Use instance method. Provided for backwards compatibility. */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._default?.getRenderJob(view);
    }

    /** @deprecated Use instance method. Provided for backwards compatibility. */
    public static pause(): void {
        Engine3D._default?.pause();
    }

    /** @deprecated Use instance method. Provided for backwards compatibility. */
    public static resume(): void {
        Engine3D._default?.resume();
    }
}
