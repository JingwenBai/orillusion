/**
 * @internal
 * Lightweight global registry for the currently-rendering engine.
 * Imported by subsystems (GBufferFrame, RTResourceMap, …) that need a per-engine
 * namespace without creating a circular dependency on Engine3D itself.
 */

/** Numeric ID of the engine whose render() is currently executing. 0 = first/default. */
export let currentEngineId: number = 0;

export function setCurrentEngineId(id: number): void {
    currentEngineId = id;
}
