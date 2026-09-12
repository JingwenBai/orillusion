/**
 * Thin registry for the currently-active Engine3D instance.
 * Subsystem classes import from here (not from Engine3D) to avoid circular dependencies.
 * @internal
 */

let _active: any = null;
let _default: any = null;

export function getActiveEngine(): any {
    return _active;
}

export function setActiveEngine(engine: any): void {
    _active = engine;
    if (!_default) {
        _default = engine;
    }
}

export function getDefaultEngine(): any {
    return _default;
}

export function setDefaultEngine(engine: any): void {
    _default = engine;
}
