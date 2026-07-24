export class PipelinePool {
    private _pipelineMap: Map<string, GPURenderPipeline> = new Map<string, GPURenderPipeline>();

    private static _active: PipelinePool = new PipelinePool();

    public static activate(instance: PipelinePool): void {
        PipelinePool._active = instance;
    }

    public static getSharePipeline(shaderVariant: string): GPURenderPipeline | null {
        return PipelinePool._active._pipelineMap.get(shaderVariant) ?? null;
    }

    public static setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline): void {
        PipelinePool._active._pipelineMap.set(shaderVariant, pipeline);
    }
}
