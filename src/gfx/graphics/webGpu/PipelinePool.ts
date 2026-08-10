import { getActiveEngine } from "../../../_activeEngine";

/**
 * Per-engine GPU render-pipeline pool.
 * GPURenderPipeline objects are tied to a specific GPUDevice, so they cannot
 * be shared between Engine3D instances. Static shims delegate to the active
 * engine's instance.
 */
export class PipelinePool {
    // ── instance state ────────────────────────────────────────────────────────
    private pipelineMap: Map<string, GPURenderPipeline> = new Map();

    public getSharePipeline(shaderVariant: string): GPURenderPipeline | null {
        return this.pipelineMap.get(shaderVariant) ?? null;
    }

    public setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline) {
        this.pipelineMap.set(shaderVariant, pipeline);
    }

    // ── static shims ──────────────────────────────────────────────────────────
    private static _pp(): PipelinePool { return getActiveEngine()?._pipelinePool; }

    public static getSharePipeline(shaderVariant: string): GPURenderPipeline | null {
        return PipelinePool._pp()?.getSharePipeline(shaderVariant) ?? null;
    }

    public static setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline) {
        PipelinePool._pp()?.setSharePipeline(shaderVariant, pipeline);
    }
}
