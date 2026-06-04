/**
 * Shared WebGPU device context — one GPU device per browser tab.
 * All Engine3D instances share this adapter/device.
 * @internal
 */
export class DeviceContext {
    public static adapter: GPUAdapter;
    public static device: GPUDevice;
    public static presentationFormat: GPUTextureFormat;
    private static _initialized = false;

    public static get initialized(): boolean {
        return this._initialized;
    }

    public static async init(): Promise<void> {
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
