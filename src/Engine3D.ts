import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { webGPUContext } from './gfx/graphics/webGpu/Context3D';
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

/**
 * Orillusion 3D Engine
 *
 * ### Single-instance (backward-compatible) usage:
 * ```
 * await Engine3D.init({ canvasConfig });
 * Engine3D.startRenderView(view);
 * ```
 *
 * ### Multi-instance usage:
 * ```
 * const engine = new Engine3D();
 * await engine.init({ canvasConfig });
 * engine.startRenderView(view);
 * ```
 * @group engine3D
 */
export class Engine3D {

    // ── Instance state ────────────────────────────────────────────────────────

    /**
     * resource manager for this engine instance
     */
    public res: Res;

    /**
     * input system for this engine instance
     */
    public inputSystem: InputSystem;

    /**
     * active render views for this engine instance
     */
    public views: View3D[];

    /**
     * per-engine GPU / device context
     */
    public engineContext: EngineContext;

    /**
     * engine settings for this instance
     */
    public setting: EngineSetting = Engine3D._defaultSetting();

    /**
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

    // ── Static backward-compat API (delegates to active/default instance) ────

    /** @internal Default singleton — created by Engine3D.init() */
    private static _default: Engine3D;

    /**
     * @internal Currently-rendering engine instance.
     * Set at the start of each frame so static accessors like `Engine3D.setting`
     * return the right values even in multi-engine scenarios.
     */
    public static _current: Engine3D;

    /** @deprecated Use instance property. Returns current/default engine's res. */
    public static get res(): Res { return (this._current ?? this._default)?.res; }
    /** @deprecated Use instance property. */
    public static get inputSystem(): InputSystem { return (this._current ?? this._default)?.inputSystem; }
    /** @deprecated Use instance property. */
    public static get views(): View3D[] { return (this._current ?? this._default)?.views; }
    /** @deprecated Use instance property. */
    public static get renderJobs(): Map<View3D, RendererJob> { return (this._current ?? this._default)?.renderJobs; }
    /**
     * Returns the setting of whichever engine is currently rendering.
     * Falls back to the default engine when called outside of a frame.
     */
    public static get setting(): EngineSetting { return (this._current ?? this._default)?.setting; }
    /** @deprecated Use instance property. */
    public static set setting(v: EngineSetting) {
        const target = this._current ?? this._default;
        if (target) target.setting = v;
    }

    /**
     * set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
     */
    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    /** @deprecated Static accessor — delegates to default instance */
    public static get frameRate(): number { return this._default?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (this._default) this._default.frameRate = value; }

    /**
     * get render window size width and height
     */
    public get size(): number[] { return webGPUContext.presentationSize; }
    public static get size(): number[] { return this._default?.size; }

    public get aspect(): number { return webGPUContext.aspect; }
    public static get aspect(): number { return this._default?.aspect; }

    public get width(): number { return webGPUContext.windowWidth; }
    public static get width(): number { return this._default?.width; }

    public get height(): number { return webGPUContext.windowHeight; }
    public static get height(): number { return this._default?.height; }

    // ── Static init (backward-compat entry point) ─────────────────────────────

    /**
     * Create the default engine and initialize WebGPU.
     * This is the standard single-instance entry point.
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        this._default = new Engine3D();
        return this._default.init(descriptor);
    }

    /**
     * set render view and start renderer (static — uses default instance)
     */
    public static startRenderView(view: View3D) {
        return this._default.startRenderView(view);
    }

    /**
     * set render views and start renderer (static — uses default instance)
     */
    public static startRenderViews(views: View3D[]) {
        return this._default.startRenderViews(views);
    }

    /**
     * get view render job instance (static — uses default instance)
     */
    public static getRenderJob(view: View3D): RendererJob {
        return this._default?.getRenderJob(view);
    }

    /**
     * Pause the engine render (static — uses default instance)
     */
    public static pause() { this._default?.pause(); }

    /**
     * Resume the engine render (static — uses default instance)
     */
    public static resume() { this._default?.resume(); }

    // ── Instance methods ──────────────────────────────────────────────────────

    /**
     * Initialize this engine instance with a dedicated WebGPU device and canvas.
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

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        // Create and initialise the per-engine GPU context
        this.engineContext = new EngineContext();
        await this.engineContext.initWebGPU(descriptor.canvasConfig);

        // Activate: sets all static GPU-helper references to this engine's instances
        this.engineContext.activate();

        //****pre compute reflection setting****/
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );
        //****pre compute reflection setting****/

        ShaderLib.init();
        GlobalBindGroup.init();
        RTResourceMap.init();
        ShadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.engineContext.webGPUContext.canvas);
    }

    private _startRenderJob(view: View3D): RendererJob {
        // Ensure this engine is active before creating GPU resources
        this.engineContext.activate();

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
     * Set render view and start renderer
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start renderer
     */
    public startRenderViews(views: View3D[]) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * Get the render job for a specific view
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
    }

    /**
     * Pause this engine's render loop
     */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume this engine's render loop
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
        // Mark this engine as the currently-rendering engine so static getters work correctly
        Engine3D._current = this;
        // Activate this engine's GPU context for the duration of this frame
        this.engineContext.activate();

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
            let [w, h] = webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        /****** auto before update — only for this engine's views *****/
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const viewComponents = ComponentCollect.componentsBeforeUpdateList?.get(view);
            if (viewComponents) {
                for (const [component, callback] of viewComponents) {
                    if (component.enable) callback(view);
                }
            }
        }

        let command = webGPUContext.device.createCommandEncoder();
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const viewComponents = ComponentCollect.componentsComputeList?.get(view);
            if (viewComponents) {
                for (const [component, callback] of viewComponents) {
                    if (component.enable) callback(view, command);
                }
            }
        }
        webGPUContext.device.queue.submit([command.finish()]);

        /****** auto update — only for this engine's views *****/
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const viewComponents = ComponentCollect.componentsUpdateList?.get(view);
            if (viewComponents) {
                for (const [component, callback] of viewComponents) {
                    if (component.enable) callback(view);
                }
            }
        }

        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const viewComponents = ComponentCollect.graphicComponent?.get(view);
            if (viewComponents) {
                for (const [component, callback] of viewComponents) {
                    if (view && component.enable) callback(view);
                }
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        /****** auto update global matrix share buffer write to gpu *****/
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        /****** auto late update — only for this engine's views *****/
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const viewComponents = ComponentCollect.componentsLateUpdateList?.get(view);
            if (viewComponents) {
                for (const [component, callback] of viewComponents) {
                    if (component.enable) callback(view);
                }
            }
        }

        if (this._lateRender)
            await this._lateRender();

        // Clear current-engine marker after the frame completes
        if (Engine3D._current === this) Engine3D._current = null;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static _defaultSetting(): EngineSetting {
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
}
