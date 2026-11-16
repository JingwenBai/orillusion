import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * @internal
 */
export class Context3D extends CEventDispatcher {

    // Shared across all instances (initialized once per GPU adapter)
    public static sharedAdapter: GPUAdapter;
    public static sharedDevice: GPUDevice;
    public static sharedPresentationFormat: GPUTextureFormat;

    // Per-instance canvas state
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

    /** Backward-compat instance accessors that delegate to shared state */
    public get adapter(): GPUAdapter { return Context3D.sharedAdapter; }
    public get device(): GPUDevice { return Context3D.sharedDevice; }
    public get presentationFormat(): GPUTextureFormat { return Context3D.sharedPresentationFormat; }

    /**
     * Initialize the shared GPU device (once) and then configure this canvas context.
     * @param canvasConfig
     */
    async init(canvasConfig?: CanvasConfig): Promise<boolean> {
        await this._initDevice();
        await this._initCanvas(canvasConfig);
        return true;
    }

    private async _initDevice(): Promise<void> {
        if (Context3D.sharedDevice) return;

        if (navigator.gpu === undefined) {
            throw new Error('Your browser does not support WebGPU!');
        }

        Context3D.sharedAdapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance',
        });

        if (Context3D.sharedAdapter == null) {
            throw new Error('Your browser does not support WebGPU!');
        }

        Context3D.sharedDevice = await Context3D.sharedAdapter.requestDevice({
            requiredFeatures: [
                "bgra8unorm-storage",
                "depth-clip-control",
                "depth32float-stencil8",
                "indirect-first-instance",
                "rg11b10ufloat-renderable",
            ],
            requiredLimits: {
                minUniformBufferOffsetAlignment: 256,
                maxStorageBufferBindingSize: Context3D.sharedAdapter.limits.maxStorageBufferBindingSize
            }
        });

        if (Context3D.sharedDevice == null) {
            throw new Error('Your browser does not support WebGPU!');
        }

        Context3D.sharedDevice.label = 'device';
        Context3D.sharedPresentationFormat = navigator.gpu.getPreferredCanvasFormat();
    }

    private async _initCanvas(canvasConfig?: CanvasConfig): Promise<void> {
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

        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        this.context = this.canvas.getContext('webgpu');
        this.context.configure({
            device: Context3D.sharedDevice,
            format: Context3D.sharedPresentationFormat,
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
 * Active context for the currently-rendering Engine3D instance.
 * Swapped by Engine3D before each render frame for multi-instance support.
 * Points to the first created instance for backward compatibility.
 */
export let webGPUContext: Context3D = null;

/**
 * @internal
 * Set the active webGPU canvas context (called by Engine3D before each render frame).
 */
export function setActiveWebGPUContext(ctx: Context3D): void {
    webGPUContext = ctx;
}
