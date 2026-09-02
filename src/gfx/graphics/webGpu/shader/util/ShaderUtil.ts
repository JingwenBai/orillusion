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
    public static activate(util: ShaderUtil) {
        this._active = util;
    }

    private static get _inst(): ShaderUtil {
        if (!this._active) {
            this._active = new ShaderUtil();
        }
        return this._active;
    }

    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        return this._inst._renderShaderModulePool;
    }
    public static get renderShader(): Map<string, RenderShaderPass> {
        return this._inst._renderShader;
    }

    public static init() {
        this._inst._renderShaderModulePool = new Map<string, GPUShaderModule>();
        this._inst._renderShader = new Map<string, RenderShaderPass>();
    }

    // ---- instance state ----

    public _renderShaderModulePool: Map<string, GPUShaderModule>;
    public _renderShader: Map<string, RenderShaderPass>;

    constructor() {
        this._renderShaderModulePool = new Map<string, GPUShaderModule>();
        this._renderShader = new Map<string, RenderShaderPass>();
    }
}
