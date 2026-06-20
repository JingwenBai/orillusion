import { getCurrentEngineId } from '../core/EngineContext';

interface TimeData {
    time: number;
    frame: number;
    delta: number;
}

/**
 * Tool of time
 * @group Util
 */
export class Time {
    private static _store: Map<number, TimeData> = new Map();

    private static _data(): TimeData {
        const id = getCurrentEngineId();
        let d = Time._store.get(id);
        if (!d) {
            d = { time: 0, frame: 0, delta: 0 };
            Time._store.set(id, d);
        }
        return d;
    }

    /**
     * The time the engine has been running
     */
    public static get time(): number { return Time._data().time; }
    public static set time(v: number) { Time._data().time = v; }

    /**
     * the frame count engine is running
     */
    public static get frame(): number { return Time._data().frame; }
    public static set frame(v: number) { Time._data().frame = v; }

    /**
     * Time from previous frame to present
     */
    public static get delta(): number { return Time._data().delta; }
    public static set delta(v: number) { Time._data().delta = v; }

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
