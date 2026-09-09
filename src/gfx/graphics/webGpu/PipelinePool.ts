import { getCurrentHandle } from '../../EngineContext';

export class PipelinePool {
    private static _pipelineMaps: Map<object, Map<string, GPURenderPipeline>> = new Map();

    private static getMap(): Map<string, GPURenderPipeline> {
        const handle = getCurrentHandle()!;
        if (!this._pipelineMaps.has(handle)) {
            this._pipelineMaps.set(handle, new Map<string, GPURenderPipeline>());
        }
        return this._pipelineMaps.get(handle)!;
    }

    public static getSharePipeline(shaderVariant: string): GPURenderPipeline | null {
        return this.getMap().get(shaderVariant) ?? null;
    }

    public static setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline): void {
        this.getMap().set(shaderVariant, pipeline);
    }
}
