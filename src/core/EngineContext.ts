/**
 * Holds the currently active Engine3D instance.
 * Used by subsystems (GlobalBindGroup, RTResourceMap, etc.) to access
 * per-engine state without creating circular import dependencies.
 * @internal
 */
let _current: any = null;

export const EngineContext = {
    get current(): any {
        return _current;
    },
    set current(v: any) {
        _current = v;
    }
};
