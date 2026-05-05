import { RenderTexture } from '../../textures/RenderTexture';
import { ViewQuad } from '../../core/ViewQuad';

/**
 * Per-engine render resource maps.
 * Each Engine3D instance owns one of these; the active engine's maps
 * are exposed through the static helpers below so that RTResourceMap
 * and GBufferFrame can continue to use their existing static API.
 * @internal
 */
export interface EngineRenderMaps {
    rtTextureMap: Map<string, RenderTexture>;
    rtViewQuad: Map<string, ViewQuad>;
    /** typed as `any` to avoid a circular import with GBufferFrame */
    gBufferMap: Map<string, any>;
}

let _active: EngineRenderMaps | null = null;

/**
 * Switch the active engine render maps.
 * Called by Engine3D._activate() before each frame and during init.
 * @internal
 */
export function setActiveEngineRenderMaps(maps: EngineRenderMaps): void {
    _active = maps;
}

/**
 * Returns the active engine's render maps.
 * Throws if called before any Engine3D has been initialised.
 * @internal
 */
export function getActiveEngineRenderMaps(): EngineRenderMaps {
    if (!_active) throw new Error('No active Engine3D instance');
    return _active;
}
