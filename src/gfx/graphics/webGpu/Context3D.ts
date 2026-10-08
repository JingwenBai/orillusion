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

    // Shared GPU device/adapter across all engine instances
    public static sharedAdapter: GPUAdapter | null = null;
    public static sharedDevice: GPUDevice | null = null;
    public static sharedPresentationFormat: GPUTextureFormat | null = null;

    public get pixelRatio() {
        return this._pixelRatio;
    }

    /**
     * Configure canvas by CanvasConfig. Reuses the shared GPUDevice if one
     * already exists (multiple Engine3D instances share the same GPU device).
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

        if (navigator.gpu === undefined) {
            throw new Error('Your browser does not support WebGPU!');
        }

        // Reuse shared device if already created by another engine instance
        if (Context3D.sharedDevice) {
            this.adapter = Context3D.sharedAdapter;
            this.device = Context3D.sharedDevice;
            this.presentationFormat = Context3D.sharedPresentationFormat;
        } else {
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

            // Store shared device for subsequent engine instances
            Context3D.sharedAdapter = this.adapter;
            Context3D.sharedDevice = this.device;
            Context3D.sharedPresentationFormat = this.presentationFormat;
        }

        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

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

    /**
     * Copy the per-engine canvas state from another Context3D instance into this one.
     * Used by Engine3D to activate the current engine's context before each frame,
     * so that code importing the module-level `webGPUContext` always sees the
     * correct canvas dimensions and GPU canvas context.
     * @internal
     */
    public adoptFrom(source: Context3D): void {
        this.canvas = source.canvas;
        this.context = source.context;
        this.windowWidth = source.windowWidth;
        this.windowHeight = source.windowHeight;
        this.presentationSize[0] = source.presentationSize[0];
        this.presentationSize[1] = source.presentationSize[1];
        this.aspect = source.aspect;
        this._pixelRatio = source._pixelRatio;
        this.canvasConfig = source.canvasConfig;
        // device/adapter/presentationFormat are shared — no need to copy
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
 * Module-level context singleton. Before each engine frame, the active engine
 * calls webGPUContext.adoptFrom(this.context3d) to update this singleton with
 * the per-engine canvas state. All downstream code that imports webGPUContext
 * always sees the correct active engine's canvas dimensions and GPU context.
 */
export let webGPUContext = new Context3D();
