import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * Shared WebGPU device state. Initialized once per application and reused
 * by all Engine3D instances so multiple engines share the same GPU device.
 * @internal
 */
class SharedGPUDevice {
    public static adapter: GPUAdapter;
    public static device: GPUDevice;
    public static presentationFormat: GPUTextureFormat;
    private static _initialized = false;

    public static async init(_canvasConfig?: CanvasConfig): Promise<void> {
        if (this._initialized) return;
        this._initialized = true;

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
                maxStorageBufferBindingSize: this.adapter.limits.maxStorageBufferBindingSize
            }
        });

        if (this.device == null) {
            throw new Error('Your browser does not support WebGPU!');
        }

        this.device.label = 'device';
        this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    }
}

/**
 * Per-engine WebGPU canvas context. Each Engine3D instance creates its own
 * Context3D to manage its own canvas and swap chain. The GPU device is
 * shared across all instances via SharedGPUDevice.
 * @internal
 */
export class Context3D extends CEventDispatcher {

    public context: GPUCanvasContext;
    public aspect: number;
    public presentationSize: number[] = [0, 0];
    public canvas: HTMLCanvasElement;
    public windowWidth: number;
    public windowHeight: number;
    public canvasConfig: CanvasConfig;
    private _pixelRatio: number = 1.0;
    private _resizeEvent: CEvent;

    public get pixelRatio() {
        return this._pixelRatio;
    }

    /** Shared GPU adapter (same instance for all engines). */
    public get adapter(): GPUAdapter {
        return SharedGPUDevice.adapter;
    }

    /** Shared GPU device (same instance for all engines). */
    public get device(): GPUDevice {
        return SharedGPUDevice.device;
    }

    /** Shared swap-chain format (same for all engines). */
    public get presentationFormat(): GPUTextureFormat {
        return SharedGPUDevice.presentationFormat;
    }

    /**
     * Configure this per-engine canvas and obtain the WebGPU swap chain.
     * The shared GPU device is initialised here if this is the first engine.
     */
    async init(canvasConfig?: CanvasConfig): Promise<boolean> {
        this.canvasConfig = canvasConfig;

        if (canvasConfig && canvasConfig.canvas) {
            this.canvas = canvasConfig.canvas;
            if (this.canvas === null) {
                throw new Error('no Canvas');
            }
            if (!this.canvas.style.width)
                this.canvas.style.width = this.canvas.width + 'px';
            if (!this.canvas.style.height)
                this.canvas.style.height = this.canvas.height + 'px';
        } else {
            this.canvas = document.createElement('canvas');
            this.canvas.style.position = `absolute`;
            this.canvas.style.top = '0px';
            this.canvas.style.left = '0px';
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            this.canvas.style.zIndex = canvasConfig?.zIndex ? canvasConfig.zIndex.toString() : '0';
            document.body.appendChild(this.canvas);
        }

        if (canvasConfig && canvasConfig.backgroundImage) {
            this.canvas.style.background = `url(${canvasConfig.backgroundImage})`;
            this.canvas.style['background-size'] = 'cover';
            this.canvas.style['background-position'] = 'center';
        } else {
            this.canvas.style.background = 'transparent';
        }

        this.canvas.style['touch-action'] = 'none';
        this.canvas.style['object-fit'] = 'cover';

        // Initialise the shared GPU device once for the whole application.
        await SharedGPUDevice.init(canvasConfig);

        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        // Each engine gets its own GPUCanvasContext (swap chain).
        this.context = this.canvas.getContext('webgpu');
        this.context.configure({
            device: SharedGPUDevice.device,
            format: SharedGPUDevice.presentationFormat,
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            alphaMode: 'premultiplied',
            colorSpace: `srgb`
        });

        this._resizeEvent = new CResizeEvent(CResizeEvent.RESIZE, { width: this.windowWidth, height: this.windowHeight });
        const resizeObserver = new ResizeObserver(() => {
            this.updateSize();
            Texture.destroyTexture();
        });

        resizeObserver.observe(this.canvas);
        this.updateSize();
        return true;
    }

    public updateSize() {
        let w = Math.floor(this.canvas.clientWidth * this.pixelRatio);
        let h = Math.floor(this.canvas.clientHeight * this.pixelRatio);
        if (w != this.windowWidth || h != this.windowHeight) {
            this.canvas.width = this.windowWidth = w;
            this.canvas.height = this.windowHeight = h;
            this.presentationSize[0] = this.windowWidth;
            this.presentationSize[1] = this.windowHeight;
            this.aspect = this.windowWidth / this.windowHeight;

            this._resizeEvent.data.width = this.windowWidth;
            this._resizeEvent.data.height = this.windowHeight;
            this.dispatchEvent(this._resizeEvent);
        }
    }
}

// ---------------------------------------------------------------------------
// Active-context forwarding
// ---------------------------------------------------------------------------

let _activeContext: Context3D | null = null;

/**
 * Point `webGPUContext` at the given context for the duration of this
 * engine's render frame. Called by Engine3D before every render pass.
 * @internal
 */
export function setActiveGPUContext(ctx: Context3D): void {
    _activeContext = ctx;
}

/**
 * A transparent proxy that forwards every property access / mutation to
 * whichever Context3D is currently active (set by the rendering Engine3D).
 * All existing code that imports `webGPUContext` continues to work unchanged.
 * @internal
 */
export const webGPUContext: Context3D = new Proxy({} as Context3D, {
    get(_: unknown, prop: string | symbol) {
        if (!_activeContext) {
            throw new Error(
                'No active WebGPU context — call Engine3D.init() before accessing webGPUContext.'
            );
        }
        const val = (_activeContext as any)[prop];
        return typeof val === 'function' ? (val as Function).bind(_activeContext) : val;
    },
    set(_: unknown, prop: string | symbol, value: unknown) {
        if (!_activeContext) {
            throw new Error(
                'No active WebGPU context — call Engine3D.init() before accessing webGPUContext.'
            );
        }
        (_activeContext as any)[prop] = value;
        return true;
    }
}) as Context3D;
