import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveWebGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { EntityCollect } from './gfx/renderJob/collect/EntityCollect';
import { GPUContext } from './gfx/renderJob/GPUContext';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';

/**
 * Orillusion 3D Engine
 *
 * Supports multiple instances running simultaneously on the same page,
 * each with its own canvas, scene, and render loop.
 *
 * -- engine.setting.*
 *
 * -- const engine = new Engine3D(); await engine.init();
 * @group engine3D
 */
export class Engine3D {

    /** Registry of all active engine instances */
    public static readonly instances: Engine3D[] = [];

    /** The most-recently activated engine instance (set by activate()) */
    private static _current: Engine3D;

    /** Whether shared one-time resources (WASM, ShaderLib, ShaderUtil) have been initialized */
    private static _sharedInitDone: boolean = false;

    // -----------------------------------------------------------------------
    // Static compatibility delegates — forward to the currently active instance
    // -----------------------------------------------------------------------

    /** @deprecated Use instance.res instead */
    public static get res(): Res { return Engine3D._current?.res; }
    /** @deprecated Use instance.res instead */
    public static set res(v: Res) { if (Engine3D._current) Engine3D._current.res = v; }

    /** @deprecated Use instance.inputSystem instead */
    public static get inputSystem(): InputSystem { return Engine3D._current?.inputSystem; }
    /** @deprecated Use instance.inputSystem instead */
    public static set inputSystem(v: InputSystem) { if (Engine3D._current) Engine3D._current.inputSystem = v; }

    /** @deprecated Use instance.views instead */
    public static get views(): View3D[] { return Engine3D._current?.views; }
    /** @deprecated Use instance.views instead */
    public static set views(v: View3D[]) { if (Engine3D._current) Engine3D._current.views = v; }

