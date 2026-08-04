import { PoolNode, RenderShaderPass } from "../../..";

export class PipelinePool {
    private pipelineMap: Map<string, GPURenderPipeline> = new Map();

    private static _active: PipelinePool;

    public static setActive(instance: PipelinePool) {
        this._active = instance;
    }

    public static getSharePipeline(shaderVariant: string) {
        let pipeline = this._active.pipelineMap.get(shaderVariant);
        return pipeline ?? null;
    }

    public static setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline) {
        this._active.pipelineMap.set(shaderVariant, pipeline);
    }
}
