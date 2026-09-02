import { PoolNode, RenderShaderPass } from "../../..";

export class PipelinePool {
    private static _active: PipelinePool;

    /** @internal */
    public static activate(pool: PipelinePool) {
        this._active = pool;
    }

    private static get _inst(): PipelinePool {
        if (!this._active) {
            this._active = new PipelinePool();
        }
        return this._active;
    }

    public static getSharePipeline(shaderVariant: string): GPURenderPipeline | null {
        return this._inst._pipelineMap.get(shaderVariant) ?? null;
    }

    public static setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline) {
        this._inst._pipelineMap.set(shaderVariant, pipeline);
    }

    // ---- instance state ----

    private _pipelineMap: Map<string, GPURenderPipeline> = new Map();
}
