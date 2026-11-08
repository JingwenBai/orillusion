/**
 * Lightweight holder for the currently-active Engine3D instance.
 * Subsystem static facades read this to route calls to the right per-engine state.
 * @internal
 */
let _currentEngine: any = null;

export function getCurrentEngine(): any {
    return _currentEngine;
}

export function setCurrentEngine(engine: any): void {
    _currentEngine = engine;
}
