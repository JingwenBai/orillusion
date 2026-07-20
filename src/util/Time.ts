import { getCurrentEngine } from '../gfx/EngineContext';

/**
 * Per-engine time state.
 * @group Util
 */
export class EngineTime {
    public time: number = 0;
    public frame: number = 0;
    public delta: number = 0;
    private _startTime: number = 0;
    private _timeLabel: string = '';

    public start(label: string): void {
        this._startTime = performance.now();
        this._timeLabel = label;
    }

    public end(): void {
        console.log(this._timeLabel, performance.now() - this._startTime);
    }
}

/**
 * Tool of time — static proxy to the current engine's time instance.
 * @group Util
 */
export class Time {
    public static get time(): number { return getCurrentEngine()?.time?.time ?? 0; }
    public static set time(v: number) { if (getCurrentEngine()?.time) getCurrentEngine().time.time = v; }

    public static get frame(): number { return getCurrentEngine()?.time?.frame ?? 0; }
    public static set frame(v: number) { if (getCurrentEngine()?.time) getCurrentEngine().time.frame = v; }

    public static get delta(): number { return getCurrentEngine()?.time?.delta ?? 0; }
    public static set delta(v: number) { if (getCurrentEngine()?.time) getCurrentEngine().time.delta = v; }

    private static _startTime: number = 0;
    private static _timeLabel: string = '';

    /** @internal */
    public static start(label: string): void {
        this._startTime = performance.now();
        this._timeLabel = label;
    }

    /** @internal */
    public static end(): void {
        console.log(this._timeLabel, performance.now() - this._startTime);
    }
}
