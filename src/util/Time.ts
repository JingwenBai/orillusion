/**
 * Tool of time
 * @group Util
 */
export class Time {

    // =========================================================
    // Instance state
    // =========================================================

    /** The time the engine has been running */
    public time: number = 0;
    /** The frame count engine is running */
    public frame: number = 0;
    /** Time from previous frame to present */
    public delta: number = 0;

    private _startTime: number = 0;
    private _timeLabel: string = ``;

    public start(label: string) {
        this._startTime = performance.now();
        this._timeLabel = label;
    }

    public end() {
        console.log(this._timeLabel, performance.now() - this._startTime);
    }

    // =========================================================
    // Static delegation to the currently-active instance
    // =========================================================

    private static _current: Time = new Time();

    public static setCurrent(instance: Time) {
        Time._current = instance;
    }

    public static get time(): number { return Time._current.time; }
    public static set time(v: number) { Time._current.time = v; }

    public static get frame(): number { return Time._current.frame; }
    public static set frame(v: number) { Time._current.frame = v; }

    public static get delta(): number { return Time._current.delta; }
    public static set delta(v: number) { Time._current.delta = v; }

    public static start(label: string) { Time._current.start(label); }
    public static end() { Time._current.end(); }
}
