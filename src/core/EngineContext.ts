/**
 * Lightweight registry that tracks which Engine3D instance is currently active.
 * Used by rendering subsystems (GBufferFrame, RTResourceMap) to scope
 * per-instance resources without creating circular dependencies on Engine3D.
 * @internal
 */
export class EngineContext {
    /**
     * The instanceId of the Engine3D that is currently initializing or rendering.
     * Set to null when no engine is active.
     */
    public static currentInstanceId: string | null = null;

    /**
     * Returns a namespaced key for the current engine instance.
     * When no instance is active the key is returned unchanged (single-instance compat).
     */
    public static scopeKey(key: string): string {
        return EngineContext.currentInstanceId
            ? `${EngineContext.currentInstanceId}_${key}`
            : key;
    }
}
