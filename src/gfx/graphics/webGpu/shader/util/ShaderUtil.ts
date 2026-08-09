import { RenderShaderPass } from "../RenderShaderPass";
import { getActiveEngineContext } from "../../../../../EngineRegistry";

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
    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        return getActiveEngineContext().renderShaderModulePool;
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        return getActiveEngineContext().renderShader;
    }

    public static init() {
        const ctx = getActiveEngineContext();
        ctx.renderShaderModulePool = new Map<string, GPUShaderModule>();
        ctx.renderShader = new Map<string, RenderShaderPass>();
    }
}
