import { CanvasConfig } from './CanvasConfig';

/**
 * Shared GPU device singleton — adapter and device are initialized once
 * and reused across all Engine3D instances (WebGPU allows multiple canvases
 * to share a single GPUDevice).
 * @internal
 */
export class GPUDeviceContext {
    public static adapter: GPUAdapter;
    public static device: GPUDevice;
    public static presentationFormat: GPUTextureFormat;
    private static _initialized: boolean = false;

    public static get initialized(): boolean {
        return this._initialized;
    }

    public static async init(_canvasConfig?: CanvasConfig): Promise<void> {
        if (this._initialized) return;

        if (navigator.gpu === undefined) {
            throw new Error('Your browser does not support WebGPU!');
        }

        this.adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance',
        });

        if (this.adapter == null) {
            throw new Error('Your browser does not support WebGPU!');
        }

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

        if (this.device == null) {
            throw new Error('Your browser does not support WebGPU!');
        }

        this.device.label = 'device';
        this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this._initialized = true;
    }
}
