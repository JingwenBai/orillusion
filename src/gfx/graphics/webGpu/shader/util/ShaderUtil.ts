import { Engine3D } from '../../../../../Engine3D';
import { RenderShaderPass } from '../RenderShaderPass';

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
 * @internal
 * Per-engine shader module and render shader registry.
 * Static methods are backward-compatible proxies that delegate to the
 * active Engine3D instance's shaderUtil via Engine3D.current.
 */
export class ShaderUtil {

    public renderShaderModulePool: Map<string, GPUShaderModule>;
    public renderShader: Map<string, RenderShaderPass>;

    // ─── Static proxy API (backward compatibility) ──────────────────────────

    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        return Engine3D.current?.shaderUtil?.renderShaderModulePool;
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        return Engine3D.current?.shaderUtil?.renderShader;
    }

    public static init() {
        Engine3D.current?.shaderUtil?.init();
    }

    // ─── Instance methods ────────────────────────────────────────────────────

    init() {
        this.renderShaderModulePool = new Map<string, GPUShaderModule>();
        this.renderShader = new Map<string, RenderShaderPass>();
    }
}
