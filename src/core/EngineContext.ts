import { ComponentCollect, setActiveComponentCollect } from '../gfx/renderJob/collect/ComponentCollect';
import { GlobalBindGroup, setActiveGlobalBindGroup } from '../gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { RTResourceMap, setActiveRTResourceMap } from '../gfx/renderJob/frame/RTResourceMap';
import { GPUContext, setActiveGPUContext } from '../gfx/renderJob/GPUContext';
import { ShadowLightsCollect, setActiveShadowLightsCollect } from '../gfx/renderJob/collect/ShadowLightsCollect';
import { EntityCollect, setActiveEntityCollect } from '../gfx/renderJob/collect/EntityCollect';
import { GBufferFrame, setActiveGBufferMap } from '../gfx/renderJob/frame/GBufferFrame';
import { ShaderUtil, setActiveShaderUtil } from '../gfx/graphics/webGpu/shader/util/ShaderUtil';
import { PipelinePool, setActivePipelinePool } from '../gfx/graphics/webGpu/PipelinePool';
import { Context3D, setWebGPUContext } from '../gfx/graphics/webGpu/Context3D';

let _current: EngineContext = null;

/**
 * Per-engine context that holds all subsystem instances.
 * Enables multiple independent Engine3D instances to coexist in the same JS context.
 *
 * Initialization is split into two phases:
 *   1. constructor() + activate() — non-GPU resources, before webGPUContext.init()
 *   2. initGPU() — GPU resources (GlobalBindGroup etc.), after webGPUContext.init()
 *
 * @group Core
 */
export class EngineContext {
    public webGPUContext: Context3D;
    public componentCollect: ComponentCollect;
    /** Created in initGPU(), null until then */
    public globalBindGroup: GlobalBindGroup;
    public rtResourceMap: RTResourceMap;
    public gpuContext: GPUContext;
    public shadowLightsCollect: ShadowLightsCollect;
    public entityCollect: EntityCollect;
    public gBufferMap: Map<string, GBufferFrame>;
    public shaderUtil: ShaderUtil;
    public pipelinePool: PipelinePool;

    public static get current(): EngineContext {
        return _current;
    }

    constructor() {
        this.webGPUContext = new Context3D();
        this.componentCollect = new ComponentCollect();
        this.rtResourceMap = new RTResourceMap();
        this.gpuContext = new GPUContext();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.entityCollect = new EntityCollect();
        this.gBufferMap = new Map<string, GBufferFrame>();
        this.shaderUtil = new ShaderUtil();
        this.pipelinePool = new PipelinePool();
        // globalBindGroup is NOT created here — it requires the GPU device.
        // Call initGPU() after webGPUContext.init().
    }

    /**
     * Create GPU-dependent resources. Must be called after webGPUContext.init().
     */
    public initGPU(): void {
        this.globalBindGroup = new GlobalBindGroup();
        setActiveGlobalBindGroup(this.globalBindGroup);
    }

    /**
     * Make this context the active one. All static singleton accessors will delegate to
     * this instance until another context is activated. Call before each render frame
     * when multiple Engine3D instances coexist.
     *
     * Note: also activates globalBindGroup if it has been initialized.
     */
    public activate(): void {
        _current = this;
        setWebGPUContext(this.webGPUContext);
        setActiveComponentCollect(this.componentCollect);
        if (this.globalBindGroup) setActiveGlobalBindGroup(this.globalBindGroup);
        setActiveRTResourceMap(this.rtResourceMap);
        setActiveGPUContext(this.gpuContext);
        setActiveShadowLightsCollect(this.shadowLightsCollect);
        setActiveEntityCollect(this.entityCollect);
        setActiveGBufferMap(this.gBufferMap);
        setActiveShaderUtil(this.shaderUtil);
        setActivePipelinePool(this.pipelinePool);
    }
}
