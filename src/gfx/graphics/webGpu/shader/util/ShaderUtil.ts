import { getActiveEngineId } from '../../../../../core/EngineID';
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
    private static _shaderModulePools: Map<string, Map<string, GPUShaderModule>> = new Map();
    private static _renderShaders: Map<string, Map<string, RenderShaderPass>> = new Map();

    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        const id = getActiveEngineId();
        if (!this._shaderModulePools.has(id)) this._shaderModulePools.set(id, new Map());
        return this._shaderModulePools.get(id);
    }

    public static set renderShaderModulePool(v: Map<string, GPUShaderModule>) {
        this._shaderModulePools.set(getActiveEngineId(), v);
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        const id = getActiveEngineId();
        if (!this._renderShaders.has(id)) this._renderShaders.set(id, new Map());
        return this._renderShaders.get(id);
    }

    public static set renderShader(v: Map<string, RenderShaderPass>) {
        this._renderShaders.set(getActiveEngineId(), v);
    }

    public static init() {
        const id = getActiveEngineId();
        this._shaderModulePools.set(id, new Map<string, GPUShaderModule>());
        this._renderShaders.set(id, new Map<string, RenderShaderPass>());
    }
}
