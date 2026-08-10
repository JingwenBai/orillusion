import { getActiveEngine } from '../_activeEngine';

/**
 * Tool of time — per-engine state delegated via the active Engine3D.
 * @group Util
 */
export class Time {
    /**
     * The time the engine has been running (milliseconds)
     */
    public static get time(): number { return getActiveEngine()?._timeState?.time ?? 0; }
    public static set time(v: number) { const s = getActiveEngine()?._timeState; if (s) s.time = v; }

    /**
     * The frame count the engine is running
     */
    public static get frame(): number { return getActiveEngine()?._timeState?.frame ?? 0; }
    public static set frame(v: number) { const s = getActiveEngine()?._timeState; if (s) s.frame = v; }

    /**
     * Time from the previous frame to the present (milliseconds)
     */
    public static get delta(): number { return getActiveEngine()?._timeState?.delta ?? 0; }
    public static set delta(v: number) { const s = getActiveEngine()?._timeState; if (s) s.delta = v; }

    private static _startTime: number = 0;
    private static _timeLabel: string = '';

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
