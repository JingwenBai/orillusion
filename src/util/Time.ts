/**
 * Per-engine-instance time data.
 * One EngineTime is created per Engine3D instance.
 * @group Util
 */
export class EngineTime {
    public time: number = 0;
    public frame: number = 0;
    public delta: number = 0;
}

let _activeTime: EngineTime = new EngineTime();

/**
 * @internal
 * Switch the active EngineTime to the given instance.
 * Called by Engine3D before each render cycle.
 */
export function setActiveTime(t: EngineTime): void {
    _activeTime = t;
}

/**
 * Tool of time — static facade over the currently active EngineTime.
 * All existing code using Time.time / Time.delta / Time.frame continues
 * to work unchanged; values automatically reflect the rendering engine.
 * @group Util
 */
export class Time {
    /** The time the engine has been running (ms) */
    public static get time(): number { return _activeTime.time; }
    public static set time(v: number) { _activeTime.time = v; }

    /** The frame count the engine is running */
    public static get frame(): number { return _activeTime.frame; }
    public static set frame(v: number) { _activeTime.frame = v; }

    /** Time from previous frame to present (ms) */
    public static get delta(): number { return _activeTime.delta; }
    public static set delta(v: number) { _activeTime.delta = v; }

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
