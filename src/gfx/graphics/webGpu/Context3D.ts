import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * Shared GPUDevice used by all Engine3D instances on the page.
 * The first engine to initialise creates the adapter and device;
 * subsequent engines reuse them so pipelines and shader modules can be shared.
 * @internal
 */
export let sharedGPUAdapter: GPUAdapter | null = null;
export let sharedGPUDevice: GPUDevice | null = null;
export let sharedPresentationFormat: GPUTextureFormat | null = null;

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

    public get pixelRatio() {
        return this._pixelRatio;
    }

    /**
     * Configure canvas by CanvasConfig.
     * When multiple Engine3D instances are used, the GPUAdapter and GPUDevice
     * are created only once and shared across all instances; only the
     * per-canvas GPUCanvasContext is created anew each time.
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

        if (sharedGPUDevice) {
            // Reuse the shared adapter/device for subsequent engine instances
            this.adapter = sharedGPUAdapter;
            this.device = sharedGPUDevice;
            this.presentationFormat = sharedPresentationFormat;
        } else {
            // First engine initialisation — create the shared adapter and device
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

            this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
            this.device.label = 'device';

            // Publish for subsequent engines to reuse
            sharedGPUAdapter = this.adapter;
            sharedGPUDevice = this.device;
            sharedPresentationFormat = this.presentationFormat;
        }

        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        // Configure the per-canvas WebGPU context
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
 * The active Context3D instance for the engine that is currently executing
 * its render frame. Set by each Engine3D instance before it starts rendering.
 * @internal
 */
let _activeContext: Context3D | null = null;

/**
 * Proxy that always forwards to whichever Context3D is currently active.
 * All existing code that imports `webGPUContext` continues to work without
 * modification — only the target changes when a different engine activates.
 * @internal
 */
export const webGPUContext: Context3D = new Proxy({} as Context3D, {
    get(_: Context3D, prop: string | symbol): unknown {
        const ctx = _activeContext;
        if (!ctx) return undefined;
        const val = (ctx as unknown as Record<string | symbol, unknown>)[prop];
        return typeof val === 'function' ? (val as Function).bind(ctx) : val;
    },
    set(_: Context3D, prop: string | symbol, value: unknown): boolean {
        const ctx = _activeContext;
        if (ctx) (ctx as unknown as Record<string | symbol, unknown>)[prop] = value;
        return true;
    }
});

/**
 * Activate a Context3D instance as the target for `webGPUContext` accesses.
 * Called by Engine3D during init and at the start of each render frame.
 * @internal
 */
export function setActiveWebGPUContext(ctx: Context3D): void {
    _activeContext = ctx;
}
