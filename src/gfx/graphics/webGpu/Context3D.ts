import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * @internal
 * Per-engine GPU canvas context. Multiple instances can share one GPUDevice
 * but each has its own HTMLCanvasElement and GPUCanvasContext.
 */
export class Context3D extends CEventDispatcher {

    // Shared across all Context3D instances (one GPUDevice per page)
    private static _sharedAdapter: GPUAdapter;
    private static _sharedDevice: GPUDevice;
    private static _sharedPresentationFormat: GPUTextureFormat;

    // Per-instance (per-engine) canvas resources
    public context: GPUCanvasContext;
    public aspect: number;
    public presentationSize: number[] = [0, 0];
    public canvas: HTMLCanvasElement;
    public windowWidth: number;
    public windowHeight: number;
    public canvasConfig: CanvasConfig;
    private _pixelRatio: number = 1.0;
    private _resizeEvent: CEvent;

    /** Shared WebGPU adapter (same for all instances) */
    public get adapter(): GPUAdapter {
        return Context3D._sharedAdapter;
    }

    /** Shared WebGPU device (same for all instances) */
    public get device(): GPUDevice {
        return Context3D._sharedDevice;
    }

    /** Shared preferred canvas format */
    public get presentationFormat(): GPUTextureFormat {
        return Context3D._sharedPresentationFormat;
    }

    public get pixelRatio() {
        return this._pixelRatio;
    }

    /**
     * Configure canvas by CanvasConfig.
     * The first call creates the shared GPUAdapter and GPUDevice.
     * Subsequent calls reuse the shared device and create only a new canvas context.
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

            // check if external canvas has initial with and height style
            // TODO: any way to check external css style?
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

        // check webgpu support
        if (navigator.gpu === undefined) {
            throw new Error('Your browser does not support WebGPU!');
        }

        // Create shared adapter and device only once across all engine instances
        if (!Context3D._sharedDevice) {
            const adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance',
            });

            if (adapter == null) {
                throw new Error('Your browser does not support WebGPU!');
            }

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
        }

        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        // Configure this instance's canvas context using the shared device
        this.context = this.canvas.getContext('webgpu');
        this.context.configure({
            device: Context3D._sharedDevice,
            format: Context3D._sharedPresentationFormat,
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
 * @internal
 * Active engine context. Set to the currently-rendering engine's Context3D
 * before each render frame. All subsystems read from this reference, which
 * makes the "active context" pattern work safely in single-threaded JS.
 */
export let webGPUContext: Context3D = new Context3D();

/**
 * @internal
 * Switch the active engine context. Called by Engine3D before rendering each
 * engine instance. Because this function lives in the same module as
 * `webGPUContext`, it can update the ES module live binding so all importers
 * automatically see the new context.
 */
export function setActiveContext(ctx: Context3D): void {
    webGPUContext = ctx;
}
