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

/** @internal active per-engine instance, set by Engine3D.activate() */
let _activeShaderUtil: ShaderUtil | null = null;
export function setActiveShaderUtil(s: ShaderUtil): void {
    _activeShaderUtil = s;
}

export class ShaderUtil {
    public renderShaderModulePool: Map<string, GPUShaderModule>;
    public renderShader: Map<string, RenderShaderPass>;

    public init() {
        this.renderShaderModulePool = new Map<string, GPUShaderModule>();
        this.renderShader = new Map<string, RenderShaderPass>();
    }

    // Static backward-compat delegates — route through the active engine instance
    public static get renderShaderModulePool(): Map<string, GPUShaderModule> { return _activeShaderUtil?.renderShaderModulePool; }
    public static get renderShader(): Map<string, RenderShaderPass> { return _activeShaderUtil?.renderShader; }
}
