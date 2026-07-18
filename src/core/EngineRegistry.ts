/**
 * Central registry for the currently active Engine3D instance.
 * Using `any` type to avoid circular dependency with Engine3D.
 * @internal
 */
let _current: any = null;

export const EngineRegistry = {
    get current(): any { return _current; },
    setCurrent(engine: any): void { _current = engine; }
};
