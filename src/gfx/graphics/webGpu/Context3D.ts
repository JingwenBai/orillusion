import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

// Shared WebGPU device/adapter — one per browser page, reused across all Engine3D instances
let _sharedAdapter: GPUAdapter = null;
let _sharedDevice: GPUDevice = null;
let _sharedPresentationFormat: GPUTextureFormat = null;

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
     * Configure canvas by CanvasConfig. The WebGPU adapter/device is shared across all
     * Context3D instances; only the canvas and GPUCanvasContext are per-instance.
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

        // Initialize shared adapter + device once for the whole page
        if (!_sharedDevice) {
            if (navigator.gpu === undefined) {
                throw new Error('Your browser does not support WebGPU!');
            }

            _sharedAdapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance',
            });

            if (_sharedAdapter == null) {
                throw new Error('Your browser does not support WebGPU!');
            }

            _sharedDevice = await _sharedAdapter.requestDevice({
                requiredFeatures: [
                    "bgra8unorm-storage",
                    "depth-clip-control",
                    "depth32float-stencil8",
                    "indirect-first-instance",
                    "rg11b10ufloat-renderable",
                ],
                requiredLimits: {
                    minUniformBufferOffsetAlignment: 256,
                    maxStorageBufferBindingSize: _sharedAdapter.limits.maxStorageBufferBindingSize
                }
            });

            if (_sharedDevice == null) {
                throw new Error('Your browser does not support WebGPU!');
            }

            _sharedDevice.label = 'device';
            _sharedPresentationFormat = navigator.gpu.getPreferredCanvasFormat();
        }

        // Assign shared references to this instance
        this.adapter = _sharedAdapter;
        this.device = _sharedDevice;
        this.presentationFormat = _sharedPresentationFormat;

        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        // Configure this instance's canvas context (per-instance)
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
 * The currently active WebGPU context. Updated by each Engine3D instance before it
 * renders so that all subsystems (textures, shaders, pass renderers) automatically
 * target the right canvas/context. Because JavaScript is single-threaded, swapping
 * this before each engine's render frame is safe.
 * @internal
 */
export let webGPUContext: Context3D = new Context3D();

/**
 * Set the active WebGPU context. Called by Engine3D before rendering a frame so that
 * all subsystems reference the correct per-engine canvas and presentation state.
 * @internal
 */
export function setActiveWebGPUContext(ctx: Context3D): void {
    webGPUContext = ctx;
}
