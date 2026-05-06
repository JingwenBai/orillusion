/**
 * Module-level registry for the currently active Engine3D instance.
 * Uses `any` to avoid circular imports — callers cast as needed.
 * @internal
 */
let _current: any = null;

export function setCurrentEngine(engine: any): void {
    _current = engine;
}

export function getCurrentEngine(): any {
    return _current;
}
