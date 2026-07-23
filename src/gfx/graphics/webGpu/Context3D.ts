import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * @internal
 */
export class Context3D extends CEventDispatcher {

    // --- Shared device-level state (one GPUDevice per application, shared across all Engine3D instances) ---
    public static adapter: GPUAdapter;
    public static device: GPUDevice;
    public static presentationFormat: GPUTextureFormat;
    private static _deviceInitialized: boolean = false;

    // --- Per-instance canvas-level state ---
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

    // Convenience instance getters delegate to shared static state
    public get device(): GPUDevice { return Context3D.device; }
    public get adapter(): GPUAdapter { return Context3D.adapter; }

    /**
     * Configure canvas by CanvasConfig.
     * The GPUDevice is initialized once (shared across all Engine3D instances);
     * the canvas and swap-chain are per-instance.
     */
    async init(canvasConfig?: CanvasConfig): Promise<boolean> {
        if (!Context3D._deviceInitialized) {
            await Context3D._initDevice();
            Context3D._deviceInitialized = true;
        }
        await this._initCanvas(canvasConfig);
        return true;
    }

    private static async _initDevice(): Promise<void> {
        if (navigator.gpu === undefined) {
            throw new Error('Your browser does not support WebGPU!');
        }

        Context3D.adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance',
        });

        if (Context3D.adapter == null) {
            throw new Error('Your browser does not support WebGPU!');
        }

        Context3D.device = await Context3D.adapter.requestDevice({
            requiredFeatures: [
                "bgra8unorm-storage",
                "depth-clip-control",
                "depth32float-stencil8",
                "indirect-first-instance",
                "rg11b10ufloat-renderable",
            ],
            requiredLimits: {
                minUniformBufferOffsetAlignment: 256,
                maxStorageBufferBindingSize: Context3D.adapter.limits.maxStorageBufferBindingSize
            }
        });

        if (Context3D.device == null) {
            throw new Error('Your browser does not support WebGPU!');
        }

        Context3D.device.label = 'device';
        Context3D.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
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
            device: Context3D.device,
            format: Context3D.presentationFormat,
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
 * Points to the currently-active engine's Context3D.
 * Updated by Engine3D before each render frame via setActiveWebGPUContext().
 * All code that imports webGPUContext sees the live binding (ES module semantics),
 * so it automatically refers to the correct engine's canvas/swap-chain.
 */
export let webGPUContext: Context3D = new Context3D();

/**
 * @internal
 * Switch which engine's canvas is the active render target.
 * Called by Engine3D at the start of every render frame.
 */
export function setActiveWebGPUContext(ctx: Context3D): void {
    webGPUContext = ctx;
}
