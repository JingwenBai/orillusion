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
import { setActiveEngineRenderMaps, EngineRenderMaps } from './gfx/renderJob/ActiveEngineContext';
import { RenderTexture } from './textures/RenderTexture';
import { ViewQuad } from './core/ViewQuad';

/** @internal */
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
 * Can be used as a traditional static singleton (existing code continues to
 * work unchanged) **or** instantiated multiple times so that several
 * independent canvases / scenes can run simultaneously on the same page.
 *
 * ### Multi-instance usage
 * ```ts
 * const engine1 = new Engine3D();
 * await engine1.init({ canvasConfig: { canvas: canvas1 } });
 * engine1.startRenderView(view1);
 *
 * const engine2 = new Engine3D();
 * await engine2.init({ canvasConfig: { canvas: canvas2 } });
 * engine2.startRenderView(view2);
 * ```
 *
 * ### Classic single-instance usage (unchanged)
 * ```ts
 * await Engine3D.init();
 * Engine3D.startRenderView(view);
 * ```
 *
 * -- Engine3D.setting.*
 * @group engine3D
 */
export class Engine3D {

    // ─────────────────────────────────────────────────────────────────────────
    // Static backward-compatibility layer
    //
    // All static members below delegate to the most-recently initialised
    // Engine3D instance (_defaultInstance), so existing code that calls
    // Engine3D.init() / Engine3D.setting / … continues to work without
    // any modifications.
    // ─────────────────────────────────────────────────────────────────────────

    /** @internal Last initialised engine instance (used by the static API). */
    private static _defaultInstance: Engine3D;

    /** resource manager in engine3d */
    public static get res(): Res { return Engine3D._defaultInstance?.res; }

    /** input system in engine3d */
    public static get inputSystem(): InputSystem { return Engine3D._defaultInstance?.inputSystem; }

    /** active views in engine3d */
    public static get views(): View3D[] { return Engine3D._defaultInstance?.views; }

