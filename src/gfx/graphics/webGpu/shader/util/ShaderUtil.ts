import { getActiveEngine } from "../../../../../_activeEngine";
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

/**
 * Per-engine GPU shader module pool.
 * Static shims delegate to the active engine's instance.
 */
export class ShaderUtil {
    // ── instance state ────────────────────────────────────────────────────────
    public renderShaderModulePool: Map<string, GPUShaderModule> = new Map();
    public renderShader: Map<string, RenderShaderPass> = new Map();

    // ── static shims ──────────────────────────────────────────────────────────
    private static _su(): ShaderUtil { return getActiveEngine()?._shaderUtil; }

    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        return ShaderUtil._su()?.renderShaderModulePool;
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        return ShaderUtil._su()?.renderShader;
    }

    public static init() {
        const e = getActiveEngine();
        if (!e._shaderUtil) e._shaderUtil = new ShaderUtil();
        // Maps are already initialized in the constructor
    }
}
