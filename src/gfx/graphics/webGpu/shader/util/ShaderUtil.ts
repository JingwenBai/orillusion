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

    public renderShaderModulePool: Map<string, GPUShaderModule>;
    public renderShader: Map<string, RenderShaderPass>;

    constructor() {
        this.renderShaderModulePool = new Map<string, GPUShaderModule>();
        this.renderShader = new Map<string, RenderShaderPass>();
    }

    // --- Static proxy API ---

    /** @internal */
    public static _instance: ShaderUtil;

    public static get renderShaderModulePool() { return ShaderUtil._instance?.renderShaderModulePool; }
    public static get renderShader() { return ShaderUtil._instance?.renderShader; }

    /** @internal */
    public static init() {
        ShaderUtil._instance = new ShaderUtil();
    }
}
