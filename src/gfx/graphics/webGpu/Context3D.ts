import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * @internal
 */
export class Context3D extends CEventDispatcher {

    // --- Shared GPU state (initialized once, reused across all Engine3D instances) ---
    private static _sharedAdapter: GPUAdapter;
    private static _sharedDevice: GPUDevice;
    private static _sharedPresentationFormat: GPUTextureFormat;
    private static _gpuInitialized: boolean = false;

    // --- Per-instance (canvas-specific) state ---
    public context: GPUCanvasContext;
    public aspect: number;
    public presentationSize: number[] = [0, 0];
    public canvas: HTMLCanvasElement;
    public windowWidth: number;
    public windowHeight: number;
    public canvasConfig: CanvasConfig;
    private _pixelRatio: number = 1.0;
    private _resizeEvent: CEvent;

    /** Shared adapter across all instances */
    public get adapter(): GPUAdapter {
        return Context3D._sharedAdapter;
    }

    /** Shared GPU device across all instances */
    public get device(): GPUDevice {
        return Context3D._sharedDevice;
    }

    /** Shared presentation format across all instances */
    public get presentationFormat(): GPUTextureFormat {
        return Context3D._sharedPresentationFormat;
    }

    public get pixelRatio() {
        return this._pixelRatio;
    }

    /**
     * Configure canvas by CanvasConfig.
     * On the first call, the shared WebGPU adapter/device are initialised.
     * Subsequent calls reuse the same device but create a new canvas context.
     * @param canvasConfig
     * @returns
     */
    async init(canvasConfig?: CanvasConfig): Promise<boolean> {
        this.canvasConfig = canvasConfig;

        // --- One-time GPU initialisation ---
        if (!Context3D._gpuInitialized) {
            await this._initSharedGPU(canvasConfig);
        }

        // --- Per-instance canvas initialisation ---
        await this._initCanvas(canvasConfig);
        return true;
    }

    private async _initSharedGPU(canvasConfig?: CanvasConfig): Promise<void> {
        // check webgpu support
        if (navigator.gpu === undefined) {
            throw new Error('Your browser does not support WebGPU!');
        }

        // request adapter
        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance',
        });

        if (adapter == null) {
            throw new Error('Your browser does not support WebGPU!');
        }

        // request device
        const device = await adapter.requestDevice({
            requiredFeatures: [
                "bgra8unorm-storage",
                "depth-clip-control",
                "depth32float-stencil8",
                "indirect-first-instance",
                "rg11b10ufloat-renderable",
            ],
            requiredLimits: {
                minUniformBufferOffsetAlignment: 256,
                maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize
            }
        });

        if (device == null) {
            throw new Error('Your browser does not support WebGPU!');
        }

        device.label = 'device';

        Context3D._sharedAdapter = adapter;
        Context3D._sharedDevice = device;
        Context3D._sharedPresentationFormat = navigator.gpu.getPreferredCanvasFormat();
        Context3D._gpuInitialized = true;
    }

    private async _initCanvas(canvasConfig?: CanvasConfig): Promise<void> {
        if (canvasConfig && canvasConfig.canvas) {
            this.canvas = canvasConfig.canvas;
            if (this.canvas === null) {
                throw new Error('no Canvas')
            }

            // check if external canvas has initial width and height style
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

        // set canvas bg
        if (canvasConfig && canvasConfig.backgroundImage) {
            this.canvas.style.background = `url(${canvasConfig.backgroundImage})`;
            this.canvas.style['background-size'] = 'cover';
            this.canvas.style['background-position'] = 'center';
        } else {
            this.canvas.style.background = 'transparent';
        }

        // prevent touch scroll
        this.canvas.style['touch-action'] = 'none';
        this.canvas.style['object-fit'] = 'cover';

        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        // configure webgpu canvas context
        this.context = this.canvas.getContext('webgpu');
        this.context.configure({
            device: Context3D._sharedDevice,
            format: Context3D._sharedPresentationFormat,
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

/**
 * @internal
 * Mutable reference to the currently active engine's GPU context.
 * Updated by Engine3D before each render frame.
 */
export let webGPUContext: Context3D;

/**
 * @internal
 * Update the active webGPUContext binding (called by Engine3D).
 */
export function setWebGPUContext(ctx: Context3D): void {
    webGPUContext = ctx;
}
