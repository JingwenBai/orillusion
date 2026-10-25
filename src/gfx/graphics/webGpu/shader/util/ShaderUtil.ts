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

let _activeInstance: ShaderUtil = null;

export class ShaderUtil {
    public renderShaderModulePool: Map<string, GPUShaderModule>;
    public renderShader: Map<string, RenderShaderPass>;

    public init() {
        this.renderShaderModulePool = new Map<string, GPUShaderModule>();
        this.renderShader = new Map<string, RenderShaderPass>();
    }

    // ---- Static delegation to active instance ----

    public static setActive(instance: ShaderUtil) {
        _activeInstance = instance;
    }

    public static get active(): ShaderUtil {
        return _activeInstance;
    }

    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        return _activeInstance?.renderShaderModulePool;
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        return _activeInstance?.renderShader;
    }

    /** @deprecated use instance method via engine.shaderUtil */
    public static init() { _activeInstance?.init(); }
}
