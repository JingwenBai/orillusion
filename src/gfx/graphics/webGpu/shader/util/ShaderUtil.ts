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
    private static _active: ShaderUtil;

    /** @internal */
    public shaderModulePool: Map<string, GPUShaderModule>;
    /** @internal */
    public shaderPassPool: Map<string, RenderShaderPass>;

    constructor() {
        this.shaderModulePool = new Map<string, GPUShaderModule>();
        this.shaderPassPool = new Map<string, RenderShaderPass>();
    }

    /** Activate a ShaderUtil instance for the current engine context. */
    public static activate(instance: ShaderUtil): void {
        this._active = instance;
    }

    public static init(): void {
        this._active = new ShaderUtil();
    }

    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        return this._active.shaderModulePool;
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        return this._active.shaderPassPool;
    }
}
