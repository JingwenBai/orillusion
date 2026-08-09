import { getActiveEngineContext } from '../EngineRegistry';

/**
 * Tool of time
 * @group Util
 */
export class Time {
    /**
     * The time the engine has been running
     */
    public static get time(): number { return getActiveEngineContext().time; }
    public static set time(v: number) { getActiveEngineContext().time = v; }

    /**
     * the frame count engine is running
     */
    public static get frame(): number { return getActiveEngineContext().frame; }
    public static set frame(v: number) { getActiveEngineContext().frame = v; }

    /**
     * Time from previous frame to present
     */
    public static get delta(): number { return getActiveEngineContext().delta; }
    public static set delta(v: number) { getActiveEngineContext().delta = v; }

    private static _startTime: number = 0;
    private static _timeLabel: string = ``;

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
