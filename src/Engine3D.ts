import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { Context3D, setActiveContext } from './gfx/graphics/webGpu/Context3D';
import { RTResourceMap } from './gfx/renderJob/frame/RTResourceMap';
import { GBufferFrame } from './gfx/renderJob/frame/GBufferFrame';

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

/**
 * Orillusion 3D Engine
 *
 * Can be used as a static singleton (backward-compatible API) or as an instantiable
 * class to support multiple independent engine instances on the same page.
 *
 * -- engine.setting.*
 * -- await engine.init();
 * @group engine3D
 */
export class Engine3D {

    // -------------------------------------------------------------------------
    // Instance fields
    // -------------------------------------------------------------------------

    /**
     * resource manager for this engine instance
     */
    public res: Res;

    /**
     * input system for this engine instance
     */
    public inputSystem: InputSystem;

    /**
     * views managed by this engine instance
     */
    public views: View3D[];

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * engine setting
     */
    public setting: EngineSetting = Engine3D._createDefaultSetting();

    /**
     * @internal - per-engine canvas context
     */
    public gpuContext: Context3D;

    /**
     * @internal - per-engine RTResourceMap snapshot
     */
    private _rtSnapshot: { rtTextureMap: Map<string, any>; rtViewQuad: Map<string, any> };

    /**
     * @internal - per-engine GBufferFrame map
     */
    private _gBufferSnapshot: Map<string, GBufferFrame>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    /**
     * set engine render frameRate 24/30/60/114/120/144/240/360 fps or other
     */
    public get frameRate(): number {
        return this._frameRate;
    }

