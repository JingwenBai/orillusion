/**
 * Per-engine frame timing.
 *
 * Instance fields are owned by each Engine3D instance.
 * Static accessors are backward-compatible facades that delegate to the
 * currently active Time instance (set by Engine3D before each frame).
 * @group Util
 */
export class Time {

    // ── Active-instance pointer (set by Engine3D) ─────────────────────────────
    /** @internal */
    public static _current: Time | null = null;

    // ── Instance state ────────────────────────────────────────────────────────
    /** The time the engine has been running (ms) */
    public time: number = 0;
    /** The frame count */
    public frame: number = 0;
    /** Time delta since the previous frame (ms) */
    public delta: number = 0;

    private _startTime: number = 0;
    private _timeLabel: string = ``;

    /** @internal */
    public start(label: string) {
        this._startTime = performance.now();
        this._timeLabel = label;
    }

    /** @internal */
    public end() {
        console.log(this._timeLabel, performance.now() - this._startTime);
    }

    // ── Static facades (backward-compatible) ──────────────────────────────────

    /**
     * The time the engine has been running.
     * Delegates to the currently active engine's Time instance.
     */
    public static get time(): number { return Time._current?.time ?? 0; }
    public static set time(v: number) { if (Time._current) Time._current.time = v; }

    /**
     * The frame count.
     */
    public static get frame(): number { return Time._current?.frame ?? 0; }
    public static set frame(v: number) { if (Time._current) Time._current.frame = v; }

    /**
     * Time from previous frame to present.
     */
    public static get delta(): number { return Time._current?.delta ?? 0; }
    public static set delta(v: number) { if (Time._current) Time._current.delta = v; }

    public static start(label: string) {
        Time._current?.start(label);
    }

    public static end() {
        Time._current?.end();
    }
}
