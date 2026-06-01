import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * @internal
 * Per-engine WebGPU canvas context.
 * The underlying GPUAdapter / GPUDevice / presentationFormat are shared
 * across all Engine3D instances (stored as static members) so that only
 * one device is created per page regardless of how many engines run.
 */
export class Context3D extends CEventDispatcher {

    // ─── Shared GPU device (one per page) ─────────────────────────────────────

    public static sharedAdapter: GPUAdapter;
    public static sharedDevice: GPUDevice;
    public static sharedPresentationFormat: GPUTextureFormat;

    // ─── Per-engine canvas state ───────────────────────────────────────────────

    public context: GPUCanvasContext;
    public aspect: number;
    public presentationSize: number[] = [0, 0];
    public canvas: HTMLCanvasElement;
    public windowWidth: number;
    public windowHeight: number;
    public canvasConfig: CanvasConfig;
    private _pixelRatio: number = 1.0;
    private _resizeEvent: CEvent;

    // Convenience accessors delegating to the shared device
    public get adapter(): GPUAdapter { return Context3D.sharedAdapter; }
    public get device(): GPUDevice { return Context3D.sharedDevice; }
    public get presentationFormat(): GPUTextureFormat { return Context3D.sharedPresentationFormat; }

    public get pixelRatio() {
        return this._pixelRatio;
    }

    /**
     * Configure canvas and (on first call) the shared GPU device.
     */
    async init(canvasConfig?: CanvasConfig): Promise<boolean> {
        this.canvasConfig = canvasConfig;

        // ── Canvas setup ──────────────────────────────────────────────────────
        if (canvasConfig && canvasConfig.canvas) {
            this.canvas = canvasConfig.canvas;
            if (this.canvas === null) throw new Error('no Canvas');

            if (!this.canvas.style.width)
                this.canvas.style.width = this.canvas.width + 'px';
            if (!this.canvas.style.height)
                this.canvas.style.height = this.canvas.height + 'px';
        } else {
            this.canvas = document.createElement('canvas');
            this.canvas.style.position = 'absolute';
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

        // ── GPU device (initialise once, reuse on subsequent engines) ─────────
        if (navigator.gpu === undefined) {
            throw new Error('Your browser does not support WebGPU!');
        }

        if (!Context3D.sharedDevice) {
            const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
            if (!adapter) throw new Error('Your browser does not support WebGPU!');

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
                    maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
                },
            });
            if (!device) throw new Error('Your browser does not support WebGPU!');

            device.label = 'device';
            Context3D.sharedAdapter = adapter;
            Context3D.sharedDevice = device;
            Context3D.sharedPresentationFormat = navigator.gpu.getPreferredCanvasFormat();
        }

        // ── Per-engine canvas context ─────────────────────────────────────────
        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        this.context = this.canvas.getContext('webgpu');
        this.context.configure({
            device: Context3D.sharedDevice,
            format: Context3D.sharedPresentationFormat,
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            alphaMode: 'premultiplied',
            colorSpace: 'srgb',
        });

        this._resizeEvent = new CResizeEvent(CResizeEvent.RESIZE, { width: this.windowWidth, height: this.windowHeight });
        const resizeObserver = new ResizeObserver(() => {
            this.updateSize();
            Texture.destroyTexture();
        });
        resizeObserver.observe(this.canvas);
        this.updateSize();
        return true;
    }

    public updateSize() {
        const w = Math.floor(this.canvas.clientWidth * this.pixelRatio);
        const h = Math.floor(this.canvas.clientHeight * this.pixelRatio);
        if (w !== this.windowWidth || h !== this.windowHeight) {
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
 * Legacy module-level export kept for backward compatibility.
 * Single-engine code that imports `webGPUContext` continues to work.
 * With multiple engines, prefer `engine.context` for canvas-specific state.
 */
export let webGPUContext = new Context3D();
