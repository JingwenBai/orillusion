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
import { ComponentCollect, Engine3D_ref } from './gfx/renderJob/collect/ComponentCollect';
import { ShadowLightsCollect } from './gfx/renderJob/collect/ShadowLightsCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';
import { EntityCollect } from './gfx/renderJob/collect/EntityCollect';

/**
 * Orillusion 3D Engine
 *
 * Can be instantiated multiple times to support running independent 3D scenes
 * on separate canvases simultaneously.
 *
 * Usage:
 * ```typescript
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas: myCanvas } });
 * engine.startRenderView(view);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    // -------------------------------------------------------------------------
    // Multi-instance state
    // -------------------------------------------------------------------------

    /**
     * The currently active Engine3D instance.
     * Set at the start of each engine's frame update so that static subsystem
     * proxies (ComponentCollect, EntityCollect, RTResourceMap, GBufferFrame, …)
     * can route their calls to the correct per-engine data without requiring
     * callers to hold an explicit engine reference.
     * @internal
     */
    public static _current: Engine3D = null;

    /**
     * All Engine3D instances that have been initialized.
     */
    public static readonly instances: Engine3D[] = [];

    // -------------------------------------------------------------------------
    // Per-instance subsystems
    // -------------------------------------------------------------------------

    /**
     * WebGPU context (canvas + device) for this engine instance.
     */
    public context: Context3D;

    /**
     * Entity/render-node collector for this engine instance.
     */
    public entityCollect: EntityCollect;

    /**
     * Component lifecycle registry for this engine instance.
     */
    public componentCollect: ComponentCollect;

    /**
     * Render-target texture pool for this engine instance.
     */
    public rtResourceMap: RTResourceMap;

    /**
     * Per-engine GBuffer frame map (keyed by string name).
     * Populated lazily by GBufferFrame.getGBufferFrame().
     * @internal
     */
    public _gBufferMap: Map<string, GBufferFrame>;

    /**
     * Resource manager (textures, meshes, …) for this engine instance.
     */
    public res: Res;

    /**
     * Keyboard / pointer / touch input handler for this engine instance.
     */
    public inputSystem: InputSystem;

    /**
     * Active views for this engine instance.
     */
    public views: View3D[];

    /**
     * Render jobs keyed by View3D for this engine instance.
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // -------------------------------------------------------------------------
    // Per-instance settings
    // -------------------------------------------------------------------------

    /**
     * Engine configuration for this instance.
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

    // -------------------------------------------------------------------------
    // Instance accessors
    // -------------------------------------------------------------------------

    /**
     * Target render frame-rate (fps). 360 = unlimited.
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

    // -------------------------------------------------------------------------
    // Static backward-compat accessors (route to _current)
    // -------------------------------------------------------------------------

    /**
     * Returns the setting of the currently active engine instance.
     * For multi-instance usage prefer `engine.setting` directly.
     */
    public static get setting(): EngineSetting {
        return Engine3D._current?.setting;
    }

    /**
     * Returns the res of the currently active engine instance.
     * For multi-instance usage prefer `engine.res` directly.
     */
    public static get res(): Res {
        return Engine3D._current?.res;
    }

    // -------------------------------------------------------------------------
    // Static backward-compat API (single-engine usage)
    // These proxy to Engine3D._current so that existing code using the old
    // static API continues to work unchanged.
    // For new multi-instance code, use `engine.xxx` directly.
    // -------------------------------------------------------------------------

    /** @deprecated Use `engine.inputSystem` instead. */
    public static get inputSystem(): InputSystem {
        return Engine3D._current?.inputSystem;
    }

    /** @deprecated Use `engine.views` instead. */
    public static get views(): View3D[] {
        return Engine3D._current?.views;
    }

    /** @deprecated Use `engine.renderJobs` instead. */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._current?.renderJobs;
    }

    /** @deprecated Use `engine.frameRate` instead. */
    public static get frameRate(): number {
        return Engine3D._current?.frameRate ?? 360;
    }

    public static set frameRate(value: number) {
        if (Engine3D._current) Engine3D._current.frameRate = value;
    }

    /** @deprecated Use `engine.size` instead. */
    public static get size(): number[] {
        return Engine3D._current?.size;
    }

    /** @deprecated Use `engine.aspect` instead. */
    public static get aspect(): number {
        return Engine3D._current?.aspect;
    }

    /** @deprecated Use `engine.width` instead. */
    public static get width(): number {
        return Engine3D._current?.width;
    }

    /** @deprecated Use `engine.height` instead. */
    public static get height(): number {
        return Engine3D._current?.height;
    }

    /**
     * Backward-compatible static init.
     * Creates a default Engine3D instance, initializes it, and returns it.
     * Equivalent to: `const engine = new Engine3D(); await engine.init(descriptor);`
     * @deprecated For multi-instance usage create Engine3D instances explicitly.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<Engine3D> {
        const engine = new Engine3D();
        return engine.init(descriptor);
    }

    /** @deprecated Use `engine.startRenderView(view)` instead. */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._current?.startRenderView(view);
    }

    /** @deprecated Use `engine.startRenderViews(views)` instead. */
    public static startRenderViews(views: View3D[]) {
        Engine3D._current?.startRenderViews(views);
    }

    /** @deprecated Use `engine.getRenderJob(view)` instead. */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._current?.getRenderJob(view);
    }

    /** @deprecated Use `engine.pause()` instead. */
    public static pause() {
        Engine3D._current?.pause();
    }

    /** @deprecated Use `engine.resume()` instead. */
    public static resume() {
        Engine3D._current?.resume();
    }

    // -------------------------------------------------------------------------
    // Initialization (instance)
    // -------------------------------------------------------------------------

    /**
     * Initialize this engine instance.
     * Creates its own WebGPU context, per-engine subsystems, and shared shader/pipeline resources.
     */
    public async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}) {
        // Activate this engine so subsystem inits that read Engine3D._current work
        Engine3D._current = this;
        Engine3D_ref._current = this;

        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // Shared WASM matrix pool - initialised only once across all engines
        if (!WasmMatrix['_initialized']) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            (WasmMatrix as any)['_initialized'] = true;
        }

        // Per-engine WebGPU context
        this.context = new Context3D();
        await this.context.init(descriptor.canvasConfig);
        setActiveWebGPUContext(this.context);

        // Pre-compute reflection settings
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Shared shader/pipeline resources (initialised only once)
        if (!ShaderLib['_initialized']) {
            ShaderLib.init();
            (ShaderLib as any)['_initialized'] = true;
        }
        if (!ShaderUtil['_initialized']) {
            ShaderUtil.init();
            (ShaderUtil as any)['_initialized'] = true;
        }

        // Shared bind-group infrastructure (matrix buffer shared, camera maps global)
        GlobalBindGroup.init();

        // Per-engine subsystems
        this.rtResourceMap = new RTResourceMap();
        this._gBufferMap = new Map<string, GBufferFrame>();
        this.entityCollect = new EntityCollect();
        this.componentCollect = new ComponentCollect();

        // Pre-allocate the reflection GBuffer for this engine
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        ShadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context.canvas);

        Engine3D.instances.push(this);
        return this;
    }

    // -------------------------------------------------------------------------
    // Render view management
    // -------------------------------------------------------------------------

    private startRenderJob(view: View3D): RendererJob {
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
     * Set render view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        view.scene.engine = this;
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop.
     */
    public startRenderViews(views: View3D[]) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            views[i].scene.engine = this;
            this.startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the render job for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    // -------------------------------------------------------------------------
    // Frame loop
    // -------------------------------------------------------------------------

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
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
        }
    }

    private async render(time: number) {
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

    private async updateFrame(time: number) {
        // Activate this engine instance for the duration of this frame.
        // All static subsystem proxies (ComponentCollect, EntityCollect,
        // RTResourceMap, GBufferFrame, …) read Engine3D._current to
        // route to the correct per-engine data.
        Engine3D._current = this;
        Engine3D_ref._current = this;
        setActiveWebGPUContext(this.context);

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

        /****** auto before update with component list *****/
        for (const iterator of this.componentCollect.componentsBeforeUpdateList) {
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
        for (const iterator of this.componentCollect.componentsComputeList) {
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

        /****** auto update with component list *****/
        for (const iterator of this.componentCollect.componentsUpdateList) {
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

        for (const iterator of this.componentCollect.graphicComponent) {
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

        /****** auto late update with component list *****/
        for (const iterator of this.componentCollect.componentsLateUpdateList) {
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

// Wire up the lazy back-reference so ComponentCollect static proxy methods
// can call Engine3D._current without triggering a circular-import error.
Engine3D_ref._current = null;
// This assignment runs after both modules are loaded, breaking the cycle.
Object.defineProperty(Engine3D_ref, '_current', {
    get() { return Engine3D._current; },
    set(v) { Engine3D._current = v; },
    configurable: true,
});
