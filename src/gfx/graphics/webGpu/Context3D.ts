import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * @internal
 */
export class Context3D extends CEventDispatcher {

    // ---- Shared GPU state (one device per page, static) ----
    private static _adapter: GPUAdapter;
    private static _device: GPUDevice;
    private static _presentationFormat: GPUTextureFormat;
    private static _gpuInitialized: boolean = false;

    // ---- Per-canvas/per-engine state ----
    public context: GPUCanvasContext;
    public aspect: number;
    public presentationSize: number[] = [0, 0];
    public canvas: HTMLCanvasElement;
    public windowWidth: number;
    public windowHeight: number;
    public canvasConfig: CanvasConfig;
    private _pixelRatio: number = 1.0;
    private _resizeEvent: CEvent;
    private _resizeObserver: ResizeObserver;

    // ---- Shared GPU accessors ----
    public get adapter(): GPUAdapter { return Context3D._adapter; }
    public get device(): GPUDevice { return Context3D._device; }
    public get presentationFormat(): GPUTextureFormat { return Context3D._presentationFormat; }

    public get pixelRatio() {
        return this._pixelRatio;
    }

    /**
     * Initialize the shared GPU adapter and device (called once across all instances).
     */
    private static async initGPU(): Promise<void> {
        if (this._gpuInitialized) return;

        if (navigator.gpu === undefined) {
            throw new Error('Your browser does not support WebGPU!');
        }

        this._adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance',
        });

        if (this._adapter == null) {
            throw new Error('Your browser does not support WebGPU!');
        }

        this._device = await this._adapter.requestDevice({
            requiredFeatures: [
                "bgra8unorm-storage",
                "depth-clip-control",
                "depth32float-stencil8",
                "indirect-first-instance",
                "rg11b10ufloat-renderable",
            ],
            requiredLimits: {
                minUniformBufferOffsetAlignment: 256,
                maxStorageBufferBindingSize: this._adapter.limits.maxStorageBufferBindingSize
            }
        });

        if (this._device == null) {
            throw new Error('Your browser does not support WebGPU!');
        }

        this._device.label = 'device';
        this._presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this._gpuInitialized = true;
    }

    /**
     * Configure this canvas context for one Engine3D instance.
     * Shared GPU adapter/device are initialised on the first call and
     * reused by subsequent instances.
     * @param canvasConfig
     * @returns
     */
    async init(canvasConfig?: CanvasConfig): Promise<boolean> {
        this.canvasConfig = canvasConfig;
        if (canvasConfig && canvasConfig.canvas) {
            this.canvas = canvasConfig.canvas;
            if (this.canvas === null) {
                throw new Error('no Canvas')
            }

            if(!this.canvas.style.width)
                this.canvas.style.width = this.canvas.width + 'px';
            if(!this.canvas.style.height)
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

        // Ensure shared GPU device is ready (idempotent)
        await Context3D.initGPU();

        this.context = this.canvas.getContext('webgpu');
        this.context.configure({
            device: Context3D._device,
            format: Context3D._presentationFormat,
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            alphaMode: 'premultiplied',
            colorSpace: `srgb`
        });

        this._resizeEvent = new CResizeEvent(CResizeEvent.RESIZE, { width: this.windowWidth, height: this.windowHeight })
        this._resizeObserver = new ResizeObserver(() => {
            this.updateSize()
            Texture.destroyTexture()
        });

        this._resizeObserver.observe(this.canvas);
        this.updateSize();
        return true;
    }

    /**
     * Release per-instance canvas resources.  The shared adapter / device
     * intentionally survive so other Engine3D instances can keep using them.
     */
    public destroy() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        if (this.context && (this.context as any).unconfigure) {
            (this.context as any).unconfigure();
        }
        this.context = null;
        this.canvas = null;
    }

    public updateSize() {
        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);
        let w = Math.floor(this.canvas.clientWidth * this._pixelRatio);
        let h = Math.floor(this.canvas.clientHeight * this._pixelRatio);
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
 * Shared WebGPU context singleton.
 * `device`, `adapter`, and `presentationFormat` are shared across all Engine3D instances.
 * Per-canvas fields (`context`, `presentationSize`, `canvas`, etc.) are updated by
 * each Engine3D instance before it renders its frame, making the singleton act as a
 * "current canvas context" pointer in the single-threaded JS environment.
 * @internal
 */
export let webGPUContext = new Context3D();
