/**
 * Per-engine time state. Each Engine3D instance owns one of these.
 * @group Util
 */
export class TimeState {
    public time: number = 0;
    public frame: number = 0;
    public delta: number = 0;
}

let _activeTimeState: TimeState = new TimeState();

/**
 * Switch the time state that the static Time class reads/writes.
 * Called by Engine3D at the start of each frame.
 * @internal
 */
export function activateTime(state: TimeState): void {
    _activeTimeState = state;
}

/**
 * Tool of time — static API backed by the currently active engine's TimeState.
 * @group Util
 */
export class Time {
    /**
     * The time the active engine has been running.
     */
    public static get time(): number { return _activeTimeState.time; }
    public static set time(v: number) { _activeTimeState.time = v; }

    /**
     * The frame count the active engine is running.
     */
    public static get frame(): number { return _activeTimeState.frame; }
    public static set frame(v: number) { _activeTimeState.frame = v; }

    /**
     * Time from previous frame to present in the active engine.
     */
    public static get delta(): number { return _activeTimeState.delta; }
    public static set delta(v: number) { _activeTimeState.delta = v; }

    private static _startTime: number = 0;
    private static _timeLabel: string = ``;

    /** @internal */
    public static start(label: string) {
        this._startTime = performance.now();
        this._timeLabel = label;
    }

    /** @internal */
    public static end() {
        console.log(this._timeLabel, performance.now() - this._startTime);
    }
}
