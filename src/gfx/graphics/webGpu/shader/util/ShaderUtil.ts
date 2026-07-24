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
    public renderShaderModulePool: Map<string, GPUShaderModule> = new Map<string, GPUShaderModule>();
    public renderShader: Map<string, RenderShaderPass> = new Map<string, RenderShaderPass>();

    private static _active: ShaderUtil = new ShaderUtil();

    public static activate(instance: ShaderUtil): void {
        ShaderUtil._active = instance;
    }

    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        return ShaderUtil._active.renderShaderModulePool;
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        return ShaderUtil._active.renderShader;
    }

    /** @deprecated Initialization now happens automatically; kept for backward compatibility */
    public static init(): void {
        ShaderUtil._active = new ShaderUtil();
    }
}
