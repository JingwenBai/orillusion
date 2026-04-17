/**
 * Registry for the currently active Engine3D instance.
 * Since JavaScript is single-threaded, only one engine renders at a time.
 * Each engine sets itself as active before its render frame so all subsystems
 * that delegate through static APIs route to the correct per-engine state.
 * @group engine3D
 */
export class EngineContext {
    private static _active: any = null;

    /** The Engine3D instance that is currently executing a render frame. */
    public static get current(): any {
        return this._active;
    }

    /** Called by Engine3D before every render frame to activate this instance. */
    public static setActive(engine: any): void {
        this._active = engine;
    }
}
