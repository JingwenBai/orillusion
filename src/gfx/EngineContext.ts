// Lightweight engine context registry — zero imports to avoid circular dependencies.
// Engine3D sets the current handle before each render frame; GPU subsystems read
// it to locate their per-engine state without importing Engine3D directly.

let _currentHandle: object | null = null;

export function setCurrentHandle(handle: object | null): void {
    _currentHandle = handle;
}

export function getCurrentHandle(): object | null {
    return _currentHandle;
}
