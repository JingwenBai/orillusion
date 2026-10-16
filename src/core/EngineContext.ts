import { Context3D, setActiveWebGPUContext } from '../gfx/graphics/webGpu/Context3D';

/**
 * Per-engine-instance context. Holds all mutable state that must be isolated between
 * multiple concurrent Engine3D instances (e.g. multiple canvases on the same page).
 *
 * The static `current` pointer is set via `EngineContext.activate()` immediately before
 * each engine renders its frame, so every system that reads `EngineContext.current`
 * automatically sees the correct per-engine state. This works safely because JavaScript
 * is single-threaded: only one engine frame runs at a time.
 * @internal
 */
export class EngineContext {
    private static _current: EngineContext | null = null;

    /** The engine context currently executing a render frame. */
    public static get current(): EngineContext | null {
        return EngineContext._current;
    }

    /**
     * Activate this context as the "current" engine context.
     * Updates the module-level `webGPUContext` live binding so that all subsystems
     * that import it directly automatically resolve to this engine's canvas/context.
     */
    public static activate(ctx: EngineContext): void {
        EngineContext._current = ctx;
        setActiveWebGPUContext(ctx.webGPUContext);
    }

    /** Per-engine WebGPU canvas context. */
    public webGPUContext: Context3D;

    /**
     * Per-engine render-texture cache, keyed by name string.
     * Replaces the global static `RTResourceMap.rtTextureMap` / `rtViewQuad`.
     */
    public rtTextureMap: Map<string, any>;
    public rtViewQuad: Map<string, any>;

    /**
     * Per-engine GBuffer frame cache, keyed by name string.
     * Replaces the global static `GBufferFrame.gBufferMap`.
     */
    public gBufferMap: Map<string, any>;

    constructor() {
        this.webGPUContext = new Context3D();
        this.rtTextureMap = new Map();
        this.rtViewQuad = new Map();
        this.gBufferMap = new Map();
    }
}
