import { PoolNode, RenderShaderPass } from "../../..";
import { webGPUContext } from "./Context3D";

export class PipelinePool {
    private static _pipelinesByDevice: Map<GPUDevice, Map<string, GPURenderPipeline>> = new Map();

    private static _getMap(): Map<string, GPURenderPipeline> {
        const device = webGPUContext.device;
        let map = this._pipelinesByDevice.get(device);
        if (!map) {
            map = new Map<string, GPURenderPipeline>();
            this._pipelinesByDevice.set(device, map);
        }
        return map;
    }

    public static getSharePipeline(shaderVariant: string): GPURenderPipeline | null {
        return this._getMap().get(shaderVariant) ?? null;
    }

    public static setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline): void {
        this._getMap().set(shaderVariant, pipeline);
    }
}
