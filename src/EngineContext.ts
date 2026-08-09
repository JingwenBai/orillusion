import { Context3D } from './gfx/graphics/webGpu/Context3D';

/**
 * Holds all per-Engine3D-instance mutable state.
 * Each Engine3D instance owns one EngineContext.
 * Static utility classes (ComponentCollect, GlobalBindGroup, …) read from the
 * currently active EngineContext via EngineRegistry.getActiveEngineContext().
 * @internal
 */
export class EngineContext {
    /** WebGPU device / canvas / adapter */
    public webGPUContext: Context3D = new Context3D();

    // ── ComponentCollect state ──────────────────────────────────────────────
    public componentsUpdateList: Map<any, Map<any, Function>> = new Map();
    public componentsLateUpdateList: Map<any, Map<any, Function>> = new Map();
    public componentsBeforeUpdateList: Map<any, Map<any, Function>> = new Map();
    public componentsComputeList: Map<any, Map<any, Function>> = new Map();
    public componentsEnablePickerList: Map<any, Map<any, Function>> = new Map();
    public graphicComponent: Map<any, Map<any, Function>> = new Map();
    public waitStartComponent: Map<any, any[]> = new Map();

    // ── GlobalBindGroup state ───────────────────────────────────────────────
    public modelMatrixBindGroup: any = null;
    public cameraBindGroups: Map<any, any> = new Map();
    public lightEntriesMap: Map<any, any> = new Map();
    public reflectionEntriesMap: Map<any, any> = new Map();

    // ── RTResourceMap state ─────────────────────────────────────────────────
    public rtTextureMap: Map<string, any> = new Map();
    public rtViewQuad: Map<string, any> = new Map();

    // ── ShadowLightsCollect state ───────────────────────────────────────────
    public directionLightList: Map<any, any[]> = new Map();
    public pointLightList: Map<any, any[]> = new Map();
    public shadowLights: Map<any, Float32Array> = new Map();

    // ── GPUContext render state ─────────────────────────────────────────────
    public lastGeometry: any = null;
    public lastPipeline: GPURenderPipeline | null = null;
    public lastShader: any = null;
    public drawCount: number = 0;
    public renderPassCount: number = 0;
    public geometryCount: number = 0;
    public pipelineCount: number = 0;
    public matrixCount: number = 0;
    public lastRenderPassState: any = null;
    public LastCommand: GPUCommandEncoder | null = null;

    // ── GBufferFrame state ──────────────────────────────────────────────────
    public gBufferMap: Map<string, any> = new Map();

    // ── Time state ──────────────────────────────────────────────────────────
    public time: number = 0;
    public frame: number = 0;
    public delta: number = 0;

    // ── ShaderUtil state ────────────────────────────────────────────────────
    public renderShaderModulePool: Map<string, any> = new Map();
    public renderShader: Map<string, any> = new Map();

    // ── Engine3D state ──────────────────────────────────────────────────────
    public res: any = null;
    public inputSystem: any = null;
    public views: any[] = [];
    public renderJobs: Map<any, any> = new Map();
}
