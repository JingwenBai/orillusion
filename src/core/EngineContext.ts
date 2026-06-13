/**
 * Tracks the currently active Engine3D instance.
 * Automatically set during Engine3D.init() and at the start of each render frame,
 * enabling per-engine state routing through static class interfaces.
 * @group engine3D
 */
export class EngineContext {
    // typed as any to avoid circular import with Engine3D
    private static _current: any = null;

    /** The currently active Engine3D instance */
    public static get current(): any {
        return this._current;
    }

    /** @internal */
    public static setCurrent(engine: any): void {
        this._current = engine;
    }
}
