import { PoolNode, RenderShaderPass } from "../../..";

export class PipelinePool {

    /** @internal active instance used by static API */
    public static _active: PipelinePool;

    // ---- instance state ----

    public pipelineMap: Map<string, GPURenderPipeline>;

    constructor() {
        this.pipelineMap = new Map<string, GPURenderPipeline>();
    }

    public static getSharePipeline(shaderVariant: string): GPURenderPipeline | null {
        return PipelinePool._active.pipelineMap.get(shaderVariant) ?? null;
    }

    public static setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline) {
        PipelinePool._active.pipelineMap.set(shaderVariant, pipeline);
    }
}
