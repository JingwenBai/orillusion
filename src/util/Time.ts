/** @internal Per-engine time state */
export class TimeState {
    time: number = 0;
    frame: number = 0;
    delta: number = 0;
    _startTime: number = 0;
    _timeLabel: string = '';
}

let _state: TimeState = new TimeState();

/** @internal */
export function _createTimeState(): TimeState { return new TimeState(); }
/** @internal */
export function _setActiveTime(s: TimeState): void { _state = s; }

/**
 * Tool of time
 * @group Util
 */
export class Time {
    /** The time the engine has been running */
    public static get time(): number { return _state.time; }
    public static set time(v: number) { _state.time = v; }

    /** the frame count engine is running */
    public static get frame(): number { return _state.frame; }
    public static set frame(v: number) { _state.frame = v; }

    /** Time from previous frame to present */
    public static get delta(): number { return _state.delta; }
    public static set delta(v: number) { _state.delta = v; }

    /** @internal */
    public static start(label: string) {
        _state._startTime = performance.now();
        _state._timeLabel = label;
    }

    /** @internal */
    public static end() {
        console.log(_state._timeLabel, performance.now() - _state._startTime);
    }
}
