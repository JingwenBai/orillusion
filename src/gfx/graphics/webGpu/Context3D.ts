import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * @internal
 */
export class Context3D extends CEventDispatcher {

    /**
     * Shared GPU device across all Engine3D instances.
     * WebGPU allows one device to drive multiple canvas surfaces.
     */
    public static sharedDevice: GPUDevice | null = null;
    public static sharedAdapter: GPUAdapter | null = null;
    public static sharedPresentationFormat: GPUTextureFormat | null = null;

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

    public get pixelRatio() {
        return this._pixelRatio;
    }

    /**
     * Configure canvas by CanvasConfig.
     * When a shared device already exists (from a prior Engine3D init),
     * it is reused so multiple Engine3D instances share one GPU device.
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

        if (Context3D.sharedDevice) {
            // Reuse the shared GPU device for additional Engine3D instances
            this.adapter = Context3D.sharedAdapter;
            this.device = Context3D.sharedDevice;
            this.presentationFormat = Context3D.sharedPresentationFormat;
        } else {
            // First Engine3D instance: request adapter and device, then share them
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

            this.device.label = 'device';
            this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();

            // Store shared references for subsequent instances
            Context3D.sharedDevice = this.device;
            Context3D.sharedAdapter = this.adapter;
            Context3D.sharedPresentationFormat = this.presentationFormat;
        }

        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        // Configure this canvas's WebGPU surface
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
 * Active context for the current rendering engine instance.
 * Changed during each engine's render loop via setActiveContext().
 * Defaults to the first engine's context for backward compatibility.
 * @internal
 */
export let webGPUContext: Context3D = new Context3D();

/**
 * Switch the active WebGPU context.
 * Called by Engine3D at the start of each instance's render loop so that
 * all rendering subsystems that import webGPUContext use the right canvas.
 * @internal
 */
export function setActiveContext(ctx: Context3D): void {
    webGPUContext = ctx;
}
