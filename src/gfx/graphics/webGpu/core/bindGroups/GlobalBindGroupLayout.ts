import { webGPUContext } from "../../Context3D";

export class GlobalBindGroupLayout {

    private static _layoutMap: Map<GPUDevice, GPUBindGroupLayout> = new Map();

    public static getGlobalDataBindGroupLayout(): GPUBindGroupLayout {
        const device = webGPUContext.device;
        const cached = this._layoutMap.get(device);
        if (cached) return cached;

        let entries: GPUBindGroupLayoutEntry[] = [];
        entries.push({
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
            buffer: {
                type: 'uniform',
            },
        });
        entries.push({
            binding: 1,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
            buffer: {
                type: 'read-only-storage',
            },
        });

        const layout = device.createBindGroupLayout({ entries });
        this._layoutMap.set(device, layout);
        return layout;
    }
}
