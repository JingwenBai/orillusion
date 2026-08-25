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

    /**
     * Active instance — set by Engine3D.activate() before each frame.
     * @internal
     */
    public static current: ShaderUtil;

    // ── instance state ────────────────────────────────────────────────────────

    public renderShaderModulePool: Map<string, GPUShaderModule>;
    public renderShader: Map<string, RenderShaderPass>;

    constructor() {
        this.renderShaderModulePool = new Map<string, GPUShaderModule>();
        this.renderShader = new Map<string, RenderShaderPass>();
    }

    // ── static shims (delegate to ShaderUtil.current) ─────────────────────────

    public static init() {
        // No-op: instance is created in Engine3D constructor.
    }

    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        return ShaderUtil.current.renderShaderModulePool;
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        return ShaderUtil.current.renderShader;
    }
}
