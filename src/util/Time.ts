/**
 * @internal
 * Per-engine time state.
 */
export class TimeState {
    public time: number = 0;
    public frame: number = 0;
    public delta: number = 0;
}

/**
 * Tool of time
 * @group Util
 */
export class Time {
    private static _state: TimeState = new TimeState();

    /** Create a fresh TimeState for a new Engine3D instance. */
    public static createState(): TimeState {
        return new TimeState();
    }

    /** Activate the given state as the current context (called by Engine3D). */
    public static activateState(state: TimeState): void {
        Time._state = state;
    }

    /**
     * The time the engine has been running
     */
    public static get time(): number { return this._state.time; }
    public static set time(v: number) { this._state.time = v; }

    /**
     * the frame count engine is running
     */
    public static get frame(): number { return this._state.frame; }
    public static set frame(v: number) { this._state.frame = v; }

    /**
     * Time from previous frame to present
     */
    public static get delta(): number { return this._state.delta; }
    public static set delta(v: number) { this._state.delta = v; }

    private static _startTime: number = 0;
    private static _timeLabel: string = ``;

    /**
     * @internal
     * @param label
     */
    public static start(label: string) {
        this._startTime = performance.now();
        this._timeLabel = label;
    }

    /**
     * @internal
     */
    public static end() {
        console.log(this._timeLabel, performance.now() - this._startTime);
    }
}
