/**
 * Module-level current-engine holder.
 * Set by each Engine3D instance at the start of its render frame so that
 * legacy static-style accessors (ComponentCollect.bindUpdate, EntityCollect.instance, …)
 * automatically forward to the correct per-instance subsystem.
 * @internal
 */
let _currentEngine: any = null;

export function setCurrentEngine(engine: any): void {
    _currentEngine = engine;
}

export function getCurrentEngine(): any {
    return _currentEngine;
}
