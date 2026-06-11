/**
 * Tracks the currently active Engine3D instance ID.
 * Used internally by resource managers to scope resources per engine instance.
 * @internal
 */
export let currentEngineId: string = '';

/** @internal */
export function setCurrentEngineId(id: string): void {
    currentEngineId = id;
}
