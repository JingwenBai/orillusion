import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * Shared GPU device state — one adapter + device per page, reused across Engine3D instances.
 * @internal
 */
interface SharedGPUState {
    adapter: GPUAdapter;
    device: GPUDevice;
}

let _sharedGPUState: SharedGPUState | null = null;

/**
 * @internal
 */
export class Context3D extends CEventDispatcher {

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

    /** Shared WebGPU adapter — same instance across all Engine3D instances. */
    public get adapter(): GPUAdapter {
        return _sharedGPUState?.adapter;
    }

    /** Shared WebGPU device — same instance across all Engine3D instances. */
    public get device(): GPUDevice {
        return _sharedGPUState?.device;
    }

    public get pixelRatio() {
        return this._pixelRatio;
    }

    /**
     * Configure canvas by CanvasConfig.
     * The GPU adapter and device are requested only once and shared across all instances.
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

        if (!_sharedGPUState) {
            // First Engine3D instance: request adapter and device
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
            _sharedGPUState = { adapter, device };
        }

        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        // configure per-instance canvas context
        this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context = this.canvas.getContext('webgpu');
        this.context.configure({
            device: _sharedGPUState.device,
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
 * The currently active Context3D — updated to the rendering engine instance's context
 * before each frame so that all internal systems read the correct canvas dimensions.
 * @internal
 */
export let webGPUContext: Context3D = new Context3D();

/**
 * Switch the active GPU context to the given instance before rendering its frame.
 * @internal
 */
export function setActiveContext(ctx: Context3D): void {
    webGPUContext = ctx;
}
