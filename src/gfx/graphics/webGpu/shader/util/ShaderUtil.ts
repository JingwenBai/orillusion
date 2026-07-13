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

/** @internal Per-engine shader module pool state */
export class ShaderUtilState {
    renderShaderModulePool: Map<string, GPUShaderModule> = new Map();
    renderShader: Map<string, RenderShaderPass> = new Map();
}

let _state: ShaderUtilState = new ShaderUtilState();

/** @internal */
export function _createShaderUtilState(): ShaderUtilState { return new ShaderUtilState(); }
/** @internal */
export function _setActiveShaderUtil(s: ShaderUtilState): void { _state = s; }

export class ShaderUtil {
    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        return _state.renderShaderModulePool;
    }
    public static set renderShaderModulePool(v: Map<string, GPUShaderModule>) {
        _state.renderShaderModulePool = v;
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        return _state.renderShader;
    }
    public static set renderShader(v: Map<string, RenderShaderPass>) {
        _state.renderShader = v;
    }

    public static init() {
        _state.renderShaderModulePool = new Map();
        _state.renderShader = new Map();
    }
}
