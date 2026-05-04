import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap, setActiveRTResourceMap } from './gfx/renderJob/frame/RTResourceMap';

import { ForwardRenderJob } from './gfx/renderJob/jobs/ForwardRenderJob';
import { GlobalBindGroup, setActiveGlobalBindGroup } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GBufferFrame, setActiveGBufferMap } from './gfx/renderJob/frame/GBufferFrame';
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
 * Orillusion 3D Engine
 *
 * Can be used as an instantiatable class for multi-instance support:
 * ```ts
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig: { canvas: myCanvas } });
 * engine.startRenderView(view);
 * ```
 *
 * The legacy static API is preserved for single-instance backwards compatibility:
 * ```ts
 * await Engine3D.init();
 * Engine3D.startRenderView(view);
 * ```
 *
 * -- Engine3D.setting.*
 * -- await Engine3D.init();
 * @group engine3D
 */
export class Engine3D {

    // ─── Static backward-compat infrastructure ──────────────────────────────

    /**
     * The most recently initialised Engine3D instance.
     * All static accessor/method proxies delegate to this instance.
     */
    private static _active: Engine3D = new Engine3D();

    /** Guard: WasmMatrix and shader systems only need one-time global init. */
    private static _globalInitDone: boolean = false;

    // ─── Static backward-compat accessors ────────────────────────────────────

    /** @see {@link Engine3D.prototype.res} */
    public static get res(): Res { return Engine3D._active.res; }

    /** @see {@link Engine3D.prototype.inputSystem} */
    public static get inputSystem(): InputSystem { return Engine3D._active.inputSystem; }

    /** @see {@link Engine3D.prototype.views} */
    public static get views(): View3D[] { return Engine3D._active.views; }

    /** @see {@link Engine3D.prototype.renderJobs} */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._active.renderJobs; }

    /** @see {@link Engine3D.prototype.setting} */
    public static get setting(): EngineSetting { return Engine3D._active.setting; }

    /** @see {@link Engine3D.prototype.frameRate} */
    public static get frameRate(): number { return Engine3D._active.frameRate; }
    public static set frameRate(value: number) { Engine3D._active.frameRate = value; }

    /** @see {@link Engine3D.prototype.size} */
    public static get size(): number[] { return Engine3D._active.size; }

    /** @see {@link Engine3D.prototype.aspect} */
    public static get aspect(): number { return Engine3D._active.aspect; }

    /** @see {@link Engine3D.prototype.width} */
    public static get width(): number { return Engine3D._active.width; }

    /** @see {@link Engine3D.prototype.height} */
    public static get height(): number { return Engine3D._active.height; }

    // ─── Static backward-compat methods ──────────────────────────────────────

    /**
     * Create and initialise the default Engine3D instance (single-engine API).
     * For multi-instance use, call `new Engine3D()` then `engine.init()` instead.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        const engine = new Engine3D();
        Engine3D._active = engine;
        await engine.init(descriptor);
    }

    /** @see {@link Engine3D.prototype.startRenderView} */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._active.startRenderView(view);
    }

    /** @see {@link Engine3D.prototype.startRenderViews} */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._active.startRenderViews(views);
    }

    /** @see {@link Engine3D.prototype.getRenderJob} */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._active.getRenderJob(view);
    }

    /** @see {@link Engine3D.prototype.pause} */
    public static pause(): void {
        Engine3D._active.pause();
    }

    /** @see {@link Engine3D.prototype.resume} */
    public static resume(): void {
        Engine3D._active.resume();
    }

    // ─── Instance state ──────────────────────────────────────────────────────

    /**
     * Resource manager for this engine instance.
     */
    public res: Res;

    /**
     * Input system for this engine instance.
     */
    public inputSystem: InputSystem;

    /**
     * Active views for this engine instance.
     */
    public views: View3D[];

    /**
     * The WebGPU context (canvas + device wrapper) owned by this instance.
     */
    public context3D: Context3D;

    /**
     * Per-engine render target resource pool.
     */
    public rtResourceMap: RTResourceMap;

    /**
     * Per-engine GPU bind group state (cameras, lights, matrix buffer).
     */
    public globalBindGroup: GlobalBindGroup;

    /**
     * Per-engine G-buffer frame cache.
     */
    public gBufferMap: Map<string, GBufferFrame>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * Per-instance engine settings. Mutate before or after init.
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

    // ─── Instance getters ─────────────────────────────────────────────────────

    /**
     * Set render frame rate (e.g. 24/30/60/120/144/240/360).
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

    /** Render window size [width, height]. */
    public get size(): number[] {
        return this.context3D.presentationSize;
    }

    /** Render window aspect ratio. */
    public get aspect(): number {
        return this.context3D.aspect;
    }

    /** Render window width in pixels. */
    public get width(): number {
        return this.context3D.windowWidth;
    }

    /** Render window height in pixels. */
    public get height(): number {
        return this.context3D.windowHeight;
    }

    // ─── Instance methods ─────────────────────────────────────────────────────

    /**
     * Initialise this engine instance.
     *
     * @param descriptor  Init options (canvas, callbacks, settings override).
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

        // This instance becomes the active one for static API usage.
        Engine3D._active = this;

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // WasmMatrix is a global WASM module – only initialise it once.
        if (!Engine3D._globalInitDone) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // ── Per-instance WebGPU context (canvas + GPU canvas context) ─────────
        this.context3D = new Context3D();
        setActiveContext(this.context3D);
        await this.context3D.init(descriptor.canvasConfig);

        // ── Per-instance rendering subsystems ────────────────────────────────
        this.globalBindGroup = new GlobalBindGroup();
        this.globalBindGroup.init();
        setActiveGlobalBindGroup(this.globalBindGroup);

        this.rtResourceMap = new RTResourceMap();
        setActiveRTResourceMap(this.rtResourceMap);

        this.gBufferMap = new Map<string, GBufferFrame>();
        setActiveGBufferMap(this.gBufferMap);

        // Pre-compute reflection GBuffer (uses active context + rtResourceMap).
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // ── Global one-time init (shaders, shadow collect) ────────────────────
        if (!Engine3D._globalInitDone) {
            ShaderLib.init();
            ShaderUtil.init();
            Engine3D._globalInitDone = true;
        }

        ShadowLightsCollect.init();

        // ── Resources ─────────────────────────────────────────────────────────
        this.res = new Res();
        this.res.initDefault();

        // ── Callbacks + input ─────────────────────────────────────────────────
        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context3D.canvas);
    }

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
     * Set the render view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this.startRenderJob(views[i]);
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
     * Pause the render loop for this engine instance.
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume (or start) the render loop for this engine instance.
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
        }
    }

    private async render(time: number): Promise<void> {
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
        // Activate this engine's per-instance subsystems so that all static
        // calls made by components, render passes, etc. operate on the correct
        // engine's state during this frame.
        setActiveContext(this.context3D);
        setActiveGlobalBindGroup(this.globalBindGroup);
        setActiveRTResourceMap(this.rtResourceMap);
        setActiveGBufferMap(this.gBufferMap);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        let views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.context3D.presentationSize;
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

        let command = this.context3D.device.createCommandEncoder();
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

        this.context3D.device.queue.submit([command.finish()]);

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
        this.globalBindGroup.modelMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

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
