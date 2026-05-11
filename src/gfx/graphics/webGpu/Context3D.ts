import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * @internal
 */
export class Context3D extends CEventDispatcher {

    public adapter: GPUAdapter;
    public device: GPUDevice;
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

    /**
     * Shared GPUAdapter and GPUDevice across all engine instances.
     * Multiple Engine3D canvases can share a single device so GPU resources
     * (buffers, textures) are accessible from all of them.
     */
    private static _sharedAdapter: GPUAdapter | null = null;
    private static _sharedDevice: GPUDevice | null = null;

    public get pixelRatio() {
        return this._pixelRatio;
    }

    /**
     * Configure canvas by CanvasConfig.
     * Reuses the shared GPUAdapter / GPUDevice when one already exists so that
     * multiple Engine3D instances share the same GPU device.
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
            // this.canvas.style.position = 'fixed';
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

        if (Context3D._sharedAdapter && Context3D._sharedDevice) {
            // Reuse the existing adapter/device for subsequent engine instances.
            this.adapter = Context3D._sharedAdapter;
            this.device = Context3D._sharedDevice;
        } else {
            // First engine: request adapter and device, then cache them.
            this.adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance',
            });

            if (this.adapter == null) {
                throw new Error('Your browser does not support WebGPU!');
            }

            this.device = await this.adapter.requestDevice({
                requiredFeatures: [
                    "bgra8unorm-storage",
                    "depth-clip-control",
                    "depth32float-stencil8",
                    "indirect-first-instance",
                    "rg11b10ufloat-renderable",
                ],
                requiredLimits: {
                    minUniformBufferOffsetAlignment: 256,
                    maxStorageBufferBindingSize: this.adapter.limits.maxStorageBufferBindingSize
                }
            });

            if (this.device == null) {
                throw new Error('Your browser does not support WebGPU!');
            }

            Context3D._sharedAdapter = this.adapter;
            Context3D._sharedDevice = this.device;
        }

        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        // configure webgpu context
        this.device.label = 'device';
        this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context = this.canvas.getContext('webgpu');
        this.context.configure({
            device: this.device,
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
 * Module-level live binding for the currently active GPU context.
 * Updated by Engine3D when a new engine is initialised or a render frame begins.
 * All existing imports receive the updated value because ES module bindings are live.
 * @internal
 */
export let webGPUContext: Context3D = null;

/**
 * Replace the active webGPUContext binding.  Called by Engine3D.
 * @internal
 */
export function setWebGPUContext(ctx: Context3D): void {
    webGPUContext = ctx;
}
