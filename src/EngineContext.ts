/**
 * Registry for the currently active Engine3D instance.
 * Uses `any` to avoid circular imports; callers cast as needed.
 * @internal
 */
let _current: any = null;

export function getActiveEngine(): any {
    return _current;
}

export function setActiveEngine(engine: any): void {
    _current = engine;
}
