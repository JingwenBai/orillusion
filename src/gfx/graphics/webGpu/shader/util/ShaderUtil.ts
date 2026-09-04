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

let _active: ShaderUtil;

/** @internal */
export function setActiveShaderUtil(s: ShaderUtil): void {
    _active = s;
}

export class ShaderUtil {
    public renderShaderModulePool: Map<string, GPUShaderModule>;
    public renderShader: Map<string, RenderShaderPass>;

    constructor() {
        this.renderShaderModulePool = new Map<string, GPUShaderModule>();
        this.renderShader = new Map<string, RenderShaderPass>();
    }

    // ---- Static delegation API (backward compatible) ----

    public static get renderShaderModulePool() { return _active?.renderShaderModulePool; }
    public static get renderShader() { return _active?.renderShader; }

    /** @deprecated Called automatically by EngineContext constructor */
    public static init() { /* no-op */ }
}
