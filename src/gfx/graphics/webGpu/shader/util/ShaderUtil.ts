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

    /** @internal active instance used by static API */
    public static _active: ShaderUtil;

    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        return ShaderUtil._active.renderShaderModulePool;
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        return ShaderUtil._active.renderShader;
    }

    // ---- instance state ----

    public renderShaderModulePool: Map<string, GPUShaderModule>;
    public renderShader: Map<string, RenderShaderPass>;

    constructor() {
        this.renderShaderModulePool = new Map<string, GPUShaderModule>();
        this.renderShader = new Map<string, RenderShaderPass>();
    }

    /** @deprecated use `new ShaderUtil()` and assign to Engine3D */
    public static init() {
        if (!this._active) {
            this._active = new ShaderUtil();
        } else {
            this._active.renderShaderModulePool = new Map<string, GPUShaderModule>();
            this._active.renderShader = new Map<string, RenderShaderPass>();
        }
    }
}