    /**
     * get engine render frameRate
     */
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
        return this.gpuContext.presentationSize;
    }

    /**
     * get render window aspect
     */
    public get aspect(): number {
        return this.gpuContext.aspect;
    }

    /**
     * get render window size width
     */
    public get width(): number {
        return this.gpuContext.windowWidth;
    }

    /**
     * get render window size height
     */
    public get height(): number {
        return this.gpuContext.windowHeight;
    }

    /**
     * create webgpu 3d engine instance
     * @param descriptor  {@link CanvasConfig}
     * @returns
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        if (!Engine3D._globalInitDone) {
            console.log('Engine Version', version);
            if (!window.isSecureContext) {
                console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)')
            }
        }

        this.setting = { ...this.setting, ...descriptor.engineSetting };

        if (!Engine3D._globalInitDone) {
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
            Engine3D._globalInitDone = true;
        }

        // Create this engine's per-instance GPU canvas context
        this.gpuContext = new Context3D();
        await this.gpuContext.init(descriptor.canvasConfig);

        // Activate GPU context so texture creation below uses the right device
        setActiveContext(this.gpuContext);

        // Global one-time init (shared across all engine instances, order matters)
        if (!Engine3D._sharedInitDone) {
            ShaderLib.init();
            ShaderUtil.init();
            GlobalBindGroup.init();
            ShadowLightsCollect.init();
            Engine3D._sharedInitDone = true;
        }

        // Initialize per-engine isolated resource maps BEFORE creating any GBufferFrames
        RTResourceMap.init();
        GBufferFrame.gBufferMap = new Map<string, GBufferFrame>();

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

        // Capture per-engine resource state
        this._rtSnapshot = RTResourceMap.captureSnapshot();
        this._gBufferSnapshot = GBufferFrame.captureSnapshot();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.gpuContext.canvas);

        // Save context state after init
        this._deactivateContext();
        return;
    }

    /**
     * @internal
     * Activate this engine's context as the global active context.
     * Must be called before any rendering or resource creation for this engine.
     */
    private _activateContext() {
        // Update the ES module live binding so all importers see this engine's context
        setActiveContext(this.gpuContext);
        // Restore this engine's resource maps
        if (this._rtSnapshot) {
            RTResourceMap.restoreSnapshot(this._rtSnapshot);
        }
        if (this._gBufferSnapshot) {
            GBufferFrame.restoreSnapshot(this._gBufferSnapshot);
        }
    }

    /**
     * @internal
     * Save the current resource map state back into this engine's snapshots.
     */
    private _deactivateContext() {
        this._rtSnapshot = RTResourceMap.captureSnapshot();
        this._gBufferSnapshot = GBufferFrame.captureSnapshot();
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
     * @param view
     * @returns
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];
        this._activateContext();
        let renderJob = this._startRenderJob(view);
        this._deactivateContext();
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
        this._activateContext();
        for (let i = 0; i < views.length; i++) {
            this._startRenderJob(views[i]);
        }
        this._deactivateContext();
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
            let delta = time - this._time;
            if (delta < this._frameRateValue) {
                let t = performance.now()
                await new Promise(res => {
                    setTimeout(() => {
                        time += (performance.now() - t)
                        res(true)
                    }, this._frameRateValue - delta)
                })
            }
            this._time = time;
        }
        await this._updateFrame(time);
        this._requestAnimationFrameID = 0;
        this.resume();
    }

    private async _updateFrame(time: number) {
        // Activate this engine's context before any rendering
        this._activateContext();

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
        for (const iterator of ComponentCollect.componentsBeforeUpdateList) {
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
        for (const iterator of ComponentCollect.componentsComputeList) {
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
        for (const iterator of ComponentCollect.componentsUpdateList) {
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

        for (const iterator of ComponentCollect.graphicComponent) {
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
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        /****** auto late update with component list *****/
        for (const iterator of ComponentCollect.componentsLateUpdateList) {
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

        // Save this engine's resource state after rendering
        this._deactivateContext();
    }

    // -------------------------------------------------------------------------
    // Static backward-compatibility API (delegates to the default instance)
    // -------------------------------------------------------------------------

    /**
     * @internal - tracks whether global one-time init has run
     */
    private static _globalInitDone: boolean = false;

    /**
     * @internal - tracks whether shared subsystems have been initialized
     */
    private static _sharedInitDone: boolean = false;

    /**
     * @internal - the default static Engine3D instance (backward-compat)
     */
    private static _default: Engine3D;

    /**
     * @internal
     */
    private static _ensureDefault(): Engine3D {
        if (!Engine3D._default) {
            Engine3D._default = new Engine3D();
        }
        return Engine3D._default;
    }

    // --- Static property mirrors ---


    public static get res(): Res { return Engine3D._ensureDefault().res; }
    public static set res(v: Res) { Engine3D._ensureDefault().res = v; }


    public static get inputSystem(): InputSystem { return Engine3D._ensureDefault().inputSystem; }
    public static set inputSystem(v: InputSystem) { Engine3D._ensureDefault().inputSystem = v; }


    public static get views(): View3D[] { return Engine3D._ensureDefault().views; }
    public static set views(v: View3D[]) { Engine3D._ensureDefault().views = v; }


    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._ensureDefault().renderJobs; }
    public static set renderJobs(v: Map<View3D, RendererJob>) { Engine3D._ensureDefault().renderJobs = v; }


    public static get setting(): EngineSetting { return Engine3D._ensureDefault().setting; }
    public static set setting(v: EngineSetting) { Engine3D._ensureDefault().setting = v; }


    public static get size(): number[] { return Engine3D._ensureDefault().size; }


    public static get aspect(): number { return Engine3D._ensureDefault().aspect; }


    public static get width(): number { return Engine3D._ensureDefault().width; }


    public static get height(): number { return Engine3D._ensureDefault().height; }


    public static get frameRate(): number { return Engine3D._ensureDefault().frameRate; }
    public static set frameRate(v: number) { Engine3D._ensureDefault().frameRate = v; }

    // --- Static method mirrors ---


    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}) {
        const inst = Engine3D._ensureDefault();
        return inst.init(descriptor);
    }


    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._ensureDefault().startRenderView(view);
    }


    public static startRenderViews(views: View3D[]) {
        return Engine3D._ensureDefault().startRenderViews(views);
    }


    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._ensureDefault().getRenderJob(view);
    }


    public static pause() {
        Engine3D._ensureDefault().pause();
    }


    public static resume() {
        Engine3D._ensureDefault().resume();
    }

    // -------------------------------------------------------------------------
    // Shared default setting factory
    // -------------------------------------------------------------------------

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
