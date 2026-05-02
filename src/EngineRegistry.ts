/**
 * @internal
 * Lightweight registry that breaks the circular dependency between Engine3D
 * and the per-engine resource maps (RTResourceMap, GBufferFrame, …).
 *
 * Engine3D sets the accessor once during class definition; the resource maps
 * call it to reach the currently-active or default Engine3D instance without
 * importing Engine3D directly.
 */

/** Interface that the resource maps use to reach the active Engine3D instance. */
export interface IEngineAccessor {
    /** Returns the engine currently executing a render frame, or the default instance. */
    getActiveOrDefault(): IEngineContext;
}

/** Subset of Engine3D exposed to per-engine resource helpers. */
export interface IEngineContext {
    rtResourceMap: import('./gfx/renderJob/frame/RTResourceMap').RTResourceMap;
    gBufferFrameMap: Map<string, import('./gfx/renderJob/frame/GBufferFrame').GBufferFrame>;
}

let _accessor: IEngineAccessor | null = null;

/**
 * @internal
 * Called once by Engine3D to register its static accessor.
 */
export function registerEngineAccessor(accessor: IEngineAccessor): void {
    _accessor = accessor;
}

/**
 * @internal
 * Used by RTResourceMap / GBufferFrame static proxies.
 * Throws if Engine3D has not been initialised yet.
 */
export function getActiveEngine(): IEngineContext {
    if (!_accessor) {
        throw new Error('[Orillusion] Engine3D has not been initialised yet.');
    }
    return _accessor.getActiveOrDefault();
}
