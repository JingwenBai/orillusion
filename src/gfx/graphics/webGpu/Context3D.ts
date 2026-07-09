import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * Per-canvas WebGPU context. Each Engine3D instance owns one CanvasContext.
 * @internal
 */
export class CanvasContext extends CEventDispatcher {
    public context: GPUCanvasContext;
    public aspect: number = 1;
    public presentationSize: number[] = [0, 0];
    public canvas: HTMLCanvasElement;
    public windowWidth: number = 0;
    public windowHeight: number = 0;
    public canvasConfig: CanvasConfig;
    private _pixelRatio: number = 1.0;
    private _resizeEvent: CEvent;

    public get pixelRatio() {
        return this._pixelRatio;
    }

    /**
     * Configure and attach a canvas. Must be called with a shared GPUDevice.
     */
    async init(canvasConfig: CanvasConfig | undefined, device: GPUDevice, presentationFormat: GPUTextureFormat): Promise<void> {
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

        this._pixelRatio = canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        this.context = this.canvas.getContext('webgpu');
        this.context.configure({
            device: device,
            format: presentationFormat,
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
        let w = Math.floor(this.canvas.clientWidth * this._pixelRatio);
        let h = Math.floor(this.canvas.clientHeight * this._pixelRatio);
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
 * Shared WebGPU device context. Canvas-specific properties delegate to the
 * currently active CanvasContext, which is set by Engine3D before each frame.
 * @internal
 */
export class Context3D extends CEventDispatcher {

    public adapter: GPUAdapter;
    public device: GPUDevice;
    public presentationFormat: GPUTextureFormat;

    private _activeCanvas: CanvasContext | null = null;

    // --- Canvas-specific getters (delegate to active canvas) ---

    public get canvas(): HTMLCanvasElement {
        return this._activeCanvas?.canvas;
    }

    public get context(): GPUCanvasContext {
        return this._activeCanvas?.context;
    }

    public get aspect(): number {
        return this._activeCanvas?.aspect ?? 1;
    }

    public get presentationSize(): number[] {
        return this._activeCanvas?.presentationSize ?? [0, 0];
    }

    public get windowWidth(): number {
        return this._activeCanvas?.windowWidth ?? 0;
    }

    public get windowHeight(): number {
        return this._activeCanvas?.windowHeight ?? 0;
    }

    public get canvasConfig(): CanvasConfig {
        return this._activeCanvas?.canvasConfig;
    }

    public get pixelRatio(): number {
        return this._activeCanvas?.pixelRatio ?? 1;
    }

    /**
     * Set the active CanvasContext. Called by Engine3D at the start of each
     * render frame so that canvas-specific properties reflect the current engine.
     */
    public setActiveCanvas(ctx: CanvasContext | null) {
        if (this._activeCanvas === ctx) return;
        this._activeCanvas = ctx;
    }

    /**
     * Initialise the shared WebGPU device. Safe to call multiple times;
     * subsequent calls are no-ops once the device has been created.
     */
    async initGPU(): Promise<void> {
        if (this.device) return;

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
    }

    /**
     * Create a new CanvasContext for the given config. The shared GPU device
     * is initialised if it has not been already.
     */
    async createCanvasContext(canvasConfig?: CanvasConfig): Promise<CanvasContext> {
        await this.initGPU();
        const ctx = new CanvasContext();
        await ctx.init(canvasConfig, this.device, this.presentationFormat);
        // Forward resize events from this canvas to webGPUContext for backward compat
        ctx.addEventListener(CResizeEvent.RESIZE, (e: CEvent) => {
            this._activeCanvas === ctx && this.dispatchEvent(e);
        });
        return ctx;
    }

    /**
     * Legacy single-canvas init. Creates the GPU device and a default canvas.
     * @deprecated Use Engine3D.init() which calls createCanvasContext() internally.
     */
    async init(canvasConfig?: CanvasConfig): Promise<boolean> {
        const ctx = await this.createCanvasContext(canvasConfig);
        this.setActiveCanvas(ctx);
        return true;
    }

    /** @deprecated Use CanvasContext.updateSize() */
    public updateSize() {
        this._activeCanvas?.updateSize();
    }
}

/**
 * @internal
 */
export let webGPUContext = new Context3D();
