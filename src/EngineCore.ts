import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { EngineSetting } from './setting/EngineSetting';
import { createDefaultEngineSetting } from './setting/DefaultSettings';
import { Time } from './util/Time';
import { InputSystem } from './io/InputSystem';
import { View3D } from './core/View3D';
import { version } from '../package.json';
import { Context3D, setWebGPUContext } from './gfx/graphics/webGpu/Context3D';
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
import { EngineContext } from './EngineContext';

/**
 * An instantiatable engine instance.
 * Create one per canvas to support running multiple 3D scenes simultaneously.
 *
 * Usage:
 * ```typescript
 * // Multi-instance
 * const engine1 = new EngineCore();
 * await engine1.init({ canvasConfig: { canvas: canvas1 } });
 * engine1.startRenderView(view1);
 *
 * const engine2 = new EngineCore();
 * await engine2.init({ canvasConfig: { canvas: canvas2 } });
 * engine2.startRenderView(view2);
 * ```
 *
 * @group engine3D
 */
export class EngineCore {

    /**
     * Resource manager for this engine instance.
     */
    public res: Res;

    /**
     * Input system for this engine instance.
     */
    public inputSystem: InputSystem;

    /**
     * Active render views for this engine instance.
     */
    public views: View3D[];

    /**
     * Render jobs keyed by View3D.
     * @internal
     */
    public renderJobs: Map<View3D, RendererJob>;

    /**
     * WebGPU context (canvas + swap chain) for this engine instance.
     * Each engine instance has its own canvas; the underlying GPUDevice is shared.
     */
    public gpuContext: Context3D;

    /**
     * Per-engine render texture registry.
     * @internal
     */
    public rtResourceMap: RTResourceMap;

    /**
     * Per-engine GBuffer frame registry, keyed by pass name.
     * @internal
     */
    public gBufferMap: Map<string, GBufferFrame>;

    /**
     * Settings for this engine instance.
     * Initialized from defaults; customize before calling init().
     */
    public setting: EngineSetting;

    private _frameRateValue: number = 0;
    private _frameRate: number = 360;
    private _time: number = 0;
    private _beforeRender: Function;
    private _renderLoop: Function;
    private _lateRender: Function;
    private _requestAnimationFrameID: number = 0;

    constructor() {
        this.gpuContext = new Context3D();
        this.setting = createDefaultEngineSetting();
        this.rtResourceMap = new RTResourceMap();
        this.gBufferMap = new Map<string, GBufferFrame>();
    }

    /**
     * Get/set the target frame rate for this engine.
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

    /** Canvas presentation size [width, height] */
    public get size(): number[] {
        return this.gpuContext.presentationSize;
    }

    /** Canvas aspect ratio */
    public get aspect(): number {
        return this.gpuContext.aspect;
    }

    /** Canvas width in physical pixels */
    public get width(): number {
        return this.gpuContext.windowWidth;
    }

    /** Canvas height in physical pixels */
    public get height(): number {
        return this.gpuContext.windowHeight;
    }

    /**
     * Initialize this engine instance.
     * Acquires (or reuses) the shared GPUDevice, sets up the canvas swap chain,
     * and prepares all per-engine rendering state.
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

        if (descriptor.engineSetting) {
            this.setting = { ...this.setting, ...descriptor.engineSetting };
        }

        // Make this engine the current context for delegation during init
        EngineContext.setCurrent(this);

        await WasmMatrix.init(Matrix4.allocCount, this.setting.doublePrecision);

        await this.gpuContext.init(descriptor.canvasConfig);

        // Point the global webGPUContext at this engine's canvas context
        setWebGPUContext(this.gpuContext);

        // Pre-compute reflection settings
        this.setting.reflectionSetting.width =
            this.setting.reflectionSetting.reflectionProbeSize * 6;
        this.setting.reflectionSetting.height =
            this.setting.reflectionSetting.reflectionProbeSize *
            this.setting.reflectionSetting.reflectionProbeMaxCount;

        // Create reflection GBuffer frame for this engine
        GBufferFrame.getGBufferFrame(
            GBufferFrame.reflections_GBuffer,
            this.setting.reflectionSetting.width,
            this.setting.reflectionSetting.height,
            false
        );

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

        EngineContext.setCurrent(null);
    }

    private startRenderJob(view: View3D): RendererJob {
        let renderJob = new ForwardRenderJob(view);
        this.renderJobs.set(view, renderJob);

        if (this.setting.pick.mode === 'pixel') {
            let postProcessing = view.scene.getOrAddComponent(PostProcessingComponent);
            postProcessing.addPost(FXAAPost);
        }

        if (this.setting.pick.mode === 'pixel' || this.setting.pick.mode === 'bound') {
            view.enablePick = true;
        }

        return renderJob;
    }

    /**
     * Set the single render view and start the render loop.
     */
    public startRenderView(view: View3D): RendererJob {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = [view];

        EngineContext.setCurrent(this);
        setWebGPUContext(this.gpuContext);
        const renderJob = this.startRenderJob(view);
        EngineContext.setCurrent(null);

        this.resume();
        return renderJob;
    }

