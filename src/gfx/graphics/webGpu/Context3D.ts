import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * Per-Engine3D canvas context: holds the WebGPU surface and size for one canvas.
 * Created by Context3D.initCanvas() for each Engine3D instance.
 * @internal
 */
export class CanvasContext {
    public context: GPUCanvasContext;
    public canvas: HTMLCanvasElement;
    public windowWidth: number = 0;
    public windowHeight: number = 0;
    public aspect: number = 1;
    public presentationSize: number[] = [0, 0];
    public canvasConfig: CanvasConfig;
    private _pixelRatio: number = 1.0;

    public get pixelRatio(): number {
        return this._pixelRatio;
    }

    /** Configure the canvas element and connect it to the shared WebGPU device. */
    async setup(canvasConfig: CanvasConfig, device: GPUDevice, presentationFormat: GPUTextureFormat): Promise<void> {
        this.canvasConfig = canvasConfig;

        if (canvasConfig && canvasConfig.canvas) {
            this.canvas = canvasConfig.canvas;
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
            this.canvas.style.zIndex = canvasConfig?.zIndex != null ? canvasConfig.zIndex.toString() : '0';
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

        this._pixelRatio = canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        this.context = this.canvas.getContext('webgpu');
        this.context.configure({
            device,
            format: presentationFormat,
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            alphaMode: 'premultiplied',
            colorSpace: 'srgb',
        });
    }

    /**
     * Sync canvas pixel size from its CSS layout size.
     * Returns true when the size actually changed.
     */
    public updateSize(): boolean {
        const w = Math.floor(this.canvas.clientWidth * this._pixelRatio);
        const h = Math.floor(this.canvas.clientHeight * this._pixelRatio);
        if (w !== this.windowWidth || h !== this.windowHeight) {
            this.canvas.width = this.windowWidth = w;
            this.canvas.height = this.windowHeight = h;
            this.presentationSize[0] = w;
            this.presentationSize[1] = h;
            this.aspect = h > 0 ? w / h : 1;
            return true;
        }
        return false;
    }
}

/**
 * Shared WebGPU device context.
 * The GPU adapter and device are created once and shared across all Engine3D instances.
 * Canvas-specific state (surface, size, aspect) is stored in CanvasContext and accessed
 * via the activeCanvas reference, which is switched by each Engine3D before rendering.
 * @internal
 */
export class Context3D extends CEventDispatcher {

    public adapter: GPUAdapter;
    public device: GPUDevice;
    public presentationFormat: GPUTextureFormat;

    private _activeCanvas: CanvasContext = null;
    private _resizeEvent: CEvent;

    /** The canvas context currently being rendered by the active Engine3D instance. */
    public get activeCanvas(): CanvasContext {
        return this._activeCanvas;
    }

    public setActiveCanvas(ctx: CanvasContext): void {
        this._activeCanvas = ctx;
    }

    // --- Canvas property delegates (point at the active CanvasContext) ---

    public get context(): GPUCanvasContext { return this._activeCanvas?.context; }
    public get canvas(): HTMLCanvasElement { return this._activeCanvas?.canvas; }
    public get windowWidth(): number { return this._activeCanvas?.windowWidth ?? 0; }
    public get windowHeight(): number { return this._activeCanvas?.windowHeight ?? 0; }
    public get aspect(): number { return this._activeCanvas?.aspect ?? 1; }
    public get presentationSize(): number[] { return this._activeCanvas?.presentationSize ?? [0, 0]; }
    public get pixelRatio(): number { return this._activeCanvas?.pixelRatio ?? 1; }
    public get canvasConfig(): CanvasConfig { return this._activeCanvas?.canvasConfig; }

    // -----------------------------------------------------------------------

    /**
     * Initialize the shared GPU adapter and device.
     * Call once; subsequent calls are no-ops since the device is already created.
     */
    async initDevice(): Promise<boolean> {
        if (navigator.gpu === undefined) {
            throw new Error('Your browser does not support WebGPU!');
        }

        this.adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance',
        });

        if (this.adapter == null) {
            throw new Error('Your browser does not support WebGPU!');
        }

        this.device = await this.adapter.requestDevice({
            requiredFeatures: [
                'bgra8unorm-storage',
                'depth-clip-control',
                'depth32float-stencil8',
                'indirect-first-instance',
                'rg11b10ufloat-renderable',
            ],
            requiredLimits: {
                minUniformBufferOffsetAlignment: 256,
                maxStorageBufferBindingSize: this.adapter.limits.maxStorageBufferBindingSize,
            },
        });

        if (this.device == null) {
            throw new Error('Your browser does not support WebGPU!');
        }

        this.device.label = 'device';
        this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this._resizeEvent = new CResizeEvent(CResizeEvent.RESIZE, { width: 0, height: 0 });
        return true;
    }

    /**
     * Create a new CanvasContext for one Engine3D instance.
     * Can be called multiple times (once per Engine3D instance).
     */
    async initCanvas(canvasConfig?: CanvasConfig): Promise<CanvasContext> {
        const ctx = new CanvasContext();
        await ctx.setup(canvasConfig, this.device, this.presentationFormat);
        this._activeCanvas = ctx;

        const resizeObserver = new ResizeObserver(() => {
            const changed = ctx.updateSize();
            Texture.destroyTexture();
            // Forward resize event on webGPUContext so existing listeners still work.
            // Only fire when this canvas is the currently active one.
            if (changed && ctx === this._activeCanvas) {
                this._resizeEvent.data.width = ctx.windowWidth;
                this._resizeEvent.data.height = ctx.windowHeight;
                this.dispatchEvent(this._resizeEvent);
            }
        });
        resizeObserver.observe(ctx.canvas);
        ctx.updateSize();

        return ctx;
    }

    /**
     * Backwards-compatible single-call init (device + first canvas).
     * New code should call initDevice() once and initCanvas() per Engine3D instance.
     */
    async init(canvasConfig?: CanvasConfig): Promise<boolean> {
        await this.initDevice();
        await this.initCanvas(canvasConfig);
        return true;
    }

    public updateSize(): void {
        if (this._activeCanvas?.updateSize()) {
            this._resizeEvent.data.width = this._activeCanvas.windowWidth;
            this._resizeEvent.data.height = this._activeCanvas.windowHeight;
            this.dispatchEvent(this._resizeEvent);
        }
    }
}

/**
 * @internal
 */
export let webGPUContext = new Context3D();
