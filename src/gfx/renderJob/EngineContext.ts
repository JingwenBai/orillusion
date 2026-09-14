/**
 * Tracks the currently-rendering Engine3D instance's context.
 * Updated by each Engine3D before it renders its frame, enabling
 * resource maps (GBufferFrame, RTResourceMap) to namespace their
 * entries per-engine without circular imports.
 * @internal
 */
export class EngineContext {
    /** Unique ID of the currently-rendering engine (e.g. "engine0") */
    public static id: string = '';
}
