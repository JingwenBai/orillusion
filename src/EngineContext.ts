/**
 * Tracks the currently active engine instance during rendering and initialization.
 * Since JavaScript is single-threaded, only one engine renders at a time.
 * Set at the start of each frame and during startRenderView/init calls.
 * @internal
 */
export class EngineContext {
    private static _current: any = null;

    /**
     * The engine instance currently rendering or initializing.
     * Null between frames.
     */
    public static get current(): any {
        return this._current;
    }

    /** @internal */
    public static setCurrent(engine: any): void {
        this._current = engine;
    }
}
