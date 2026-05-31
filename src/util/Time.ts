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
    /**
     * @internal
     * @param label
     */
    public start(label: string) {
        this._startTime = performance.now();
        this._timeLabel = label;
    }

    /**
     * @internal
     */
    public end() {
        console.log(this._timeLabel, performance.now() - this._startTime);
    }
}
