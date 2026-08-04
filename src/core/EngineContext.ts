import { Context3D, setActiveWebGPUContext } from '../gfx/graphics/webGpu/Context3D';
import { PipelinePool } from '../gfx/graphics/webGpu/PipelinePool';
import { ShaderUtil } from '../gfx/graphics/webGpu/shader/util/ShaderUtil';
import { GlobalBindGroup } from '../gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalBindGroupLayout } from '../gfx/graphics/webGpu/core/bindGroups/GlobalBindGroupLayout';
import { RTResourceMap } from '../gfx/renderJob/frame/RTResourceMap';
import { GBufferFrame } from '../gfx/renderJob/frame/GBufferFrame';
import { ShadowLightsCollect } from '../gfx/renderJob/collect/ShadowLightsCollect';
import { GPUContext } from '../gfx/renderJob/GPUContext';
import { CanvasConfig } from '../gfx/graphics/webGpu/CanvasConfig';

/**
 * Holds all GPU-device-specific state for one Engine3D instance.
 * Call activate() before any GPU operations to make this engine's
 * resources the "active" ones used by the static helper APIs.
 * @group engine3D
 */
export class EngineContext {
    public webGPUContext: Context3D;
    public pipelinePool: PipelinePool;
    public shaderUtil: ShaderUtil;
    public globalBindGroup: GlobalBindGroup;
    public globalBindGroupLayout: GlobalBindGroupLayout;
    public rtResourceMap: RTResourceMap;
    public gBufferFrameMap: Map<string, GBufferFrame>;
    public shadowLightsCollect: ShadowLightsCollect;
    public gpuContext: GPUContext;

    constructor() {
        this.webGPUContext = new Context3D();
        this.pipelinePool = new PipelinePool();
        this.shaderUtil = new ShaderUtil();
        this.globalBindGroup = new GlobalBindGroup();
        this.globalBindGroupLayout = new GlobalBindGroupLayout();
        this.rtResourceMap = new RTResourceMap();
        this.gBufferFrameMap = new Map<string, GBufferFrame>();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.gpuContext = new GPUContext();
    }

    /**
     * Initialize the WebGPU device and canvas for this engine context.
     */
    public async initWebGPU(canvasConfig?: CanvasConfig): Promise<boolean> {
        return this.webGPUContext.init(canvasConfig);
    }

    /**
     * Initialize all per-engine GPU resources (call after initWebGPU).
     */
    public initResources() {
        this.globalBindGroup.instance_init();
        RTResourceMap.setActive(this.rtResourceMap);
        RTResourceMap.init();
        ShadowLightsCollect.init();
    }

    /**
     * Set this context as the active one for all static GPU helper APIs.
     * Called automatically at the start of each frame.
     */
    public activate() {
        setActiveWebGPUContext(this.webGPUContext);
        PipelinePool.setActive(this.pipelinePool);
        ShaderUtil.setActive(this.shaderUtil);
        GlobalBindGroup.setActive(this.globalBindGroup);
        GlobalBindGroupLayout.setActive(this.globalBindGroupLayout);
        RTResourceMap.setActive(this.rtResourceMap);
        GBufferFrame.setActiveMap(this.gBufferFrameMap);
        ShadowLightsCollect.setActive(this.shadowLightsCollect);
        GPUContext.setActive(this.gpuContext);
    }
}
