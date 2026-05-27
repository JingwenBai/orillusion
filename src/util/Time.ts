/**
 * Per-engine time state. Each Engine3D instance holds one of these.
 * @internal
 */
export interface TimeState {
    time: number;
    frame: number;
    delta: number;
}

let _current: TimeState | null = null;

/**
 * @internal
 * Activate a time state as the current one. Called by Engine3D before each frame.
 */
export function _setCurrentTime(state: TimeState | null): void {
    _current = state;
}

/**
 * Tool of time
 * @group Util
 */
export class Time {
    /**
     * The time the engine has been running (milliseconds).
     * Reads from the currently active engine instance.
     */
    public static get time(): number { return _current?.time ?? 0; }
    public static set time(v: number) { if (_current) _current.time = v; }

    /**
     * The frame count the engine is running.
     * Reads from the currently active engine instance.
     */
    public static get frame(): number { return _current?.frame ?? 0; }
    public static set frame(v: number) { if (_current) _current.frame = v; }

    /**
     * Time from previous frame to present (milliseconds).
     * Reads from the currently active engine instance.
     */
    public static get delta(): number { return _current?.delta ?? 0; }
    public static set delta(v: number) { if (_current) _current.delta = v; }

    private static _startTime: number = 0;
    private static _timeLabel: string = ``;

    /**
     * @internal
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
