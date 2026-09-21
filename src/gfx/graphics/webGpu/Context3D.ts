import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * @internal
 */
export class Context3D extends CEventDispatcher {

    // Shared WebGPU device/adapter state across all engine instances on this page
    private static _sharedAdapter: GPUAdapter;
    private static _sharedDevice: GPUDevice;
    private static _sharedFormat: GPUTextureFormat;
    private static _deviceInitialized: boolean = false;

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

    /** Shared WebGPU adapter (one per page, reused across all engine instances) */
    public get adapter(): GPUAdapter {
        return Context3D._sharedAdapter;
    }

    /** Shared WebGPU device (one per page, reused across all engine instances) */
    public get device(): GPUDevice {
        return Context3D._sharedDevice;
    }

    /** Shared preferred canvas format */
    public get presentationFormat(): GPUTextureFormat {
        return Context3D._sharedFormat;
    }

    /**
     * Configure canvas by CanvasConfig.
     * The WebGPU adapter and device are requested only on the first call and
     * reused for all subsequent engine instances.
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

        // Initialize the shared device only once (reused by all engine instances)
        if (!Context3D._deviceInitialized) {
            Context3D._deviceInitialized = true;

            // request adapter
            Context3D._sharedAdapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance',
                // powerPreference: 'low-power',
            });

            if (Context3D._sharedAdapter == null) {
                throw new Error('Your browser does not support WebGPU!');
            }

            // request device
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

        // configure this canvas's webgpu context using the shared device
        this.context = this.canvas.getContext('webgpu');
        this.context.configure({
            device: Context3D._sharedDevice,
            format: Context3D._sharedFormat,
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
 * Active WebGPU context for the currently rendering engine instance.
 * Use setActiveWebGPUContext() to switch contexts between engine instances.
 */
export let webGPUContext: Context3D = new Context3D();

/**
 * @internal
 * Switch the global active WebGPU context to the given engine instance's context.
 * Called automatically at the start of each engine render frame so that all
 * subsystems (shaders, textures, render passes) reference the correct canvas.
 */
export function setActiveWebGPUContext(ctx: Context3D): void {
    webGPUContext = ctx;
}
