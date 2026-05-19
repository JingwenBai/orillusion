import { CEvent } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CanvasConfig } from './CanvasConfig';
import { EngineContext } from './EngineContext';

/**
 * Shared GPU device state + proxy for the currently-active EngineContext.
 * One GPUDevice is shared across all Engine3D instances (creating multiple
 * devices is expensive). Each instance has its own EngineContext with its
 * own canvas / GPUCanvasContext / size / resource maps.
 *
 * Before each engine renders it calls webGPUContext.activate(ctx), after
 * which all per-canvas getters delegate to that context.
 * @internal
 */
export class Context3D extends CEventDispatcher {

    // ── Shared GPU device (initialised once, reused by all instances) ──────
    public adapter: GPUAdapter;
    public device: GPUDevice;
    public presentationFormat: GPUTextureFormat;

    // ── Active per-engine context (set by Engine3D before every render) ─────
    private _active: EngineContext | null = null;

    // ── Proxy getters: delegate to the active EngineContext ─────────────────
    public get canvas(): HTMLCanvasElement { return this._active?.canvas; }
    /** GPUCanvasContext of the active canvas */
    public get context(): GPUCanvasContext { return this._active?.gpuContext; }
    public get windowWidth(): number { return this._active?.width ?? 0; }
    public get windowHeight(): number { return this._active?.height ?? 0; }
    public get presentationSize(): number[] { return this._active?.size ?? [0, 0]; }
    public get aspect(): number { return this._active?.aspect ?? 1; }
    public get canvasConfig(): CanvasConfig { return this._active?.canvasConfig; }
    public get pixelRatio(): number { return this._active?.pixelRatio ?? 1; }

    // ── Per-engine GPU resource maps (proxied from active EngineContext) ─────
    public get gBufferMap(): Map<string, any> { return this._active?.gBufferMap; }
    public get rtTextureMap(): Map<string, any> { return this._active?.rtTextureMap; }
    public get rtViewQuad(): Map<string, any> { return this._active?.rtViewQuad; }

    // ── Activate an engine context before rendering ──────────────────────────
    public activate(ctx: EngineContext): void {
        this._active = ctx;
    }

    // ── Initialise the shared GPU device (idempotent) ────────────────────────
    async initDevice(): Promise<boolean> {
        if (this.device) return true;

        if (navigator.gpu === undefined) {
            throw new Error('Your browser does not support WebGPU!');
        }

        this.adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (!this.adapter) throw new Error('Your browser does not support WebGPU!');

        this.device = await this.adapter.requestDevice({
            requiredFeatures: [
                'bgra8unorm-storage',
                'depth-clip-control',
                'depth32float-stencil8',
                'indirect-first-instance',
                'rg11b10ufloat-renderable',
            ],
            requiredLimits: {
                minUniformBufferOffsetAlignment: 256,
                maxStorageBufferBindingSize: this.adapter.limits.maxStorageBufferBindingSize,
            },
        });
        if (!this.device) throw new Error('Your browser does not support WebGPU!');

        this.device.label = 'device';
        this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        return true;
    }

    /**
     * Legacy single-instance path kept for backward compatibility.
     * Creates the GPU device AND sets up a canvas context on this object.
     * New multi-instance code should call initDevice() then EngineContext.init().
     */
    async init(canvasConfig?: CanvasConfig): Promise<boolean> {
        await this.initDevice();

        // Create a temporary EngineContext and activate it immediately so that
        // all existing callers of webGPUContext.canvas / .context / .size etc.
        // continue to work in the single-instance path.
        const ctx = new EngineContext();
        await ctx.init(canvasConfig, this.device, this.presentationFormat);
        this.activate(ctx);
        return true;
    }

    public updateSize(): void {
        this._active?.updateSize();
    }

    // ── Forward event registration to the active EngineContext ───────────────
    // (PostBase, Camera3D, RenderTexture, ViewQuad, ComputeShader etc.
    //  all call webGPUContext.addEventListener(CResizeEvent.RESIZE, …) so
    //  that they are notified when the canvas for the CURRENT engine resizes.)

    public addEventListener(type: string | number, callback: Function, thisObject: any, param: any = null, priority: number = 0): number {
        return this._active?.addEventListener(type, callback, thisObject, param, priority) ?? 0;
    }

    public removeEventListener(type: string | number, callback: Function, thisObject: any): void {
        this._active?.removeEventListener(type, callback, thisObject);
    }
}

/**
 * @internal
 */
export let webGPUContext = new Context3D();
export { EngineContext };
