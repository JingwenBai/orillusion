/**
 * Active engine registry — a tiny, dependency-free module that lets subsystems
 * obtain the engine currently executing a render frame without importing Engine3D
 * (which would create a circular dependency).
 *
 * Engine3D calls setActiveEngine(this) at the start of every updateFrame().
 * All render-pipeline code executed inside that frame will then find the right
 * engine via getActiveEngine().
 *
 * ComponentBase uses view.engine directly (not this registry) because component
 * start-up can happen while a *different* engine's updateFrame is on the stack.
 *
 * @internal
 */
let _activeEngine: any = null;

export function getActiveEngine(): any {
    return _activeEngine;
}

export function setActiveEngine(engine: any): void {
    _activeEngine = engine;
}
