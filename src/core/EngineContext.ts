/**
 * Lightweight registry that tracks the currently active Engine3D instance.
 * Avoids circular imports by using 'any' for engine references.
 * @internal
 */
export interface IEngineSubsystems {
    componentCollect: any;
    entityCollect: any;
    globalBindGroup: any;
    shadowLightsCollect: any;
    rtResourceMap: any;
    gBufferMap: Map<string, any>;
}

let _current: IEngineSubsystems | null = null;

export function setCurrentEngineContext(ctx: IEngineSubsystems | null): void {
    _current = ctx;
}

export function getCurrentEngineContext(): IEngineSubsystems | null {
    return _current;
}