    /** @internal */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._defaultInstance?.renderJobs; }

    /** engine setting */
    public static get setting(): EngineSetting { return Engine3D._defaultInstance?.setting; }
    public static set setting(v: EngineSetting) {
        if (Engine3D._defaultInstance) Engine3D._defaultInstance.setting = v;
    }

    public static get frameRate(): number { return Engine3D._defaultInstance?._frameRate ?? 360; }
    public static set frameRate(value: number) {
        if (Engine3D._defaultInstance) Engine3D._defaultInstance.frameRate = value;
    }

    public static get size(): number[] { return Engine3D._defaultInstance?.size; }
    public static get aspect(): number { return Engine3D._defaultInstance?.aspect; }
    public static get width(): number { return Engine3D._defaultInstance?.width; }
    public static get height(): number { return Engine3D._defaultInstance?.height; }

    /**
     * create webgpu 3d engine (static convenience method – creates a default
     * Engine3D instance automatically).
     */
    public static async init(
        descriptor: {
            canvasConfig?: CanvasConfig;
            beforeRender?: Function;
            renderLoop?: Function;
            lateRender?: Function;
            engineSetting?: EngineSetting;
        } = {}
    ): Promise<void> {
        Engine3D._defaultInstance = new Engine3D();
        await Engine3D._defaultInstance.init(descriptor);
    }

    /** set render view and start renderer */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._defaultInstance.startRenderView(view);
    }

    /** set render views and start renderer */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._defaultInstance.startRenderViews(views);
    }

    /** get view render job instance */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._defaultInstance.getRenderJob(view);
    }

    /** Pause the engine render */
    public static pause(): void { Engine3D._defaultInstance?.pause(); }

    /** Resume the engine render */
    public static resume(): void { Engine3D._defaultInstance?.resume(); }


    // ─────────────────────────────────────────────────────────────────────────
    // Instance members
    // ─────────────────────────────────────────────────────────────────────────

    /** resource manager */
    public res: Res;

    /** input system */
    public inputSystem: InputSystem;

    /** active views */
    public views: View3D[];

    /** @internal */
    public renderJobs: Map<View3D, RendererJob>;

    /** per-engine engine setting */
    public setting: EngineSetting = createDefaultSetting();

    /** @internal WebGPU canvas context owned by this engine instance */
    public context: Context3D;

    private _renderMaps: EngineRenderMaps;
    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    public get size(): number[] { return this.context?.presentationSize; }
    public get aspect(): number { return this.context?.aspect; }
    public get width(): number { return this.context?.windowWidth; }
    public get height(): number { return this.context?.windowHeight; }

    /**
     * Swap the module-level singletons so that this engine instance is the
     * "current" one.  Must be called before any GPU work or resource lookup
     * that depends on per-engine state.
     * @internal
     */
    private _activate(): void {
        setActiveWebGPUContext(this.context);
        setActiveEngineRenderMaps(this._renderMaps);
        // Keep the static shortcut up-to-date with the most-recently active engine.
        Engine3D._defaultInstance = this;
    }

    /**
     * Initialise the engine.  May be called on a plain `new Engine3D()`
     * instance (multi-instance mode) or implicitly through the static
     * `Engine3D.init()` helper (classic single-instance mode).
     */
    public async init(
        descriptor: {
            canvasConfig?: CanvasConfig;
            beforeRender?: Function;
            renderLoop?: Function;
            lateRender?: Function;
            engineSetting?: EngineSetting;
        } = {}
    ): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // Create this instance's per-engine render maps.
        this._renderMaps = {
            rtTextureMap: new Map<string, RenderTexture>(),
            rtViewQuad: new Map<string, ViewQuad>(),
            gBufferMap: new Map<string, any>(),
        };

        // Create and initialise this instance's canvas context.
        this.context = new Context3D();

        // Activate before any GPU work so that webGPUContext / activeEngineRenderMaps
        // point to this engine's state.
        this._activate();

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        await this.context.init(descriptor.canvasConfig);

        // Activate again after context.init() in case another async init ran
        // concurrently (unlikely but defensive).
        this._activate();

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
        this.inputSystem.initCanvas(this.context.canvas);
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
     * set render view and start renderer
     */
    public startRenderView(view: View3D): RendererJob {
        this._activate();
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * set render views and start renderer
     */
    public startRenderViews(views: View3D[]): void {
        this._activate();
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * get view render job instance
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
    }

    /**
     * Pause the engine render
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the engine render
     */
    public resume(): void {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
    }

    /** @internal */
    private async _render(time: number): Promise<void> {
        // Ensure all module-level singletons point to this engine before rendering.
        this._activate();

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

        // Only iterate the views that belong to this engine instance.
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const beforeList = ComponentCollect.componentsBeforeUpdateList.get(view);
            if (beforeList) {
                for (const [comp, call] of beforeList) {
                    if (comp.enable) call(view);
                }
            }
        }

        let command = webGPUContext.device.createCommandEncoder();

        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const computeList = ComponentCollect.componentsComputeList.get(view);
            if (computeList) {
                for (const [comp, call] of computeList) {
                    if (comp.enable) call(view, command);
                }
            }
        }

        webGPUContext.device.queue.submit([command.finish()]);

        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const updateList = ComponentCollect.componentsUpdateList.get(view);
            if (updateList) {
                for (const [comp, call] of updateList) {
                    if (comp.enable) call(view);
                }
            }
        }

        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const graphicList = ComponentCollect.graphicComponent.get(view);
            if (graphicList) {
                for (const [comp, call] of graphicList) {
                    if (comp && comp.enable) call(view);
                }
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);
        /* auto update global matrix share buffer write to gpu */
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        /* auto late update with component list */
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            const lateList = ComponentCollect.componentsLateUpdateList.get(view);
            if (lateList) {
                for (const [comp, call] of lateList) {
                    if (comp.enable) call(view);
                }
            }
        }

        if (this._lateRender)
            await this._lateRender();
    }
}
