/**
 * Shared active-engine state.
 *
 * Subsystems (GBufferFrame, RTResourceMap …) that need access to the currently
 * rendering Engine3D instance import this module instead of importing Engine3D
 * directly.  This breaks the otherwise circular import chain
 * Engine3D → GBufferFrame → Engine3D.
 *
 * Engine3D sets `EngineContext.current` at the start of each frame and
 * restores it at the end.
 *
 * @internal
 */
export const EngineContext: {
    /** The Engine3D instance whose render frame is currently executing, or null. */
    current: {
        gBufferMap: Map<string, any>;
        rtTextureMap: Map<string, any>;
        rtViewQuad: Map<string, any>;
        context: { presentationSize: number[] };
        setting: any;
    } | null;
} = {
    current: null,
};
