import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time, EngineTime } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, webGPUContext, activateWebGPUContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap } from './gfx/renderJob/frame/RTResourceMap';

import { ForwardRenderJob } from './gfx/renderJob/jobs/ForwardRenderJob';
import { GlobalBindGroup } from './gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { Interpolator } from './math/TimeInterpolator';
import { RendererJob } from './gfx/renderJob/jobs/RendererJob';
import { Res } from './assets/Res';
import { ShaderLib } from './assets/shader/ShaderLib';
import { ShaderUtil } from './gfx/graphics/webGpu/shader/util/ShaderUtil';
import { ComponentCollect } from './gfx/renderJob/collect/ComponentCollect';
import { EntityCollect } from './gfx/renderJob/collect/EntityCollect';
import { ShadowLightsCollect } from './gfx/renderJob/collect/ShadowLightsCollect';
import { WasmMatrix } from '@orillusion/wasm-matrix/WasmMatrix';
import { Matrix4 } from './math/Matrix4';
import { FXAAPost } from './gfx/renderJob/post/FXAAPost';
import { PostProcessingComponent } from './components/post/PostProcessingComponent';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';

/**
 * Orillusion 3D Engine
 *
 * -- Engine3D.setting.*
 *
 * -- await Engine3D.init();
 * @group engine3D
 */
export class Engine3D {

    // === PER-INSTANCE STATE ===

    /**
     * resource manager in engine3d
     */
    public res: Res;

    /**
     * input system in engine3d
     */
    public inputSystem: InputSystem;

    /**
     * views in engine3d
     */
    public views: View3D[];

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * engine setting
     */
    public setting: EngineSetting;

    // Per-engine subsystems
    public webGPUContext: Context3D;
    public componentCollect: ComponentCollect;
    public entityCollect: EntityCollect;
    public globalBindGroup: GlobalBindGroup;
    public rtResourceMap: RTResourceMap;
    public shadowLightsCollect: ShadowLightsCollect;
    public gBufferMap: Map<string, GBufferFrame>;
    public time: EngineTime;

    // Private frame state
    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // === STATIC REGISTRY ===

    private static _current: Engine3D;

    public static get current(): Engine3D {
        return this._current;
    }

    // Static backward-compat proxies

    /**
     * resource manager in engine3d
     */
    public static get res(): Res { return this._current?.res; }
    public static set res(v: Res) { if (this._current) this._current.res = v; }

    /**
     * engine setting
     */
    public static get setting(): EngineSetting { return this._current?.setting; }
    public static set setting(v: EngineSetting) { if (this._current) this._current.setting = v; }

    /**
     * input system in engine3d
     */
    public static get inputSystem(): InputSystem { return this._current?.inputSystem; }

    /**
     * more view in engine3d
     */
    public static get views(): View3D[] { return this._current?.views; }

    /**
     * @internal
     */
    public static get renderJobs(): Map<View3D, RendererJob> { return this._current?.renderJobs; }

    /**
     * get render window size width and height
     */
    public static get size(): number[] { return this._current?.webGPUContext.presentationSize; }

    /**
     * get render window aspect
     */
    public static get aspect(): number { return this._current?.webGPUContext.aspect; }

    /**
     * get render window size width
     */
    public static get width(): number { return this._current?.webGPUContext.windowWidth; }

    /**
     * get render window size height
     */
    public static get height(): number { return this._current?.webGPUContext.windowHeight; }

    /**
     * set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
     */
    public static get frameRate(): number { return this._current?._frameRate ?? 360; }

    /**
     * get engine render frameRate
     */
    public static set frameRate(value: number) { if (this._current) this._current.frameRate = value; }

    // === CONSTRUCTOR ===

    constructor() {
        this.setting = {
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
        this.gBufferMap = new Map();
        this.time = new EngineTime();
    }

    // === INSTANCE GETTERS/SETTERS ===

    get frameRate(): number { return this._frameRate; }
    set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = 1000 / value;
        if (value >= 360) this._frameRateValue = 0;
    }

    get size(): number[] { return this.webGPUContext.presentationSize; }
    get aspect(): number { return this.webGPUContext.aspect; }
    get width(): number { return this.webGPUContext.windowWidth; }
    get height(): number { return this.webGPUContext.windowHeight; }

