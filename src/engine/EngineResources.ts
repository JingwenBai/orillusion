/**
 * Per-engine resource maps, switched by the active Engine3D before each render frame.
 * This allows multiple Engine3D instances to maintain isolated render targets and
 * GBuffer frames while the static helper classes (RTResourceMap, GBufferFrame) keep
 * their unchanged call-site API.
 * @internal
 */

export interface IEngineResources {
    rtTextureMap: Map<string, any>;
    rtViewQuad: Map<string, any>;
    gBufferMap: Map<string, any>;
}

let _active: IEngineResources = {
    rtTextureMap: new Map(),
    rtViewQuad: new Map(),
    gBufferMap: new Map(),
};

export function setActiveEngineResources(res: IEngineResources): void {
    _active = res;
}

export function getActiveEngineResources(): IEngineResources {
    return _active;
}
