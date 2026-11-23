import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * @internal
 */
export class Context3D extends CEventDispatcher {

    // Shared across all instances — browsers allow only one GPUDevice per origin
    private static _sharedAdapter: GPUAdapter;
    private static _sharedDevice: GPUDevice;
    private static _sharedFormat: GPUTextureFormat;
    private static _deviceInitialized: boolean = false;

    // Per-instance canvas state
    public context: GPUCanvasContext;
    public aspect: number;
    public presentationSize: number[] = [0, 0];
    public presentationFormat: GPUTextureFormat;
    public canvas: HTMLCanvasElement;
    public windowWidth: number;
    public windowHeight: number;
    public canvasConfig: CanvasConfig;
    private _pixelRatio: number = 1.0;
    private _resizeEvent: CEvent;

    /** Shared GPU device (same for every instance) */
    public get device(): GPUDevice { return Context3D._sharedDevice; }
    public set device(v: GPUDevice) { Context3D._sharedDevice = v; }

    /** Shared GPU adapter */
    public get adapter(): GPUAdapter { return Context3D._sharedAdapter; }
    public set adapter(v: GPUAdapter) { Context3D._sharedAdapter = v; }

    public get pixelRatio() {
        return this._pixelRatio;
    }

    /**
     * Configure canvas by CanvasConfig.
     * The WebGPU device is created on the first call and reused by all subsequent
     * instances — only the canvas / GPUCanvasContext is created fresh each time.
     */
    async init(canvasConfig?: CanvasConfig): Promise<boolean> {
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

        if (canvasConfig && canvasConfig.backgroundImage) {
            this.canvas.style.background = `url(${canvasConfig.backgroundImage})`;
            this.canvas.style['background-size'] = 'cover';
            this.canvas.style['background-position'] = 'center';
        } else {
            this.canvas.style.background = 'transparent';
        }

        this.canvas.style['touch-action'] = 'none';
        this.canvas.style['object-fit'] = 'cover';

        if (navigator.gpu === undefined) {
            throw new Error('Your browser does not support WebGPU!');
        }

        // Create the GPU device only once; all Engine3D instances share it.
        if (!Context3D._deviceInitialized) {
            Context3D._deviceInitialized = true;

            Context3D._sharedAdapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance',
            });

            if (Context3D._sharedAdapter == null) {
                throw new Error('Your browser does not support WebGPU!');
            }

            Context3D._sharedDevice = await Context3D._sharedAdapter.requestDevice({
                requiredFeatures: [
                    "bgra8unorm-storage",
                    "depth-clip-control",
                    "depth32float-stencil8",
                    "indirect-first-instance",
                    "rg11b10ufloat-renderable",
                ],
                requiredLimits: {
                    minUniformBufferOffsetAlignment: 256,
                    maxStorageBufferBindingSize: Context3D._sharedAdapter.limits.maxStorageBufferBindingSize
                }
            });

            if (Context3D._sharedDevice == null) {
                throw new Error('Your browser does not support WebGPU!');
            }

            Context3D._sharedDevice.label = 'device';
            Context3D._sharedFormat = navigator.gpu.getPreferredCanvasFormat();
        }

        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        this.presentationFormat = Context3D._sharedFormat;
        this.context = this.canvas.getContext('webgpu');
        this.context.configure({
            device: Context3D._sharedDevice,
            format: this.presentationFormat,
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            alphaMode: 'premultiplied',
            colorSpace: `srgb`
        });

        this._resizeEvent = new CResizeEvent(CResizeEvent.RESIZE, { width: this.windowWidth, height: this.windowHeight })
        const resizeObserver = new ResizeObserver(() => {
            this.updateSize()
            Texture.destroyTexture()
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

/**
 * Active WebGPU canvas context.
 * Always reflects the Engine3D instance that is currently rendering.
 * @internal
 */
export let webGPUContext = new Context3D();

/**
 * Swap the globally active canvas context before rendering a specific engine instance.
 * Since the WebGPU device is shared, only canvas-specific state (presentationSize,
 * canvas, windowWidth/Height, aspect) changes between swaps.
 * @internal
 */
export function setActiveWebGPUContext(ctx: Context3D): void {
    webGPUContext = ctx;
}
