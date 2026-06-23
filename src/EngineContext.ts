/**
 * Central registry for the currently-active Engine3D instance.
 * This thin module exists to break circular import chains:
 * subsystems (GlobalBindGroup, ComponentCollect, …) need access to the
 * current engine but are themselves imported by Engine3D.
 * @internal
 */

let _current: any = null;

export function getCurrentEngine(): any {
    return _current;
}

export function setCurrentEngine(engine: any): void {
    _current = engine;
}
