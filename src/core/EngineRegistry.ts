/**
 * Engine instance registry — holds a reference to the currently-active
 * Engine3D instance so that subsystems (ComponentCollect, RTResourceMap, etc.)
 * can access per-engine state through their static façade APIs without
 * creating circular module dependencies.
 *
 * This module has NO imports from the engine itself.
 * @internal
 */

export type ActiveEngineContext = {
    componentCollect: import('../gfx/renderJob/collect/ComponentCollect').ComponentCollect;
    rtResourceMap: import('../gfx/renderJob/frame/RTResourceMap').RTResourceMap;
    gBufferMap: Map<string, import('../gfx/renderJob/frame/GBufferFrame').GBufferFrame>;
    context3D: import('../gfx/graphics/webGpu/Context3D').Context3D;
};

let _active: ActiveEngineContext | null = null;

/**
 * Returns the currently-active engine subsystems, or null if no engine has
 * activated itself (e.g. before Engine3D.init() is called).
 */
export function getActiveEngineContext(): ActiveEngineContext | null {
    return _active;
}

/**
 * Called by Engine3D before each render frame (and during init) to
 * declare which engine is currently active.
 */
export function setActiveEngineContext(ctx: ActiveEngineContext | null): void {
    _active = ctx;
}
