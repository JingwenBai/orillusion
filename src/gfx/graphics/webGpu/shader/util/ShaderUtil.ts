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

    // ---- Active instance registry (multi-instance support) ----
    private static _active: ShaderUtil;

    public static setActive(instance: ShaderUtil): void {
        ShaderUtil._active = instance;
    }

    public static createInstance(): ShaderUtil {
        const instance = new ShaderUtil();
        instance._doInit();
        return instance;
    }

    // ---- Static facade ----

    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        return ShaderUtil._active._renderShaderModulePool;
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        return ShaderUtil._active._renderShader;
    }

    public static init(): void {
        ShaderUtil._active._doInit();
    }

    // ---- Instance state ----
    private _renderShaderModulePool: Map<string, GPUShaderModule>;
    private _renderShader: Map<string, RenderShaderPass>;

    private _doInit(): void {
        this._renderShaderModulePool = new Map<string, GPUShaderModule>();
        this._renderShader = new Map<string, RenderShaderPass>();
    }
}
