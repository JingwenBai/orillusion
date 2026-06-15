/**
 * Lightweight engine context registry.
 * No imports from Engine3D to avoid circular dependencies.
 * @internal
 */

let _currentEngine: any = null;

export function setCurrentEngine(engine: any): void {
    _currentEngine = engine;
}

export function getCurrentEngine(): any {
    return _currentEngine;
}
