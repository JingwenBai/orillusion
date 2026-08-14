/**
 * Lightweight registry for the active Engine3D instance.
 * Used by static rendering subsystems (GBufferFrame, RTResourceMap) to scope
 * per-engine GPU resources without requiring an explicit engine reference.
 * @internal
 */
let _activeEngineId: string = '';

export function getActiveEngineId(): string {
    return _activeEngineId;
}

export function setActiveEngineId(id: string): void {
    _activeEngineId = id;
}
