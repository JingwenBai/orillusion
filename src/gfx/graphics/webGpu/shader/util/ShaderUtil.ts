import { webGPUContext } from "../../Context3D";
import { RenderShaderPass } from "../RenderShaderPass";

export type VertexPart = {
    name: string;
    vertex_in_struct: string;
    vertex_out_struct: string;
    vertex_buffer: string;
    vertex_fun: string;
    vertex_out: string;
}

export type FragmentPart = {
    name: string;
    fs_textures: string;
    fs_frament: string;
    fs_normal: string;
    fs_shadow: string;
    fs_buffer: string;
    fs_frameBuffers: string;
}

export class ShaderUtil {
    private static _modulePool: Map<GPUDevice, Map<string, GPUShaderModule>> = new Map();
    private static _shaderPool: Map<GPUDevice, Map<string, RenderShaderPass>> = new Map();

    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        const device = webGPUContext.device;
        if (!this._modulePool.has(device)) {
            this._modulePool.set(device, new Map());
        }
        return this._modulePool.get(device);
    }

    public static set renderShaderModulePool(map: Map<string, GPUShaderModule>) {
        this._modulePool.set(webGPUContext.device, map);
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        const device = webGPUContext.device;
        if (!this._shaderPool.has(device)) {
            this._shaderPool.set(device, new Map());
        }
        return this._shaderPool.get(device);
    }

    public static set renderShader(map: Map<string, RenderShaderPass>) {
        this._shaderPool.set(webGPUContext.device, map);
    }

    public static init() {
        // Pools are now lazily created per-device; this is intentionally a no-op.
    }
}