    /**
     * Set multiple render views and start the render loop.
     */
    public startRenderViews(views: View3D[]): void {
        this.renderJobs ||= new Map<View3D, RendererJob>();
        this.views = views;

        EngineContext.setCurrent(this);
        setWebGPUContext(this.gpuContext);
        for (let i = 0; i < views.length; i++) {
            this.startRenderJob(views[i]);
        }
        EngineContext.setCurrent(null);

        this.resume();
    }

    /**
     * Get the RendererJob for a given view.
     */
    public getRenderJob(view: View3D): RendererJob {
        return this.renderJobs?.get(view);
    }

    /**
     * Pause rendering (cancels requestAnimationFrame).
     */
    public pause(): void {
        if (this._requestAnimationFrameID !== 0) {
            cancelAnimationFrame(this._requestAnimationFrameID);
            this._requestAnimationFrameID = 0;
        }
    }

    /**
     * Resume rendering.
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
                        time += performance.now() - t;
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
        // Establish this engine as the active context for the entire frame.
        // All static singletons (RTResourceMap, GBufferFrame, etc.) delegate here.
        EngineContext.setCurrent(this);
        setWebGPUContext(this.gpuContext);

        Time.delta = time - Time.time;
        Time.time = time;
        Time.frame += 1;
        Interpolator.tick(Time.delta);

        const views = this.views;
        // Build a set of this engine's views for O(1) membership checks
        const viewSet = new Set(views);

        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            view.scene.waitUpdate();
            const [w, h] = this.gpuContext.presentationSize;
            view.camera.viewPort.setTo(0, 0, w, h);
        }

        if (this._beforeRender) {
            await this._beforeRender();
        }

        // Only dispatch lifecycle callbacks for views owned by THIS engine
        for (const [view, componentMap] of ComponentCollect.componentsBeforeUpdateList) {
            if (!viewSet.has(view)) continue;
            for (const [component, callback] of componentMap) {
                if (component.enable) callback(view);
            }
        }

        let command = this.gpuContext.device.createCommandEncoder();
        for (const [view, componentMap] of ComponentCollect.componentsComputeList) {
            if (!viewSet.has(view)) continue;
            for (const [component, callback] of componentMap) {
                if (component.enable) callback(view, command);
            }
        }
        this.gpuContext.device.queue.submit([command.finish()]);

        for (const [view, componentMap] of ComponentCollect.componentsUpdateList) {
            if (!viewSet.has(view)) continue;
            for (const [component, callback] of componentMap) {
                if (component.enable) callback(view);
            }
        }

        for (const [view, componentMap] of ComponentCollect.graphicComponent) {
            if (!viewSet.has(view)) continue;
            for (const [component, callback] of componentMap) {
                if (view && component.enable) callback(view);
            }
        }

        if (this._renderLoop) {
            await this._renderLoop();
        }

        WasmMatrix.updateAllContinueTransform(0, Matrix4.useCount, 16);

        // Upload the shared world-matrix buffer to the GPU
        const globalMatrixBindGroup = GlobalBindGroup.modelMatrixBindGroup;
        globalMatrixBindGroup.writeBuffer(Matrix4.useCount * 16);

        this.renderJobs.forEach((v) => {
            if (!v.renderState) {
                v.start();
            }
            v.renderFrame();
        });

        for (const [view, componentMap] of ComponentCollect.componentsLateUpdateList) {
            if (!viewSet.has(view)) continue;
            for (const [component, callback] of componentMap) {
                if (component.enable) callback(view);
            }
        }

        if (this._lateRender) {
            await this._lateRender();
        }

        EngineContext.setCurrent(null);
    }
}
