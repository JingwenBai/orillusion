/**
 * @internal
 * Registry for the currently active Engine3D instance.
 * Used by static sub-system classes to route calls to the correct per-engine state.
 */
export class EngineContext {
    private static _current: any = null;
    private static _instances: any[] = [];

    /** Register a new engine instance and set it as active */
    public static register(engine: any): void {
        if (this._instances.indexOf(engine) === -1) {
            this._instances.push(engine);
        }
        this._current = engine;
    }

    /** Unregister an engine instance */
    public static unregister(engine: any): void {
        const idx = this._instances.indexOf(engine);
        if (idx !== -1) this._instances.splice(idx, 1);
        if (this._current === engine) {
            this._current = this._instances[this._instances.length - 1] ?? null;
        }
    }

    /** Set the active engine explicitly (called before each engine renders) */
    public static setActive(engine: any): void {
        this._current = engine;
    }

    /** The currently active engine instance */
    public static get current(): any {
        return this._current;
    }

    /** All registered engine instances */
    public static get all(): any[] {
        return this._instances;
    }
}
