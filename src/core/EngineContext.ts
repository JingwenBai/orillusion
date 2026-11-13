import { Context3D } from '../gfx/graphics/webGpu/Context3D';

/**
 * Per-Engine3D-instance context container. Each Engine3D instance owns one
 * EngineContext which holds the per-canvas WebGPU context and any other
 * per-instance state that must not be shared across concurrent engines.
 * @group engine3D
 */
export class EngineContext {
    /** Unique numeric id for this engine instance */
    public readonly id: number;
    /** Per-instance canvas and WebGPU canvas context */
    public readonly canvasContext: Context3D;

    private static _nextId: number = 0;

    constructor() {
        this.id = EngineContext._nextId++;
        this.canvasContext = new Context3D();
    }
}
