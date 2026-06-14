/**
 * Engine scope management for multi-instance support.
 * Each Engine3D instance has a unique scope ID that is set as the active
 * scope before rendering. Resource maps use this scope as a key prefix so
 * that different engine instances never share render textures or GBuffer frames.
 * @internal
 */
let _currentScope: string = '';

/**
 * Set the active engine scope (called at the start of each engine's frame).
 * @internal
 */
export function setEngineScope(scope: string): void {
    _currentScope = scope;
}

/**
 * Return a scope-prefixed key so that resources are isolated per engine instance.
 * @internal
 */
export function scopedKey(name: string): string {
    return _currentScope ? `${_currentScope}::${name}` : name;
}
