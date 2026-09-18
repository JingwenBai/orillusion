import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * Per-engine WebGPU context: owns a canvas element and a GPUCanvasContext swap chain.
 *
 * The underlying GPUAdapter and GPUDevice are shared across all Context3D instances
 * (initialized on first use) so shaders, pipelines, and buffers created by one engine
 * can be reused by others when they share the same page.
 *
 * @internal
 */
export class Context3D extends CEventDispatcher {

    // ─── Shared GPU objects (class-level singletons) ────────────────────────────

    /** @internal */
    private static _sharedAdapter: GPUAdapter | null = null;

    /** @internal */
    private static _sharedDevice: GPUDevice | null = null;

    /** @internal */
    private static _presentationFormat: GPUTextureFormat | null = null;

    // ─── Per-instance (per-canvas) state ────────────────────────────────────────

    public context: GPUCanvasContext;
    public aspect: number;
    public presentationSize: number[] = [0, 0];
    public canvas: HTMLCanvasElement;
    public windowWidth: number;
    public windowHeight: number;
    public canvasConfig: CanvasConfig;
    private _pixelRatio: number = 1.0;
    private _resizeEvent: CEvent;

    // ─── Accessors that delegate to shared objects ──────────────────────────────

    /** Shared GPUAdapter (available after first init()). */
    public get adapter(): GPUAdapter {
        return Context3D._sharedAdapter;
    }

    /** Shared GPUDevice (available after first init()). */
    public get device(): GPUDevice {
        return Context3D._sharedDevice;
    }

    /** Preferred canvas presentation format (shared). */
    public get presentationFormat(): GPUTextureFormat {
        return Context3D._presentationFormat;
    }

    public get pixelRatio(): number {
        return this._pixelRatio;
    }

    /**
     * Initialize this context for the given canvas configuration.
     *
     * If the shared GPUDevice has not yet been acquired (first engine), this method
     * requests an adapter and device from the browser.  Subsequent engines reuse the
     * same device and only set up their own canvas swap chain.
     */
    async init(canvasConfig?: CanvasConfig): Promise<boolean> {
        this.canvasConfig = canvasConfig;

        // ── Canvas setup ──────────────────────────────────────────────────────
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

        // ── Shared GPU device (acquired once, then reused) ────────────────────
        if (navigator.gpu === undefined) {
            throw new Error('Your browser does not support WebGPU!');
        }

        if (!Context3D._sharedAdapter) {
            Context3D._sharedAdapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance',
            });
            if (!Context3D._sharedAdapter) {
                throw new Error('Your browser does not support WebGPU!');
            }
        }

        if (!Context3D._sharedDevice) {
            Context3D._sharedDevice = await Context3D._sharedAdapter.requestDevice({
                requiredFeatures: [
                    'bgra8unorm-storage',
                    'depth-clip-control',
                    'depth32float-stencil8',
                    'indirect-first-instance',
                    'rg11b10ufloat-renderable',
                ],
                requiredLimits: {
                    minUniformBufferOffsetAlignment: 256,
                    maxStorageBufferBindingSize:
                        Context3D._sharedAdapter.limits.maxStorageBufferBindingSize,
                },
            });
            if (!Context3D._sharedDevice) {
                throw new Error('Your browser does not support WebGPU!');
            }
            Context3D._sharedDevice.label = 'device';
            Context3D._presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        }

        // ── Per-instance swap chain ───────────────────────────────────────────
        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        this.context = this.canvas.getContext('webgpu');
        this.context.configure({
            device: Context3D._sharedDevice,
            format: Context3D._presentationFormat,
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            alphaMode: 'premultiplied',
            colorSpace: 'srgb',
        });

        this._resizeEvent = new CResizeEvent(CResizeEvent.RESIZE, {
            width: this.windowWidth,
            height: this.windowHeight,
        });

        const resizeObserver = new ResizeObserver(() => {
            this.updateSize();
            Texture.destroyTexture();
        });
        resizeObserver.observe(this.canvas);
        this.updateSize();

        return true;
    }

    public updateSize(): void {
        let w = Math.floor(this.canvas.clientWidth * this.pixelRatio);
        let h = Math.floor(this.canvas.clientHeight * this.pixelRatio);
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
 * The currently-active WebGPU context.
 * Automatically updated to the rendering engine's context at the start of each frame.
 *
 * All engine-internal code that imports this variable always sees the correct context
 * because JavaScript is single-threaded and frames execute sequentially.
 *
 * @internal
 */
export let webGPUContext: Context3D = new Context3D();

/**
 * Update the global webGPUContext to point to a specific engine's canvas context.
 * Called by EngineCore at the start of each frame and during initialization.
 * @internal
 */
export function setWebGPUContext(ctx: Context3D): void {
    webGPUContext = ctx;
}
