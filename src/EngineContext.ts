import { Context3D, setWebGPUContext } from './gfx/graphics/webGpu/Context3D';
import { ViewQuad } from './core/ViewQuad';
import { RenderTexture } from './textures/RenderTexture';

/**
 * Per-engine-instance context container.
 * Holds all state that must be isolated between Engine3D instances.
 * Uses an "active context" pattern: before each engine renders, it calls
 * EngineContext.makeCurrent() which updates the module-level webGPUContext
 * and makes per-engine maps accessible via EngineContext.current.
 *
 * @group Engine
 */
export class EngineContext {

    private static _current: EngineContext;

    /**
     * The currently rendering engine context.
     * Valid during an engine's render frame; set by makeCurrent().
     */
    public static get current(): EngineContext {
        return EngineContext._current;
    }

    /**
     * Activate this context for rendering.
     * Updates the module-level webGPUContext so all subsystems see this engine's canvas.
     */
    public makeCurrent(): void {
        EngineContext._current = this;
        setWebGPUContext(this.context3D);
    }

    /** Per-instance WebGPU canvas context */
    public context3D: Context3D = new Context3D();

    /** Per-instance render texture registry (replaces RTResourceMap static maps) */
    public rtTextureMap: Map<string, RenderTexture> = new Map();

    /** Per-instance view quad registry (replaces RTResourceMap static view quad map) */
    public rtViewQuadMap: Map<string, ViewQuad> = new Map();

    /** Per-instance GBuffer frame registry (replaces GBufferFrame.gBufferMap) */
    public gBufferMap: Map<string, any> = new Map();
}
