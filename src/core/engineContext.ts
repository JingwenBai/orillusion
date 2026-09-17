/**
 * Registry for per-engine-instance subsystems.
 * Subsystem classes use this to route static method calls to the correct engine instance.
 * Has no runtime imports to avoid circular dependencies.
 * @internal
 */

export interface IEngineSubsystems {
    readonly globalBindGroup: any;
    readonly rtResourceMap: any;
    readonly shadowLightsCollect: any;
    readonly shaderUtil: any;
    readonly gBufferMap: Map<string, any>;
}

let _active: IEngineSubsystems | null = null;

/** @internal */
export function setActiveEngineSubsystems(s: IEngineSubsystems | null): void {
    _active = s;
}

/** @internal */
export function getActiveEngineSubsystems(): IEngineSubsystems {
    if (!_active) {
        throw new Error('No active Engine3D instance. Call engine.init() or engine.activate() first.');
    }
    return _active;
}
