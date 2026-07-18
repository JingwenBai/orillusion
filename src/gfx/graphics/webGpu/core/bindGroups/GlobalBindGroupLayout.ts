import { EngineRegistry } from '../../../../../core/EngineRegistry';
import { webGPUContext } from "../../Context3D";

export class GlobalBindGroupLayout {

    public static getGlobalDataBindGroupLayout(): GPUBindGroupLayout {
        const engine = EngineRegistry.current;
        const cacheKey = '_globalDataBindGroupLayout';
        if (engine && engine[cacheKey]) return engine[cacheKey];

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
        if (engine) engine[cacheKey] = layout;
        return layout;
    }
}
