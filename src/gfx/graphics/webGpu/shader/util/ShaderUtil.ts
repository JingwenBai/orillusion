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
 * @internal
 * Per-engine state held by ShaderUtil.
 */
export class ShaderUtilState {
    public renderShaderModulePool: Map<string, GPUShaderModule> = new Map();
    public renderShader: Map<string, RenderShaderPass> = new Map();
}

export class ShaderUtil {
    private static _state: ShaderUtilState = new ShaderUtilState();

    /** Create a fresh state object for a new Engine3D instance. */
    public static createState(): ShaderUtilState {
        return new ShaderUtilState();
    }

    /** Activate the given state as the current context (called by Engine3D). */
    public static activateState(state: ShaderUtilState): void {
        ShaderUtil._state = state;
    }

    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        return this._state.renderShaderModulePool;
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        return this._state.renderShader;
    }

    public static init() {
        this._state = this.createState();
    }
}
