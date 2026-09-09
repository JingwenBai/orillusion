import { RenderShaderPass } from "../RenderShaderPass";
import { getCurrentHandle } from "../../../../EngineContext";

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

interface ShaderUtilState {
    renderShaderModulePool: Map<string, GPUShaderModule>;
    renderShader: Map<string, RenderShaderPass>;
}

export class ShaderUtil {
    private static _stateMap: Map<object, ShaderUtilState> = new Map();

    private static getState(): ShaderUtilState {
        return this._stateMap.get(getCurrentHandle()!)!;
    }

    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        return this.getState().renderShaderModulePool;
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        return this.getState().renderShader;
    }

    public static init(): void {
        const handle = getCurrentHandle()!;
        this._stateMap.set(handle, {
            renderShaderModulePool: new Map<string, GPUShaderModule>(),
            renderShader: new Map<string, RenderShaderPass>(),
        });
    }
}
