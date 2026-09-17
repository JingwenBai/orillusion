import { RenderShaderPass } from "../RenderShaderPass";
import { getActiveEngineSubsystems } from "../../../../../core/engineContext";

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

    public init() {
        this.renderShaderModulePool = new Map<string, GPUShaderModule>();
        this.renderShader = new Map<string, RenderShaderPass>();
    }

    // ─── Static backward-compat facade ───────────────────────────────────────

    private static _get(): ShaderUtil {
        return getActiveEngineSubsystems().shaderUtil as ShaderUtil;
    }

    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        return ShaderUtil._get().renderShaderModulePool;
    }
    public static set renderShaderModulePool(v: Map<string, GPUShaderModule>) {
        ShaderUtil._get().renderShaderModulePool = v;
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        return ShaderUtil._get().renderShader;
    }
    public static set renderShader(v: Map<string, RenderShaderPass>) {
        ShaderUtil._get().renderShader = v;
    }

    public static init() { ShaderUtil._get().init(); }
}
