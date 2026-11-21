/**
 * Lightweight bridge to break circular imports between Engine3D and sub-systems.
 * Engine3D calls setCurrentEngine(this) on init and every render frame.
 * Sub-systems import getCurrentEngine() to implement backward-compat static methods.
 */
let _current: any = null;

export function getCurrentEngine(): any {
    return _current;
}

export function setCurrentEngine(engine: any): void {
    _current = engine;
}
