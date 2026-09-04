import { PoolNode, RenderShaderPass } from "../../..";

let _active: PipelinePool;

/** @internal */
export function setActivePipelinePool(p: PipelinePool): void {
    _active = p;
}

export class PipelinePool {
    private _pipelineMap: Map<string, GPURenderPipeline> = new Map<string, GPURenderPipeline>();

    // ---- Instance methods ----

    public getSharePipeline(shaderVariant: string): GPURenderPipeline | null {
        return this._pipelineMap.get(shaderVariant) ?? null;
    }

    public setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline) {
        this._pipelineMap.set(shaderVariant, pipeline);
    }

    // ---- Static delegation API (backward compatible) ----

    public static getSharePipeline(shaderVariant: string): GPURenderPipeline | null {
        return _active?.getSharePipeline(shaderVariant) ?? null;
    }

    public static setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline) {
        _active?.setSharePipeline(shaderVariant, pipeline);
    }
}
