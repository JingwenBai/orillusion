/**
 * Global registry for active Engine3D instances.
 * Enables multi-instance support by tracking which engine is currently
 * initializing or rendering, so shared singleton utilities can delegate
 * to the right per-engine resources.
 * @internal
 */
export class EngineRegistry {
    /**
     * The Engine3D instance currently being initialized or rendering a frame.
     * Set by Engine3D.activate() and cleared after each operation.
     * @internal
     */
    public static current: IEngineContext | null = null;

    /**
     * The first / default Engine3D instance created on this page.
     * Used as a fallback when no engine is explicitly "current".
     * @internal
     */
    public static default: IEngineContext | null = null;

    /**
     * Returns current if set, otherwise default. Never throws.
     * @internal
     */
    public static get active(): IEngineContext | null {
        return EngineRegistry.current ?? EngineRegistry.default;
    }
}

/**
 * Minimal interface exposing the per-engine resources that shared singletons
 * need to look up. Avoids a circular import between EngineRegistry and Engine3D.
 * @internal
 */
export interface IEngineContext {
    /** Per-engine WebGPU canvas context */
    context3D: any;
    /** Per-engine entity/render-node registry */
    entityCollect: any;
    /** Per-engine G-buffer frame map */
    gBufferFrames: Map<string, any>;
    /** Per-engine render-texture registry */
    rtTextureMap: Map<string, any>;
    /** Per-engine ViewQuad registry */
    rtViewQuad: Map<string, any>;
}
