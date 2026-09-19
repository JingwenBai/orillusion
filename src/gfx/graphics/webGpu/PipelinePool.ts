export class PipelinePoolData {
    public pipelineMap: Map<string, GPURenderPipeline> = new Map<string, GPURenderPipeline>();
}

let _current: PipelinePoolData | null = null;

export function setCurrentPipelinePool(data: PipelinePoolData): void {
    _current = data;
}

export class PipelinePool {
    public static getSharePipeline(shaderVariant: string) {
        let pipeline = _current!.pipelineMap.get(shaderVariant);
        if (pipeline) {
            return pipeline;
        } else {
            return null;
        }
    }

    public static setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline) {
        _current!.pipelineMap.set(shaderVariant, pipeline);
    }
}
