/**
 * Lightweight holder for the currently-rendering Engine3D instance.
 * Used by per-engine managers (RTResourceMap, GBufferFrame, etc.) to access
 * the active engine without creating circular imports with Engine3D.ts.
 *
 * Since JavaScript is single-threaded, the render loop of each Engine3D
 * instance sets `EngineContext.current` before rendering its frame, so
 * all downstream render-pipeline code that calls static manager methods
 * automatically operates on the correct per-engine state.
 *
 * @internal
 */
export class EngineContext {
    /**
     * The Engine3D instance whose frame is currently being processed.
     * Set by Engine3D at the start of `init()` and each render frame.
     * Cleared (null) after the frame ends.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static current: any = null;
}
