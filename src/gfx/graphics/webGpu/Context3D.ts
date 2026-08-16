import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * Per-canvas surface: holds the canvas element, GPUCanvasContext, and size state.
 * Each Engine3D instance owns one CanvasSurface.
 * @internal
 */
export class CanvasSurface extends CEventDispatcher {
    public canvas: HTMLCanvasElement;
    public context: GPUCanvasContext;
    public aspect: number = 1;
    public presentationSize: number[] = [0, 0];
    public windowWidth: number = 0;
    public windowHeight: number = 0;
    public canvasConfig: CanvasConfig;
    private _pixelRatio: number = 1.0;
    private _resizeEvent: CEvent;

    public get pixelRatio(): number {
        return this._pixelRatio;
    }

    /**
     * Set up the canvas and configure the WebGPU surface.
     * Called once per Engine3D instance during init.
     */
    async init(canvasConfig: CanvasConfig, device: GPUDevice, presentationFormat: GPUTextureFormat): Promise<void> {
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

        this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
        this.context.configure({
            device,
            format: presentationFormat,
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            alphaMode: 'premultiplied',
            colorSpace: `srgb`,
        });

        this._resizeEvent = new CResizeEvent(CResizeEvent.RESIZE, { width: this.windowWidth, height: this.windowHeight });
        const resizeObserver = new ResizeObserver(() => {
            this.updateSize();
            Texture.destroyTexture();
        });
        resizeObserver.observe(this.canvas);
        this.updateSize();
    }

    public updateSize(): void {
        let w = Math.floor(this.canvas.clientWidth * this._pixelRatio);
        let h = Math.floor(this.canvas.clientHeight * this._pixelRatio);
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
 * Shared WebGPU device context (one per page).
 * Manages the GPUAdapter/GPUDevice which are shared across all Engine3D instances.
 * Canvas-specific state is stored in CanvasSurface; this class proxies the active one.
 * @internal
 */
export class Context3D extends CEventDispatcher {
    public adapter: GPUAdapter;
    public device: GPUDevice;
    public presentationFormat: GPUTextureFormat;

    private _activeSurface: CanvasSurface = null;

    // --- Forwarding getters: delegate to active canvas surface ---
    public get canvas(): HTMLCanvasElement { return this._activeSurface?.canvas; }
    public get context(): GPUCanvasContext { return this._activeSurface?.context; }
    public get aspect(): number { return this._activeSurface?.aspect ?? 1; }
    public get presentationSize(): number[] { return this._activeSurface?.presentationSize ?? [0, 0]; }
    public get windowWidth(): number { return this._activeSurface?.windowWidth ?? 0; }
    public get windowHeight(): number { return this._activeSurface?.windowHeight ?? 0; }
    public get pixelRatio(): number { return this._activeSurface?.pixelRatio ?? 1; }
    public get canvasConfig(): CanvasConfig { return this._activeSurface?.canvasConfig; }

    /**
     * Set which canvas surface is currently rendering.
     * Called by Engine3D before each render frame.
     */
    public setActiveSurface(surface: CanvasSurface): void {
        this._activeSurface = surface;
    }

    public getActiveSurface(): CanvasSurface {
        return this._activeSurface;
    }

    /**
     * Initialize the shared GPU device (once) and create a canvas surface.
     * Subsequent calls reuse the existing device and create a new canvas surface.
     * @returns The newly created CanvasSurface
     */
    async init(canvasConfig?: CanvasConfig): Promise<CanvasSurface> {
        if (!this.device) {
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
        }

        const surface = new CanvasSurface();
        await surface.init(canvasConfig, this.device, this.presentationFormat);
        this._activeSurface = surface;
        return surface;
    }

    public updateSize(): void {
        this._activeSurface?.updateSize();
    }
}

/**
 * @internal
 * Shared WebGPU context singleton (adapter + device).
 * Canvas-specific state lives in each Engine3D instance's CanvasSurface.
 */
export let webGPUContext = new Context3D();
