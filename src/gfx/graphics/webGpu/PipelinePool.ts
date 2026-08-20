import { Engine3D } from '../../..';

/**
 * @internal
 * Per-engine GPU render pipeline cache.
 * Static methods are backward-compatible proxies that delegate to the
 * active Engine3D instance's pipelinePool via Engine3D.current.
 */
export class PipelinePool {

    private _pipelineMap: Map<string, GPURenderPipeline>;

    // ─── Static proxy API (backward compatibility) ──────────────────────────

    public static getSharePipeline(shaderVariant: string): GPURenderPipeline {
        return Engine3D.current?.pipelinePool?.getSharePipeline(shaderVariant);
    }

    public static setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline) {
        Engine3D.current?.pipelinePool?.setSharePipeline(shaderVariant, pipeline);
    }

    // ─── Instance methods ────────────────────────────────────────────────────

    constructor() {
        this._pipelineMap = new Map<string, GPURenderPipeline>();
    }

    getSharePipeline(shaderVariant: string): GPURenderPipeline {
        return this._pipelineMap.get(shaderVariant) ?? null;
    }

    setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline) {
        this._pipelineMap.set(shaderVariant, pipeline);
    }
}
