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
 * Per-engine snapshot of ShaderUtil state.
 * @internal
 */
export type ShaderUtilState = {
    renderShaderModulePool: Map<string, GPUShaderModule>;
    renderShader: Map<string, RenderShaderPass>;
};

export class ShaderUtil {
    public static renderShaderModulePool: Map<string, GPUShaderModule>;
    public static renderShader: Map<string, RenderShaderPass>;

    public static init() {
        this.renderShaderModulePool = new Map<string, GPUShaderModule>();
        this.renderShader = new Map<string, RenderShaderPass>();
    }

    /**
     * Capture current state into a snapshot object.
     * @internal
     */
    public static captureEngineState(): ShaderUtilState {
        return {
            renderShaderModulePool: this.renderShaderModulePool,
            renderShader: this.renderShader,
        };
    }

    /**
     * Restore a per-engine state snapshot as the active global state.
     * @internal
     */
    public static activateEngineState(state: ShaderUtilState): void {
        this.renderShaderModulePool = state.renderShaderModulePool;
        this.renderShader = state.renderShader;
    }
}