    /** @deprecated Use instance.renderJobs instead */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._current?.renderJobs; }
    /** @deprecated Use instance.renderJobs instead */
    public static set renderJobs(v: Map<View3D, RendererJob>) { if (Engine3D._current) Engine3D._current.renderJobs = v; }

    /** @deprecated Use instance.setting instead */
    public static get setting(): EngineSetting { return Engine3D._current?.setting; }
    /** @deprecated Use instance.setting instead */
    public static set setting(v: EngineSetting) { if (Engine3D._current) Engine3D._current.setting = v; }

    /** @deprecated Use instance.size instead */
    public static get size(): number[] { return Engine3D._current?.context3D.presentationSize; }

    /** @deprecated Use instance.aspect instead */
    public static get aspect(): number { return Engine3D._current?.context3D.aspect; }

    /** @deprecated Use instance.width instead */
    public static get width(): number { return Engine3D._current?.context3D.windowWidth; }

    /** @deprecated Use instance.height instead */
    public static get height(): number { return Engine3D._current?.context3D.windowHeight; }

    /** @deprecated Use instance.frameRate instead */
    public static get frameRate(): number { return Engine3D._current?._frameRate ?? 360; }
    /** @deprecated Use instance.frameRate instead */
    public static set frameRate(value: number) { if (Engine3D._current) Engine3D._current.frameRate = value; }

    /** @deprecated Use instance.init() instead */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        const engine = new Engine3D();
        await engine.init(descriptor);
        return engine;
    }

    /** @deprecated Use instance.startRenderView() instead */
    public static startRenderView(view: View3D) {
        return Engine3D._current?.startRenderView(view);
    }

    /** @deprecated Use instance.startRenderViews() instead */
    public static startRenderViews(views: View3D[]) {
        Engine3D._current?.startRenderViews(views);
    }

    /** @deprecated Use instance.getRenderJob() instead */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._current?.getRenderJob(view);
    }

    /** @deprecated Use instance.pause() instead */
    public static pause() {
        Engine3D._current?.pause();
    }

    /** @deprecated Use instance.resume() instead */
    public static resume() {
        Engine3D._current?.resume();
    }

    // ---- Per-instance public API ----

    /**
     * resource manager for this engine instance
     */
    public res: Res;

    /**
     * input system for this engine instance
     */
    public inputSystem: InputSystem;

    /**
     * views being rendered by this engine instance
     */
    public views: View3D[];

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * engine settings
     */
    public setting: EngineSetting;

    // ---- Per-instance subsystems ----

    /** @internal WebGPU context (canvas + device) for this instance */
    public context3D: Context3D;

    /** @internal Component update collection for this instance */
    public componentCollect: ComponentCollect;

    /** @internal Global GPU bind groups for this instance */
    public globalBindGroup: GlobalBindGroup;

    /** @internal Render texture resource map for this instance */
    public rtResourceMap: RTResourceMap;

    /** @internal Shadow light collection for this instance */
    public shadowLightsCollect: ShadowLightsCollect;

    /** @internal GPU context (command encoder state) for this instance */
    public gpuContext: GPUContext;

    /** @internal Entity/render node collection for this instance */
    public entityCollect: EntityCollect;

    /** @internal Per-instance GBuffer frame map */
    public gBufferMap: Map<string, GBufferFrame>;

    // ---- Private render loop state ----

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _frameTime: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.setting = Engine3D._createDefaultSetting();
        this.gBufferMap = new Map<string, GBufferFrame>();
        Engine3D.instances.push(this);
    }

    /**
     * set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
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

    /**
     * get render window size width and height
     */
    public get size(): number[] {
        return this.context3D.presentationSize;
    }

    /**
     * get render window aspect
     */
    public get aspect(): number {
        return this.context3D.aspect;
    }

    /**
     * get render window size width
     */
    public get width(): number {
        return this.context3D.windowWidth;
    }

    /**
     * get render window size height
     */
    public get height(): number {
        return this.context3D.windowHeight;
    }

    /**
     * Activate this engine instance as the current one.
     * Sets module-level singleton references to this instance's subsystems.
     * Called automatically before each render frame.
     * @internal
     */
    public activate() {
        Engine3D._current = this;
        setActiveWebGPUContext(this.context3D);
        ComponentCollect.setCurrentInstance(this.componentCollect);
        GlobalBindGroup.setCurrentInstance(this.globalBindGroup);
        RTResourceMap.setCurrentInstance(this.rtResourceMap);
        ShadowLightsCollect.setCurrentInstance(this.shadowLightsCollect);
        GPUContext.setCurrentInstance(this.gpuContext);
        EntityCollect.setCurrentInstance(this.entityCollect);
        GBufferFrame.setCurrentGBufferMap(this.gBufferMap);
    }

    /**
     * Create webGPU 3D engine instance
     * @param descriptor  {@link CanvasConfig}
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)')
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        // Initialize shared one-time resources (WASM matrix math + shaders)
        if (!Engine3D._sharedInitDone) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // Create this instance's WebGPU context (canvas + device, device is shared)
        this.context3D = new Context3D();
        await this.context3D.init(descriptor.canvasConfig);

        // Mark shared init done after first successful context init
        if (!Engine3D._sharedInitDone) {
            ShaderLib.init();
            ShaderUtil.init();
            Engine3D._sharedInitDone = true;
        }

        // Create per-instance subsystems
        this.componentCollect = new ComponentCollect();
        this.globalBindGroup = new GlobalBindGroup();
        this.rtResourceMap = new RTResourceMap();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.gpuContext = new GPUContext();
        this.entityCollect = new EntityCollect();
        this.gBufferMap = new Map<string, GBufferFrame>();

        // Activate this instance as the current one
        this.activate();

        // Initialize per-instance subsystems (they use the now-active webGPUContext etc.)
        this.globalBindGroup.init();
        this.rtResourceMap.init();
        this.shadowLightsCollect.init();

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

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.context3D.canvas);
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
     * set render view and start renderer
     * @param view
     * @returns
     */
    public startRenderView(view: View3D) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        this.activate();
        let renderJob = this._startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * set render views and start renderer
     * @param views
     * @returns
     */
    public startRenderViews(views: View3D[]) {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        this.activate();
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this.resume();
    }

    /**
     * get view render job instance
     * @param view
     * @returns
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs.get(view);
    }

    /**
     * Pause the engine render
     */
    public pause() {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume the engine render
     */
    public resume() {
        if (this._requestAnimationFrameID === 0)
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
    }

    /**
     * start engine render
     * @internal
     */
    private async _render(time: number) {
        if (this._frameRateValue > 0) {
            let delta = time - this._frameTime;
            if (delta < this._frameRateValue) {
                let t = performance.now()
                await new Promise(res => {
                    setTimeout(() => {
                        time += (performance.now() - t)
                        res(true)
                    }, this._frameRateValue - delta)
                })
            }
            this._frameTime = time;
        }
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number) {
        // Activate this engine's subsystems as the current active ones
        this.activate();

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
            let [w, h] = this.context3D.presentationSize;
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

        let command = this.context3D.device.createCommandEncoder();
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

        this.context3D.device.queue.submit([command.finish()]);

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

    // -----------------------------------------------------------------------
    // Static default setting factory
    // -----------------------------------------------------------------------

    private static _createDefaultSetting(): EngineSetting {
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
