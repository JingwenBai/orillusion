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

export class ShaderUtilData {
    public renderShaderModulePool: Map<string, GPUShaderModule> = new Map();
    public renderShader: Map<string, RenderShaderPass> = new Map();
}

let _current: ShaderUtilData | null = null;

export function setCurrentShaderUtil(data: ShaderUtilData): void {
    _current = data;
}

export class ShaderUtil {
    public static get renderShaderModulePool(): Map<string, GPUShaderModule> { return _current!.renderShaderModulePool; }
    public static set renderShaderModulePool(v: Map<string, GPUShaderModule>) { _current!.renderShaderModulePool = v; }
    public static get renderShader(): Map<string, RenderShaderPass> { return _current!.renderShader; }
    public static set renderShader(v: Map<string, RenderShaderPass>) { _current!.renderShader = v; }

    public static init(): void {
        if (_current) {
            _current.renderShaderModulePool = new Map();
            _current.renderShader = new Map();
        }
    }
}
