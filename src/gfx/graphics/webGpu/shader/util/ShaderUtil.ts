import { RenderShaderPass } from "../RenderShaderPass";
import { webGPUContext } from "../../Context3D";

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
    private static _modulePoolByDevice: Map<GPUDevice, Map<string, GPUShaderModule>> = new Map();
    private static _renderShaderByDevice: Map<GPUDevice, Map<string, RenderShaderPass>> = new Map();

    private static _getModulePool(): Map<string, GPUShaderModule> {
        const device = webGPUContext.device;
        let map = this._modulePoolByDevice.get(device);
        if (!map) {
            map = new Map<string, GPUShaderModule>();
            this._modulePoolByDevice.set(device, map);
        }
        return map;
    }

    private static _getRenderShaderMap(): Map<string, RenderShaderPass> {
        const device = webGPUContext.device;
        let map = this._renderShaderByDevice.get(device);
        if (!map) {
            map = new Map<string, RenderShaderPass>();
            this._renderShaderByDevice.set(device, map);
        }
        return map;
    }

    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        return this._getModulePool();
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        return this._getRenderShaderMap();
    }

    /** @internal Called during engine init; per-device maps are lazily initialized. */
    public static init(): void {
        // Per-device lazy initialization — no global reset needed
    }
}
