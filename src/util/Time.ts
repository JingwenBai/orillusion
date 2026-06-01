/**
 * Tool of time
 * @group Util
 */
export class Time {
    /**
     * The time the engine has been running
     */
    public time: number = 0;
    /**
     * the frame count engine is running
     */
    public frame: number = 0;
    /**
     * Time from previous frame to present
     */
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

    // --------------- Static backward-compat API ---------------
    // Engine3D calls setStaticTime(this.time) at the start of each render
    // frame so that legacy code reading Time.xxx sees the correct values for
    // the engine that is currently rendering.

    public static get time(): number  { return _staticTime.time; }
    public static set time(v: number) { _staticTime.time = v; }

    public static get frame(): number  { return _staticTime.frame; }
    public static set frame(v: number) { _staticTime.frame = v; }

    public static get delta(): number  { return _staticTime.delta; }
    public static set delta(v: number) { _staticTime.delta = v; }

    public static start(label: string) { _staticTime.start(label); }
    public static end() { _staticTime.end(); }
}

/**
 * @internal
 * Points to the Time instance of whichever engine is currently rendering.
 * Engine3D updates this via setStaticTime() at the start of each frame.
 */
export let _staticTime: Time = new Time();

/** @internal */
export function setStaticTime(t: Time): void {
    _staticTime = t;
}
