import { webGPUContext } from "./Context3D";

export class PipelinePool {
    private static _deviceMap: Map<GPUDevice, Map<string, GPURenderPipeline>> = new Map();

    private static _getPool(): Map<string, GPURenderPipeline> {
        const device = webGPUContext.device;
        if (!this._deviceMap.has(device)) {
            this._deviceMap.set(device, new Map());
        }
        return this._deviceMap.get(device);
    }

    public static getSharePipeline(shaderVariant: string): GPURenderPipeline | null {
        return this._getPool().get(shaderVariant) ?? null;
    }

    public static setSharePipeline(shaderVariant: string, pipeline: GPURenderPipeline): void {
        this._getPool().set(shaderVariant, pipeline);
    }
}