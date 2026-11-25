import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { Color } from './math/Color';
import { EngineSetting } from './setting/EngineSetting';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';

import { webGPUContext, Context3D } from './gfx/graphics/webGpu/Context3D';

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

function createDefaultEngineSetting(): EngineSetting {
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
 * Can be used as a static singleton (original API) or as an instantiable class for multi-instance support.
 *
 * -- engine.setting.*
 *
 * -- await engine.init();
 * @group engine3D
 */
export class Engine3D {

    // =========================================================
    // Instance Properties
    // =========================================================

    /**
     * Resource manager for this engine instance
     */
    public res: Res;

    /**
     * Input system for this engine instance
     */
    public inputSystem: InputSystem;

    /**
     * Active views for this engine instance
     */
    public views: View3D[] = [];

    /**
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * Engine settings for this instance
     */
    public setting: EngineSetting;

    /**
     * WebGPU context (canvas + device) for this engine instance
     */
    public webGPUContext: Context3D;

    /**
     * Per-engine RTResourceMap
     * @internal
     */
    public rtResourceMap: RTResourceMap;

    /**
     * Per-engine GBuffer frame map
     * @internal
     */
    public gBufferFrameMap: Map<string, GBufferFrame>;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    // =========================================================
    // Static Backward-Compat Layer
    // =========================================================

    private static _defaultEngine: Engine3D = null;
    private static _wasmInitialized: boolean = false;

    /**
     * Returns the default (first-created) Engine3D instance.
     */
    public static get defaultEngine(): Engine3D {
        return Engine3D._defaultEngine;
    }

    // --- Static delegators ---

    /** @deprecated Use instance.res */
    public static get res(): Res { return Engine3D._defaultEngine?.res; }
    public static set res(value: Res) { if (Engine3D._defaultEngine) Engine3D._defaultEngine.res = value; }

    /** @deprecated Use instance.inputSystem */
    public static get inputSystem(): InputSystem { return Engine3D._defaultEngine?.inputSystem; }
    public static set inputSystem(value: InputSystem) { if (Engine3D._defaultEngine) Engine3D._defaultEngine.inputSystem = value; }

    /** @deprecated Use instance.views */
    public static get views(): View3D[] { return Engine3D._defaultEngine?.views; }
    public static set views(value: View3D[]) { if (Engine3D._defaultEngine) Engine3D._defaultEngine.views = value; }

    /** @deprecated Use instance.renderJobs */
    public static get renderJobs(): Map<View3D, RendererJob> { return Engine3D._defaultEngine?.renderJobs; }
    public static set renderJobs(value: Map<View3D, RendererJob>) { if (Engine3D._defaultEngine) Engine3D._defaultEngine.renderJobs = value; }

    /** @deprecated Use instance.setting */
    public static get setting(): EngineSetting { return Engine3D._defaultEngine?.setting; }
    public static set setting(value: EngineSetting) { if (Engine3D._defaultEngine) Engine3D._defaultEngine.setting = value; }

    public static get size(): number[] { return Engine3D._defaultEngine?.webGPUContext.presentationSize; }
    public static get aspect(): number { return Engine3D._defaultEngine?.webGPUContext.aspect; }
    public static get width(): number { return Engine3D._defaultEngine?.webGPUContext.windowWidth; }
    public static get height(): number { return Engine3D._defaultEngine?.webGPUContext.windowHeight; }

    public static get frameRate(): number { return Engine3D._defaultEngine?._frameRate ?? 360; }
    public static set frameRate(value: number) { if (Engine3D._defaultEngine) Engine3D._defaultEngine.frameRate = value; }

    /**
     * Create a default engine instance and initialize it (static API — backward compatible).
     */
    public static async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {
        const engine = new Engine3D();
        Engine3D._defaultEngine = engine;
        await engine.init(descriptor);
    }

    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._defaultEngine.startRenderView(view);
    }

    public static startRenderViews(views: View3D[]): void {
        Engine3D._defaultEngine.startRenderViews(views);
    }

    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._defaultEngine?.getRenderJob(view);
    }

    public static pause(): void { Engine3D._defaultEngine?.pause(); }
    public static resume(): void { Engine3D._defaultEngine?.resume(); }

    // =========================================================
    // Instance Methods
    // =========================================================

    public get frameRate(): number { return this._frameRate; }
    public set frameRate(value: number) {
        this._frameRate = value;
        this._frameRateValue = value >= 360 ? 0 : 1000 / value;
    }

    public get size(): number[] { return this.webGPUContext.presentationSize; }
    public get aspect(): number { return this.webGPUContext.aspect; }
    public get width(): number { return this.webGPUContext.windowWidth; }
    public get height(): number { return this.webGPUContext.windowHeight; }

    /**
     * Initialize this engine instance. Can be called on a manually created Engine3D.
     */
    public async init(descriptor: { canvasConfig?: CanvasConfig; beforeRender?: Function; renderLoop?: Function; lateRender?: Function, engineSetting?: EngineSetting } = {}): Promise<void> {
        console.log('Engine Version', version);
        if (!window.isSecureContext) {
            console.warn('WebGPU is only supported in secure contexts (HTTPS or localhost)');
        }

        // Set as default if none exists
        if (!Engine3D._defaultEngine) {
            Engine3D._defaultEngine = this;
        }

        this.setting = { ...createDefaultEngineSetting(), ...descriptor.engineSetting };

        // Initialize WASM only once globally
        if (!Engine3D._wasmInitialized) {
            Engine3D._wasmInitialized = true;
            await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);
        }

        // For the first (default) engine, use the module-level webGPUContext singleton for backward compat.
        // Additional engines get their own Context3D (they share the GPU device).
        if (Engine3D._defaultEngine === this) {
            this.webGPUContext = webGPUContext;
        } else {
            this.webGPUContext = new Context3D();
        }

        await this.webGPUContext.init(descriptor.canvasConfig);

        // Per-engine reflection settings
        this.setting.reflectionSetting.width = this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height = this.setting.reflectionSetting.reflectionProbeSize * this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Per-engine GBuffer map
        this.gBufferFrameMap = new Map<string, GBufferFrame>();
        if (Engine3D._defaultEngine === this) {
            // Default engine uses the global gBufferMap for backward compat
            this.gBufferFrameMap = GBufferFrame.gBufferMap;
        }

        // Set active maps so GBufferFrame.getGBufferFrame uses this engine's maps
        GBufferFrame.setActiveMap(this.gBufferFrameMap);

        // Per-engine RTResourceMap
        this.rtResourceMap = new RTResourceMap();
        this.rtResourceMap.init();

        // Create the reflection GBuffer frame using this engine's maps
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

        // Shared/global systems (idempotent)
        ShaderLib.init();
        ShaderUtil.init();
        GlobalBindGroup.init();
        ShadowLightsCollect.init();

        this.res = new Res();
        this.res.initDefault();

        this._beforeRender = descriptor.beforeRender;
        this._renderLoop = descriptor.renderLoop;
        this._lateRender = descriptor.lateRender;
        this.inputSystem = new InputSystem();
        this.inputSystem.initCanvas(this.webGPUContext.canvas);
    }

    private startRenderJob(view: View3D): RendererJob {
        // Set active context for this engine before creating the render job
        RTResourceMap.setActive(this.rtResourceMap);
        GBufferFrame.setActiveMap(this.gBufferFrameMap);

        view.engine = this;

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
        let renderJob = this.startRenderJob(view);
        this.resume();
        return renderJob;
    }

    /**
     * Set render views and start renderer
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
     * Get view render job instance
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
        if (this._requestAnimationFrameID === 0) {
            this._requestAnimationFrameID = requestAnimationFrame((t) => this._render(t));
        }
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
        // Set this engine's active resource maps before frame processing
        RTResourceMap.setActive(this.rtResourceMap);
        GBufferFrame.setActiveMap(this.gBufferFrameMap);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        let i = 0;
        for (i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            let [w, h] = this.webGPUContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender)
            await this._beforeRender();

        // Before update — only process this engine's views
        for (const iterator of ComponentCollect.componentsBeforeUpdateList) {
            let k = iterator[0];
            if (!this.views.includes(k)) continue;
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k);
                }
            }
        }

        let command = this.webGPUContext.device.createCommandEncoder();
        for (const iterator of ComponentCollect.componentsComputeList) {
            let k = iterator[0];
            if (!this.views.includes(k)) continue;
            let v = iterator[1];
            for (const iterator2 of v) {
                let f = iterator2[0];
                let c = iterator2[1];
                if (f.enable) {
                    c(k, command);
                }
            }
        }

        this.webGPUContext.device.queue.submit([command.finish()]);

        // Update — only process this engine's views
        for (const iterator of ComponentCollect.componentsUpdateList) {
            let k = iterator[0];
            if (!this.views.includes(k)) continue;
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
            if (!this.views.includes(k)) continue;
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
        // Write global matrix buffer to GPU
        let globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v, k) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        // Late update — only process this engine's views
        for (const iterator of ComponentCollect.componentsLateUpdateList) {
            let k = iterator[0];
            if (!this.views.includes(k)) continue;
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
