import { Context3D, setActiveWebGPUContext } from '../gfx/graphics/webGpu/Context3D';
import { ComponentCollectData, setCurrentComponentCollect } from '../gfx/renderJob/collect/ComponentCollect';
import { GlobalBindGroupData, setCurrentGlobalBindGroup } from '../gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { ShadowLightsCollectData, setCurrentShadowLightsCollect } from '../gfx/renderJob/collect/ShadowLightsCollect';
import { RTResourceMapData, setCurrentRTResourceMap } from '../gfx/renderJob/frame/RTResourceMap';
import { EntityCollect, setCurrentEntityCollect } from '../gfx/renderJob/collect/EntityCollect';
import { ShaderUtilData, setCurrentShaderUtil } from '../gfx/graphics/webGpu/shader/util/ShaderUtil';
import { PipelinePoolData, setCurrentPipelinePool } from '../gfx/graphics/webGpu/PipelinePool';

/**
 * Holds all per-engine-instance state that was previously stored in static singletons.
 * Each Engine3D instance owns one EngineContext. Calling activate() sets this context
 * as the currently active one, routing all static singleton calls through it.
 * @group Core
 */
export class EngineContext {

    /** Per-engine WebGPU device/canvas context */
    public gpuContext: Context3D;

    /** Per-engine component lifecycle management */
    public componentCollect: ComponentCollectData;

    /** Per-engine GPU bind groups registry */
    public globalBindGroup: GlobalBindGroupData;

    /** Per-engine shadow lights collection */
    public shadowLightsCollect: ShadowLightsCollectData;

    /** Per-engine render texture resources */
    public rtResourceMap: RTResourceMapData;

    /** Per-engine render entity collection */
    public entityCollect: EntityCollect;

    /** Per-engine shader module cache */
    public shaderUtil: ShaderUtilData;

    /** Per-engine render pipeline cache */
    public pipelinePool: PipelinePoolData;

    constructor() {
        this.gpuContext = new Context3D();
        this.componentCollect = new ComponentCollectData();
        this.globalBindGroup = new GlobalBindGroupData();
        this.shadowLightsCollect = new ShadowLightsCollectData();
        this.rtResourceMap = new RTResourceMapData();
        this.entityCollect = new EntityCollect();
        this.shaderUtil = new ShaderUtilData();
        this.pipelinePool = new PipelinePoolData();
    }

    /**
     * Make this context the active one for all static singleton shims.
     * Must be called before any engine operation (init, render frame, etc.).
     */
    public activate(): void {
        setActiveWebGPUContext(this.gpuContext);
        setCurrentComponentCollect(this.componentCollect);
        setCurrentGlobalBindGroup(this.globalBindGroup);
        setCurrentShadowLightsCollect(this.shadowLightsCollect);
        setCurrentRTResourceMap(this.rtResourceMap);
        setCurrentEntityCollect(this.entityCollect);
        setCurrentShaderUtil(this.shaderUtil);
        setCurrentPipelinePool(this.pipelinePool);
    }
}
