/**
 * @internal
 * Active-engine registry.
 * Engine3D.active setter calls setActiveEngine() to keep this in sync.
 * All per-engine static shims read from getActiveEngine() so they
 * always operate on the engine that is currently initializing or rendering.
 */
let _engine: any = null;

export function setActiveEngine(engine: any): void {
    _engine = engine;
}

export function getActiveEngine(): any {
    return _engine;
}
