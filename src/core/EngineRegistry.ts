/**
 * Global registry for the currently active Engine3D instance.
 * Used by subsystems (RTResourceMap, GBufferFrame, etc.) to access
 * per-engine state without creating circular imports with Engine3D.ts.
 * @internal
 */
let _current: unknown = null;

export function setCurrentEngine(engine: unknown): void {
    _current = engine;
}

export function getCurrentEngine(): unknown {
    return _current;
}
