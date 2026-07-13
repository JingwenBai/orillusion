import { PoolNode, RenderShaderPass } from "../../..";

/** @internal Per-engine pipeline cache state */
export class PipelinePoolState {
    pipelineMap: Map<string, GPURenderPipeline> = new Map();
}

let _state: PipelinePoolState = new PipelinePoolState();

/** @internal */
export function _createPipelinePoolState(): PipelinePoolState { return new PipelinePoolState(); }
/** @internal */
export function _setActivePipelinePool(s: PipelinePoolState): void { _state = s; }

export class PipelinePool {
    public static getSharePipeline(shaderVariant: string): GPURenderPipeline | null {
        return _state.pipelineMap.get(shaderVariant) ?? null;
    }

    public static setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline): void {
        _state.pipelineMap.set(shaderVariant, pipeline);
    }
}
