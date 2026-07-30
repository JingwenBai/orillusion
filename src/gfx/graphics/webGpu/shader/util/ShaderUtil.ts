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
    public static renderShaderModulePool: Map<string, GPUShaderModule>;
    public static renderShader: Map<string, RenderShaderPass>;

    public static init() {
        const maps = this.createMaps();
        this.setMaps(maps.renderShaderModulePool, maps.renderShader);
    }

    public static createMaps(): { renderShaderModulePool: Map<string, GPUShaderModule>; renderShader: Map<string, RenderShaderPass> } {
        return {
            renderShaderModulePool: new Map<string, GPUShaderModule>(),
            renderShader: new Map<string, RenderShaderPass>(),
        };
    }

    public static setMaps(renderShaderModulePool: Map<string, GPUShaderModule>, renderShader: Map<string, RenderShaderPass>): void {
        ShaderUtil.renderShaderModulePool = renderShaderModulePool;
        ShaderUtil.renderShader = renderShader;
    }
}
