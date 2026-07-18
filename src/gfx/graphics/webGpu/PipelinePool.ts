import { EngineRegistry } from '../../../core/EngineRegistry';
import { PoolNode, RenderShaderPass } from "../../..";

export class PipelinePool {
    // ---- instance state (per Engine3D) ----
    private pipelineMap: Map<string, GPURenderPipeline> = new Map<string, GPURenderPipeline>();

    public getSharePipeline(shaderVariant: string): GPURenderPipeline | null {
        return this.pipelineMap.get(shaderVariant) ?? null;
    }

    public setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline): void {
        this.pipelineMap.set(shaderVariant, pipeline);
    }

    // ---- static delegates → forward to current engine's instance ----

    private static get _inst(): PipelinePool {
        return EngineRegistry.current?.pipelinePool as PipelinePool;
    }

    public static getSharePipeline(shaderVariant: string): GPURenderPipeline | null {
        return PipelinePool._inst?.getSharePipeline(shaderVariant) ?? null;
    }

    public static setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline): void {
        PipelinePool._inst?.setSharePipeline(shaderVariant, pipeline);
    }
}
