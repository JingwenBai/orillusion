/**
 * Lightweight module for tracking the currently-active engine instance.
 * Since JavaScript is single-threaded, swapping the active engine before
 * each render call is safe and avoids circular-import problems that would
 * arise if subsystems imported Engine3D directly.
 * @internal
 */

let _currentEngineId: number = 0;

export function getCurrentEngineId(): number {
    return _currentEngineId;
}

export function setCurrentEngineId(id: number): void {
    _currentEngineId = id;
}
