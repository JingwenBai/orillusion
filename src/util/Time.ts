/**
 * Per-engine Time state snapshot.
 * @internal
 */
export type TimeState = {
    time: number;
    frame: number;
    delta: number;
};

/**
 * Tool of time
 * @group Util
 */
export class Time {
    /**
     * The time the engine has been running
     */
    public static time: number = 0;
    /**
     * the frame count engine is running
     */
    public static frame: number = 0;
    /**
     * Time from previous frame to present
     */
    public static delta: number = 0;

    private static _startTime: number = 0;
    private static _timeLabel: string = ``;

    /**
     * Create a fresh Time state for a new engine instance.
     * @internal
     */
    public static createEngineState(): TimeState {
        return { time: 0, frame: 0, delta: 0 };
    }

    /**
     * Capture the current Time values into a state snapshot.
     * @internal
     */
    public static captureEngineState(): TimeState {
        return { time: this.time, frame: this.frame, delta: this.delta };
    }

    /**
     * Restore a per-engine Time state as the active global state.
     * @internal
     */
    public static activateEngineState(state: TimeState): void {
        this.time = state.time;
        this.frame = state.frame;
        this.delta = state.delta;
    }

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
