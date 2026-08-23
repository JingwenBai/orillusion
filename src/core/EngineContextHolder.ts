/**
 * Holds a reference to the currently active engine instance.
 * Used by per-engine subsystems (RTResourceMap, GBufferFrame, etc.)
 * to avoid circular imports with Engine3D while still routing
 * static-facade calls to the correct per-engine instance.
 * @internal
 */

export interface IEngineContext {
    rtResourceMap: any;
    gBufferMap: Map<string, any>;
    componentCollect: any;
    shadowLightsCollect: any;
    globalBindGroup: any;
    context: any;
}

let _activeEngine: IEngineContext | null = null;

export function getActiveEngine(): IEngineContext | null {
    return _activeEngine;
}

export function setActiveEngine(engine: IEngineContext | null): void {
    _activeEngine = engine;
}
