/**
 * Global registry for the currently active Engine3D instance context.
 * Internal use only — do not import this in user code.
 * @internal
 */

let _activeEngineContext: any = null;

/**
 * Returns the context of the currently active Engine3D instance.
 * Throws if no engine has been initialized.
 * @internal
 */
export function getActiveEngineContext(): any {
    if (!_activeEngineContext) {
        throw new Error('[Orillusion] No active Engine3D instance. Create and call init() on an Engine3D instance first.');
    }
    return _activeEngineContext;
}

/**
 * Sets the active Engine3D context. Called by Engine3D before each render frame
 * so that static utility classes resolve to the correct per-engine state.
 * @internal
 */
export function setActiveEngineContext(ctx: any): void {
    _activeEngineContext = ctx;
}
