import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setWebGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMapImpl, setRTResourceMap } from './gfx/renderJob/frame/RTResourceMap';

import { ForwardRenderJob } from './gfx/renderJob/jobs/ForwardRenderJob';
import { GlobalBindGroupImpl, setGlobalBindGroup } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { Interpolator } from './math/TimeInterpolator';
import { RendererJob } from './gfx/renderJob/jobs/RendererJob';
import { Res } from './assets/Res';
import { ShaderLib } from './assets/shader/ShaderLib';
import { ShaderUtil } from './gfx/graphics/webGpu/shader/util/ShaderUtil';
import { ComponentCollect } from './gfx/renderJob/collect/ComponentCollect';
import { ShadowLightsCollectImpl, setShadowLightsCollect } from './gfx/renderJob/collect/ShadowLightsCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';

/**
 * Orillusion 3D Engine — instantiable, supports multiple independent instances.
 *
 * ```ts
 * const engine = new Engine3D();
 * await engine.init();
 * engine.startRenderView(view);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // ─── Static instance registry ───────────────────────────────────────────────

    /**
     * All live Engine3D instances, in creation order.
     */
    public static readonly instances: Engine3D[] = [];

    // ─── Static backward-compat shims (delegate to the active instance) ──────────

    /** @internal The most recently initialised engine instance. */
    private static get _active(): Engine3D | undefined {
        return Engine3D.instances[Engine3D.instances.length - 1];
    }

    /** Backward-compat: resource manager of the active engine instance. */
    public static get res() { return Engine3D._active?.res; }

    /** Backward-compat: input system of the active engine instance. */
    public static get inputSystem() { return Engine3D._active?.inputSystem; }

    /** Backward-compat: views of the active engine instance. */
    public static get views() { return Engine3D._active?.views; }

    /** Backward-compat: render jobs of the active engine instance. */
    public static get renderJobs() { return Engine3D._active?.renderJobs; }

    /** Backward-compat: engine setting of the active engine instance. */
    public static get setting() { return Engine3D._active?.setting; }
    public static set setting(v: EngineSetting) {
        const active = Engine3D._active;
        if (active) active.setting = v;
    }

    /** Backward-compat: get RendererJob for a view (routes through view.engine). */
    public static getRenderJob(view: View3D): RendererJob {
        // Prefer the engine that owns this view
        if (view?.engine) return view.engine.getRenderJob(view);
        return Engine3D._active?.renderJobs?.get(view);
    }

    /** Backward-compat: initialise a new default engine instance (legacy single-instance usage). */
    public static async init(descriptor?: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    }): Promise<void> {
        const instance = new Engine3D();
        return instance.init(descriptor);
    }

    /** Backward-compat: aspect ratio of the active engine's GPU context. */
    public static get aspect(): number {
        return Engine3D._active?.aspect ?? 1;
    }

    /** Backward-compat: width of the active engine's canvas. */
    public static get width(): number {
        return Engine3D._active?.width ?? 0;
    }

    /** Backward-compat: height of the active engine's canvas. */
    public static get height(): number {
        return Engine3D._active?.height ?? 0;
    }

    /** Backward-compat: register a single view on the active engine instance. */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._active?.startRenderView(view);
    }

    /** Backward-compat: register multiple views on the active engine instance. */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._active?.startRenderViews(views);
    }

    /** Backward-compat: frame rate of the active engine instance. */
    public static get frameRate(): number {
        return Engine3D._active?.frameRate ?? 360;
    }
    public static set frameRate(v: number) {
        if (Engine3D._active) Engine3D._active.frameRate = v;
    }

    /** Backward-compat: pause the active engine's render loop. */
    public static pause(): void {
        Engine3D._active?.pause();
    }

    /** Backward-compat: resume the active engine's render loop. */
    public static resume(): void {
        Engine3D._active?.resume();
    }

    // ─── Instance sub-systems ────────────────────────────────────────────────────

    /**
     * Resource manager for this engine instance.
     */
    public res: Res;

    /**
     * Input system for this engine instance.
     */
    public inputSystem: InputSystem;

    /**
     * Active views registered with this engine instance.
     */
    public views: View3D[];

    /**
     * Component collection for this engine instance.
     */
    public componentCollect: ComponentCollect;

    /**
     * Global bind group for this engine instance.
     */
    public globalBindGroup: GlobalBindGroupImpl;

    /**
     * RT resource map for this engine instance.
     */
    public rtResourceMap: RTResourceMapImpl;

    /**
     * Shadow lights collect for this engine instance.
     */
    public shadowLightsCollect: ShadowLightsCollectImpl;

    /**
     * WebGPU context for this engine instance.
     */
    public gpuContext: Context3D;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /**
     * Engine settings for this instance.
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

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    // ─── Frame rate ──────────────────────────────────────────────────────────────

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

    // ─── Size helpers (delegate to this engine's gpuContext) ─────────────────────

    public get size(): number[] {
        return this.gpuContext.presentationSize;
    }

    public get aspect(): number {
        return this.gpuContext.aspect;
    }

    public get width(): number {
        return this.gpuContext.windowWidth;
    }

    public get height(): number {
        return this.gpuContext.windowHeight;
    }

    // ─── Init ────────────────────────────────────────────────────────────────────

    /**
     * Initialise this engine instance.
     * Multiple Engine3D instances can be initialised independently, each with
     * its own canvas and WebGPU context.
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

        // WasmMatrix is a shared WASM module; only init once across all instances
        if (Engine3D.instances.length === 0) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // Create a fresh Context3D for this instance
        this.gpuContext = new Context3D();
        await this.gpuContext.init(descriptor.canvasConfig);

        // Make this instance's context globally accessible so that GPU-layer
        // objects (buffers, textures, shaders) that still import `webGPUContext`
        // always target the most recently initialised engine.
        // For single-instance usage this is transparent; for multi-instance
        // callers can also reference engine.gpuContext directly.
        setWebGPUContext(this.gpuContext);

        //****pre compute setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );
        //****pre compute setting****/

        ShaderLib.init();
        ShaderUtil.init();

        // Per-instance sub-systems
        this.globalBindGroup = new GlobalBindGroupImpl();
        this.globalBindGroup.init();
        setGlobalBindGroup(this.globalBindGroup);

        this.rtResourceMap = new RTResourceMapImpl();
        this.rtResourceMap.init();
        setRTResourceMap(this.rtResourceMap);

        this.shadowLightsCollect = new ShadowLightsCollectImpl();
        setShadowLightsCollect(this.shadowLightsCollect);

        this.componentCollect = new ComponentCollect();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.gpuContext.canvas);

        // Register in global instances list
        Engine3D.instances.push(this);

        return;
    }

    private _startRenderJob(view: View3D) {
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
     * Register a single view and start rendering.
     */
    public startRenderView(view: View3D) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        view.engine = this;
        // Ensure shadow buffer is created now that engine is linked
        if (view.scene) {
            this.shadowLightsCollect.createBuffer(view);
        }
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Register multiple views and start rendering.
     */
    public startRenderViews(views: View3D[]) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.engine = this;
            if (view.scene) {
                this.shadowLightsCollect.createBuffer(view);
            }
            this._startRenderJob(view);
        }
        this.resume();
    }

    /**
     * Get the RendererJob for a given view.
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
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
    }

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
            let [w, h] = this.gpuContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        /****** auto before update with component list *****/
        for (const iterator of this.componentCollect.componentsBeforeUpdateList) {
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

        let command = this.gpuContext.device.createCommandEncoder();
        for (const iterator of this.componentCollect.componentsComputeList) {
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

        this.gpuContext.device.queue.submit([command.finish()]);

        /****** auto update with component list *****/
        for (const iterator of this.componentCollect.componentsUpdateList) {
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

        for (const iterator of this.componentCollect.graphicComponent) {
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
        /****** auto update global matrix share buffer write to gpu *****/
        let globalMatrixBindGroup = this.globalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        /****** auto late update with component list *****/
        for (const iterator of this.componentCollect.componentsLateUpdateList) {
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

