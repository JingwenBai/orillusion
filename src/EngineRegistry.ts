/**
 * @internal
 * Lightweight registry holding the currently-active Engine3D instance.
 * Uses `any` to avoid circular-import cycles between Engine3D and its subsystems.
 */

let _activeEngine: any = null;

/**
 * Register an engine as the currently-active instance.
 * Called by Engine3D before each render frame.
 * @internal
 */
export function setActiveEngine(engine: any): void {
    _activeEngine = engine;
}

/**
 * Return the currently-active Engine3D instance, or null if none.
 * Used by GBufferFrame, RTResourceMap, and EntityCollect to retrieve
 * per-engine resource maps without creating a circular import.
 * @internal
 */
export function getActiveEngine(): any {
    return _activeEngine;
}
