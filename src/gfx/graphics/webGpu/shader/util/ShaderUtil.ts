import { EngineRegistry } from '../../../../../core/EngineRegistry';
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
    // ---- instance state (per Engine3D) ----
    public renderShaderModulePool: Map<string, GPUShaderModule>;
    public renderShader: Map<string, RenderShaderPass>;

    public init() {
        this.renderShaderModulePool = new Map<string, GPUShaderModule>();
        this.renderShader = new Map<string, RenderShaderPass>();
    }

    // ---- static delegates → forward to current engine's instance ----

    private static get _inst(): ShaderUtil {
        return EngineRegistry.current?.shaderUtil as ShaderUtil;
    }

    public static get renderShaderModulePool(): Map<string, GPUShaderModule> {
        return ShaderUtil._inst?.renderShaderModulePool;
    }

    public static get renderShader(): Map<string, RenderShaderPass> {
        return ShaderUtil._inst?.renderShader;
    }

    public static init(): void {
        ShaderUtil._inst?.init();
    }
}
