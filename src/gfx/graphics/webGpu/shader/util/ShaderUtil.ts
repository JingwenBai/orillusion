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

    // ─── Instance state ───────────────────────────────────────────────────────

    public renderShaderModulePool: Map<string, GPUShaderModule>;
    public renderShader: Map<string, RenderShaderPass>;

    public init() {
        this.renderShaderModulePool = new Map<string, GPUShaderModule>();
        this.renderShader = new Map<string, RenderShaderPass>();
    }

    // ─── Active-instance pattern ──────────────────────────────────────────────

    /** @internal */
    private static _active: ShaderUtil;

    /** @internal Called by Engine3D to activate this engine's instance */
    public static setActive(instance: ShaderUtil): void {
        this._active = instance;
    }

    // ── Static property proxies ──────────────────────────────────────────────
    public static get renderShaderModulePool() { return this._active?.renderShaderModulePool; }
    public static get renderShader() { return this._active?.renderShader; }

    // ── Static method proxies ────────────────────────────────────────────────
    public static init() { this._active?.init(); }
}
