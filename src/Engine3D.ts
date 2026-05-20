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
import { EngineContext } from './core/EngineContext';

const _defaultSetting: EngineSetting = {
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
 * Supports multiple independent instances — each Engine3D owns its own
 * WebGPU canvas context, resource manager, and render pipeline.
 *
 * Single-instance (backward-compatible):
 * ```ts
 * await Engine3D.init({ canvasConfig: { canvas } });
 * Engine3D.startRenderView(view);
 * ```
 *
 * Multi-instance:
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

    // ─── Static registry & backward-compatible shims ──────────────────────────

    /**
     * All active Engine3D instances.
     */
    public static readonly instances: Engine3D[] = [];

    /**
     * The engine that is currently executing its render loop.
     * Updated automatically before each engine renders its frame.
     */
    public static get current(): Engine3D {
        return EngineContext.current as Engine3D;
    }

    /**
     * Pre-init setting object — available before any Engine3D is created so
     * that call-sites that modify Engine3D.setting before Engine3D.init() work
     * exactly as before (backward compat).  The static Engine3D.init() copies
     * this object into the newly created engine instance.
     * @internal
     */
    private static _preInitSetting: EngineSetting = JSON.parse(JSON.stringify(_defaultSetting));

    static {
        // Restore the Color instance that JSON.parse cannot reproduce.
        Engine3D._preInitSetting.render.postProcessing.globalFog.fogColor =
            new Color(96 / 255, 117 / 255, 133 / 255, 1);
        Engine3D._preInitSetting.sky.sky = null;
    }

    // Static getters/setters forward to Engine3D.current for
    // backward compatibility with single-instance call-sites.

    /**
     * Engine settings.  Before Engine3D.init() this returns the pre-init
     * shared setting; afterwards it forwards to the current engine instance.
     */
    public static get setting(): EngineSetting {
        return Engine3D.current?.setting ?? Engine3D._preInitSetting;
    }
    public static set setting(v: EngineSetting) {
        if (Engine3D.current) {
            Engine3D.current.setting = v;
        } else {
            Engine3D._preInitSetting = v;
        }
    }

    /** @deprecated Use instance property instead. */
    public static get res(): Res { return Engine3D.current?.res; }

    /** @deprecated Use instance property instead. */
    public static get inputSystem(): InputSystem { return Engine3D.current?.inputSystem; }

    /** @deprecated Use instance property instead. */
    public static get views(): View3D[] { return Engine3D.current?.views; }
    /** @deprecated Use instance property instead. */
    public static set views(v: View3D[]) { if (Engine3D.current) Engine3D.current.views = v; }

    /** @deprecated Use instance property instead. */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D.current?.renderJobs; }

    /** @deprecated Use instance property instead. */
    public static get frameRate(): number { return Engine3D.current?.frameRate; }
    /** @deprecated Use instance property instead. */
    public static set frameRate(v: number) { if (Engine3D.current) Engine3D.current.frameRate = v; }

    /** @deprecated Use instance property instead. */
    public static get size(): number[] { return Engine3D.current?.size; }
    /** @deprecated Use instance property instead. */
    public static get aspect(): number { return Engine3D.current?.aspect; }
    /** @deprecated Use instance property instead. */
    public static get width(): number { return Engine3D.current?.width; }
    /** @deprecated Use instance property instead. */
    public static get height(): number { return Engine3D.current?.height; }

    /**
     * Convenience static init — creates a new Engine3D instance that inherits
     * any settings already applied to Engine3D.setting, then sets it as the
     * current instance.  Equivalent to `new Engine3D().init(descriptor)`.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<Engine3D> {
        const engine = new Engine3D();
        // Merge in any pre-init settings the caller may have applied via
        // Engine3D.setting.xxx = value before calling Engine3D.init().
        engine.setting = { ...Engine3D._preInitSetting, ...descriptor.engineSetting };
        // Restore non-JSON-serialisable objects after the spread.
        engine.setting.sky.sky = Engine3D._preInitSetting.sky.sky;
        engine.setting.render.postProcessing.globalFog.fogColor =
            Engine3D._preInitSetting.render.postProcessing.globalFog.fogColor;
        await engine.init(descriptor);
        return engine;
    }

    /** @deprecated Use instance method instead. */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D.current.startRenderView(view);
    }

    /** @deprecated Use instance method instead. */
    public static startRenderViews(views: View3D[]): void {
        Engine3D.current.startRenderViews(views);
    }

    /** @deprecated Use instance method instead. */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D.current?.getRenderJob(view);
    }

    /** @deprecated Use instance method instead. */
    public static pause(): void { Engine3D.current?.pause(); }

    /** @deprecated Use instance method instead. */
    public static resume(): void { Engine3D.current?.resume(); }

    // ─── Instance members ─────────────────────────────────────────────────────

    /**
     * WebGPU context owned by this engine instance.
     */
    public gpuContext: Context3D;

    /**
     * Resource manager for this engine instance.
     */
    public res: Res;

    /**
     * Input system bound to this engine's canvas.
     */
    public inputSystem: InputSystem;

    /**
     * Active views being rendered by this engine.
     */
    public views: View3D[] = [];

    /**
     * Engine settings for this instance.
     */
    public setting: EngineSetting;

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob> = new Map();

    private _frameRate: number = 360;
    private _frameRateValue: number = 0;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        // Deep-clone the default setting so each instance is independent.
        this.setting = JSON.parse(JSON.stringify(_defaultSetting));
        // Re-create the Color object lost by JSON round-trip.
        const fog = this.setting.render.postProcessing.globalFog;
        fog.fogColor = new Color(96 / 255, 117 / 255, 133 / 255, 1);
        // sky.sky is a texture reference — keep null by default.
        this.setting.sky.sky = null;
    }

    /**
     * Target frames per second for this engine's render loop.
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

    /** Presentation size [width, height] in physical pixels. */
    public get size(): number[] {
        return this.gpuContext.presentationSize;
    }

    /** Canvas aspect ratio (width / height). */
    public get aspect(): number {
        return this.gpuContext.aspect;
    }

    /** Canvas width in physical pixels. */
    public get width(): number {
        return this.gpuContext.windowWidth;
    }

    /** Canvas height in physical pixels. */
    public get height(): number {
        return this.gpuContext.windowHeight;
    }

    /**
     * Initialize this engine instance: set up WebGPU, shaders, resources.
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

        // Apply descriptor overrides only when called directly (not via static init
        // which already merged _preInitSetting + descriptor.engineSetting before
        // constructing the engine).
        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // Register this instance and make it the active one.
        Engine3D.instances.push(this);
        this._activate();

        // WasmMatrix is a page-level WASM module — only initialise once.
        if (!(WasmMatrix as any).inited) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            (WasmMatrix as any).inited = true;
        }

        await this.gpuContext.init(descriptor.canvasConfig);

        //****pre compute setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );
        //****pre compute setting****/

        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        RTResourceMap.init();
        ShadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.gpuContext.canvas);
    }

    /**
     * Set a single view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this._activate();
        this.views = [view];
        const renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple views and start the render loop.
     */
    public startRenderViews(views: View3D[]): void {
        this._activate();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the RendererJob associated with a view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause the render loop.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the render loop.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Make this engine the globally active one: update EngineContext and swap
     * the webGPUContext proxy to point at this engine's Context3D.
     */
    private _activate(): void {
        EngineContext.current = this;
        if (!this.gpuContext) {
            this.gpuContext = new Context3D();
        }
        setActiveWebGPUContext(this.gpuContext);
    }

    private _startRenderJob(view: View3D): RendererJob {
        const renderJob = new ForwardRenderJob(view);
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

    private async _render(time: number): Promise<void> {
        // Restore this engine as active before doing any GPU work.
        this._activate();

        if (this._frameRateValue > 0) {
            const delta = time - this._time;
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
        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this.gpuContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        /****** before update *****/
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

        let command = this.gpuContext.device.createCommandEncoder();
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

        this.gpuContext.device.queue.submit([command.finish()]);

        /****** update *****/
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
        /****** write transform matrix to GPU *****/
        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        /****** late update *****/
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
