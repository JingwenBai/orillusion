/**
 * Tracks the currently active engine instance ID.
 * Engine3D sets this before each frame so that shared static
 * maps (GBufferFrame, RTResourceMap) can scope their entries
 * per engine instance.
 * @internal
 */
let _activeEngineId: string = 'default';

export function getActiveEngineId(): string {
    return _activeEngineId;
}

export function setActiveEngineId(id: string): void {
    _activeEngineId = id;
}
