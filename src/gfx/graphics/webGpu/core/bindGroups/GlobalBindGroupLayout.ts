import { webGPUContext } from "../../Context3D";

export class GlobalBindGroupLayout {

    private static _layoutByDevice: Map<GPUDevice, GPUBindGroupLayout> = new Map();

    /** Call when activating a new engine to ensure the layout is created for the correct device. */
    public static reset(): void {
        // no-op: layouts are now keyed by device, so no global reset needed
    }

    public static getGlobalDataBindGroupLayout(): GPUBindGroupLayout {
        const device = webGPUContext.device;
        let layout = this._layoutByDevice.get(device);
        if (layout) return layout;

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

        layout = device.createBindGroupLayout({ entries });
        this._layoutByDevice.set(device, layout);
        return layout;
    }
}
