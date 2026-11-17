/**
 * Lightweight registry for the currently-active Engine3D instance ID.
 * Used by resource managers (RTResourceMap, GBufferFrame) to scope resources
 * per engine instance without creating circular imports.
 * @internal
 */
export let activeEngineId: string = '_default';

export function setActiveEngineId(id: string): void {
    activeEngineId = id;
}
