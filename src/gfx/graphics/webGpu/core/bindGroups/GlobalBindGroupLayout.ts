import { webGPUContext } from "../../Context3D";
import { getCurrentHandle } from "../../../../EngineContext";

export class GlobalBindGroupLayout {

    private static _layoutMap: Map<object, GPUBindGroupLayout> = new Map();

    public static getGlobalDataBindGroupLayout(): GPUBindGroupLayout {
        const handle = getCurrentHandle()!;
        const cached = this._layoutMap.get(handle);
        if (cached) return cached;

        let entries: GPUBindGroupLayoutEntry[] = [];
        entries.push({
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
            buffer: { type: 'uniform' },
        });
        entries.push({
            binding: 1,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
            buffer: { type: 'read-only-storage' },
        });

        const layout = webGPUContext.device.createBindGroupLayout({ entries });
        this._layoutMap.set(handle, layout);
        return layout;
    }
}