    // === INSTANCE INIT METHOD ===

    /**
     * create webgpu 3d engine (instance version)
     * @param descriptor  {@link CanvasConfig}
     * @returns
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function; engineSetting?: EngineSetting } = {}) {
        Engine3D._current = this;

        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        this.webGPUContext = new Context3D();
        await this.webGPUContext.init(descriptor.canvasConfig);
        activateWebGPUContext(this.webGPUContext);

        // pre compute setting
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Activate per-engine subsystems
        this.gBufferMap = new Map();
        GBufferFrame.activateMap(this.gBufferMap);

        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        ShaderLib.init();
        ShaderUtil.init();

        this.globalBindGroup = new GlobalBindGroup();
        this.globalBindGroup.init();
        GlobalBindGroup.activate(this.globalBindGroup);

        this.rtResourceMap = new RTResourceMap();
        this.rtResourceMap.init();
        RTResourceMap.activate(this.rtResourceMap);

        this.shadowLightsCollect = new ShadowLightsCollect();
        this.shadowLightsCollect.init();
        ShadowLightsCollect.activate(this.shadowLightsCollect);

        this.componentCollect = new ComponentCollect();
        ComponentCollect.activate(this.componentCollect);

        this.entityCollect = new EntityCollect();
        EntityCollect.activate(this.entityCollect);

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;

        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.webGPUContext.canvas);

        return;
    }

    private startRenderJob(view: View3D): RendererJob {
        view.engine = this;
        if (view.scene) view.scene.engine = this;
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
     * set render view and start renderer (instance version)
     * @param view
     * @returns
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        this._activate();
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * set render views and start renderer (instance version)
     * @param views
     * @returns
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;
        this._activate();
        for (let i = 0; i < views.length; i++) {
            this.startRenderJob(views[i]);
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
            this._requestAnimationFrameID = requestAnimationFrame((t) => this.render(t));
    }

    // Activate this engine as the current active engine
    private _activate(): void {
        Engine3D._current = this;
        activateWebGPUContext(this.webGPUContext);
        GBufferFrame.activateMap(this.gBufferMap);
        GlobalBindGroup.activate(this.globalBindGroup);
        RTResourceMap.activate(this.rtResourceMap);
        ShadowLightsCollect.activate(this.shadowLightsCollect);
        ComponentCollect.activate(this.componentCollect);
        EntityCollect.activate(this.entityCollect);
    }

    /**
     * start engine render
     * @internal
     */
    private async render(time: number): Promise<void> {
        this._activate();  // Reactivate this engine's subsystems for this frame

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
        this.time.delta = time - this.time.time;
        this.time.time = time;
        this.time.frame += 1;

        // Update global Time for backward compat
        Time.delta = this.time.delta;
        Time.time = this.time.time;
        Time.frame = this.time.frame;

        Interpolator.tick(this.time.delta);

        /* update all transform */
        let views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.webGPUContext.presentationSize;
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

        let command = this.webGPUContext.device.createCommandEncoder();
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

        this.webGPUContext.device.queue.submit([command.finish()]);

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

    // === STATIC METHOD PROXIES (backward compat) ===

    /**
     * create webgpu 3d engine
     * @param descriptor  {@link CanvasConfig}
     * @returns
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        if (!this._current) {
            this._current = new Engine3D();
        }
        return this._current.init(descriptor);
    }

    /**
     * set render view and start renderer
     * @param view
     * @returns
     */
    public static startRenderView(view: View3D): RendererJob {
        return this._current.startRenderView(view);
    }

    /**
     * set render views and start renderer
     * @param views
     * @returns
     */
    public static startRenderViews(views: View3D[]): void {
        this._current.startRenderViews(views);
    }

    /**
     * get view render job instance
     * @param view
     * @returns
     */
    public static getRenderJob(view: View3D): RendererJob {
        return this._current.getRenderJob(view);
    }

    /**
     * Pause the engine render
     */
    public static pause(): void {
        this._current.pause();
    }

    /**
     * Resume the engine render
     */
    public static resume(): void {
        this._current.resume();
    }
}
