import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * @internal
 */
export class Context3D extends CEventDispatcher {

    // ---- Shared GPU device state (initialized once, shared across all engine instances) ----
    private static _adapter: GPUAdapter;
    private static _device: GPUDevice;
    private static _presentationFormat: GPUTextureFormat;
    private static _deviceInitialized: boolean = false;

    // ---- Per-engine canvas state ----
    public context: GPUCanvasContext;
    public aspect: number;
    public presentationSize: number[] = [0, 0];
    public canvas: HTMLCanvasElement;
    public windowWidth: number;
    public windowHeight: number;
    public canvasConfig: CanvasConfig;
    private _pixelRatio: number = 1.0;
    private _resizeEvent: CEvent;

    // ---- Instance getters that forward to shared static state ----
    public get adapter(): GPUAdapter {
        return Context3D._adapter;
    }

    public get device(): GPUDevice {
        return Context3D._device;
    }

    public get presentationFormat(): GPUTextureFormat {
        return Context3D._presentationFormat;
    }

    public get pixelRatio() {
        return this._pixelRatio;
    }

    /**
     * Initialize shared GPU device (called once) and configure canvas for this engine instance.
     * @param canvasConfig
     * @returns
     */
    async init(canvasConfig?: CanvasConfig): Promise<boolean> {
        if (!Context3D._deviceInitialized) {
            await this._initDevice();
            Context3D._deviceInitialized = true;
        }
        await this._initCanvas(canvasConfig);
        return true;
    }

    /**
     * Initialize the shared WebGPU adapter and device (runs only once globally).
     */
    private async _initDevice(): Promise<void> {
        // check webgpu support
        if (navigator.gpu === undefined) {
            throw new Error('Your browser does not support WebGPU!');
        }

        // request adapter
        Context3D._adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance',
        });

        if (Context3D._adapter == null) {
            throw new Error('Your browser does not support WebGPU!');
        }

        // request device
        Context3D._device = await Context3D._adapter.requestDevice({
            requiredFeatures: [
                "bgra8unorm-storage",
                "depth-clip-control",
                "depth32float-stencil8",
                "indirect-first-instance",
                "rg11b10ufloat-renderable",
            ],
            requiredLimits: {
                minUniformBufferOffsetAlignment: 256,
                maxStorageBufferBindingSize: Context3D._adapter.limits.maxStorageBufferBindingSize
            }
        });

        if (Context3D._device == null) {
            throw new Error('Your browser does not support WebGPU!');
        }

        Context3D._device.label = 'device';
        Context3D._presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    }

    /**
     * Configure canvas for this engine instance using the shared GPU device.
     */
    private async _initCanvas(canvasConfig?: CanvasConfig): Promise<void> {
        this.canvasConfig = canvasConfig;

        if (canvasConfig && canvasConfig.canvas) {
            this.canvas = canvasConfig.canvas;
            if (this.canvas === null) {
                throw new Error('no Canvas')
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

        // configure webgpu context for this canvas
        this.context = this.canvas.getContext('webgpu');
        this.context.configure({
            device: Context3D._device,
            format: Context3D._presentationFormat,
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
 * Global singleton — provides access to the shared GPU device.
 * Each Engine3D instance creates its own Context3D for per-canvas state.
 */
export let webGPUContext = new Context3D();
