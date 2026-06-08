/**
 * @internal
 * Lightweight registry for the currently rendering engine's per-instance subsystems.
 * Engine3D sets this before each frame so static backward-compat APIs can route correctly.
 */
export const ActiveEngineContext: {
    componentCollect: any;
    globalBindGroup: any;
    shadowLightsCollect: any;
    entityCollect: any;
    rtResourceMap: any;
    gBufferFrameMap: Map<string, any>;

    activate(engine: {
        componentCollect: any;
        globalBindGroup: any;
        shadowLightsCollect: any;
        entityCollect: any;
        rtResourceMap: any;
        gBufferFrameMap: Map<string, any>;
    }): void;
} = {
    componentCollect: null,
    globalBindGroup: null,
    shadowLightsCollect: null,
    entityCollect: null,
    rtResourceMap: null,
    gBufferFrameMap: null,

    activate(engine) {
        this.componentCollect = engine.componentCollect;
        this.globalBindGroup = engine.globalBindGroup;
        this.shadowLightsCollect = engine.shadowLightsCollect;
        this.entityCollect = engine.entityCollect;
        this.rtResourceMap = engine.rtResourceMap;
        this.gBufferFrameMap = engine.gBufferFrameMap;
    },
};
