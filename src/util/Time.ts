/**
 * Tool of time
 * @group Util
 */
export class Time {

    /**
     * Active instance — set by Engine3D.activate() before each frame.
     * @internal
     */
    public static current: Time;

    // ── instance state ────────────────────────────────────────────────────────

    public time: number = 0;
    public frame: number = 0;
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

    // ── static shims (delegate to Time.current) ───────────────────────────────

    public static get time(): number { return Time.current.time; }
    public static set time(v: number) { Time.current.time = v; }

    public static get frame(): number { return Time.current.frame; }
    public static set frame(v: number) { Time.current.frame = v; }

    public static get delta(): number { return Time.current.delta; }
    public static set delta(v: number) { Time.current.delta = v; }

    public static start(label: string) { Time.current.start(label); }
    public static end() { Time.current.end(); }
}
