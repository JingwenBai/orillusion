/**
 * Tracks the currently-rendering Engine3D instance's prefix so that
 * per-engine resources (GBufferFrames, RT textures) are namespaced and
 * never collide between multiple Engine3D instances in the same page.
 *
 * Engine3D sets this before each frame render and restores it after.
 * @internal
 */
export let currentEnginePrefix = '';

export function setCurrentEnginePrefix(prefix: string): void {
    currentEnginePrefix = prefix;
}
