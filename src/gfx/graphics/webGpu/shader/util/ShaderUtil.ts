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
    /** Active instance module pool — set by EngineContext.activate() */
    public static renderShaderModulePool: Map<string, GPUShaderModule>;
    /** Active instance shader map — set by EngineContext.activate() */
    public static renderShader: Map<string, RenderShaderPass>;

    // Per-instance maps
    public instanceModulePool: Map<string, GPUShaderModule> = new Map();
    public instanceShader: Map<string, RenderShaderPass> = new Map();

    private static _active: ShaderUtil;

    public static setActive(instance: ShaderUtil) {
        this._active = instance;
        this.renderShaderModulePool = instance.instanceModulePool;
        this.renderShader = instance.instanceShader;
    }

    /** @deprecated Use EngineContext.activate() instead */
    public static init() {
        if (!this._active) {
            const inst = new ShaderUtil();
            this.setActive(inst);
        }
    }
}
