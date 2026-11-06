import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';
import { EngineRegistry } from '../../../core/EngineRegistry';

/**
 * Per-engine WebGPU canvas context.  Holds both the shared GPU device
 * (adapter / device are reused across all engines on the same page) and the
 * per-canvas state (GPUCanvasContext, presentationSize, …).
 * @internal
 */
export class Context3D extends CEventDispatcher {

    // ─── Shared device ────────────────────────────────────────────────────────
    /** @internal Shared GPUAdapter – initialised once per page. */
    public static sharedAdapter: GPUAdapter = null;
    /** @internal Shared GPUDevice – reused by all Engine3D instances. */
    public static sharedDevice: GPUDevice = null;
    /** @internal Shared preferred canvas format. */
    public static sharedPresentationFormat: GPUTextureFormat = null;

    // ─── Per-instance canvas state ────────────────────────────────────────────
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
     * On first call: requests a GPUAdapter + GPUDevice and stores them in
     * the shared statics.  Subsequent calls reuse the shared device.
     */
    async init(canvasConfig?: CanvasConfig): Promise<boolean> {
        this.canvasConfig = canvasConfig;

        if (canvasConfig && canvasConfig.canvas) {
            this.canvas = canvasConfig.canvas;
            if (this.canvas === null) {
                throw new Error('no Canvas')
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

        if (navigator.gpu === undefined) {
            throw new Error('Your browser does not support WebGPU!');
        }

        // ── Device init: only once per page ──────────────────────────────────
        if (!Context3D.sharedDevice) {
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

            // Store for reuse by subsequent Engine3D instances
            Context3D.sharedAdapter = this.adapter;
            Context3D.sharedDevice = this.device;
            Context3D.sharedPresentationFormat = this.presentationFormat;
        } else {
            // Reuse existing device for additional engine instances
            this.adapter = Context3D.sharedAdapter;
            this.device = Context3D.sharedDevice;
            this.presentationFormat = Context3D.sharedPresentationFormat;
        }
        // ─────────────────────────────────────────────────────────────────────

        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        // Per-engine canvas WebGPU context
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
 * A transparent proxy that always delegates to the currently-active engine's
 * Context3D instance.  This allows the existing codebase (243 call sites) to
 * keep using `webGPUContext` unchanged while supporting multiple Engine3D
 * instances running on separate canvases.
 *
 * Property accesses resolve to `EngineRegistry.current?.context3D` when inside
 * an engine operation (init / render frame / startRenderView), falling back to
 * `EngineRegistry.default?.context3D` for code that runs outside those scopes.
 *
 * @internal
 */
class Context3DProxy {
    private get _ctx(): Context3D {
        const engine = EngineRegistry.active;
        return engine?.context3D ?? null;
    }

    // ── Static device (same for all engines) ──────────────────────────────────
    get adapter(): GPUAdapter {
        return this._ctx?.adapter ?? Context3D.sharedAdapter;
    }
    get device(): GPUDevice {
        return this._ctx?.device ?? Context3D.sharedDevice;
    }
    get presentationFormat(): GPUTextureFormat {
        return this._ctx?.presentationFormat ?? Context3D.sharedPresentationFormat;
    }

    // ── Per-engine canvas state ────────────────────────────────────────────────
    get context(): GPUCanvasContext { return this._ctx?.context; }
    get aspect(): number { return this._ctx?.aspect ?? 1; }
    get presentationSize(): number[] { return this._ctx?.presentationSize ?? [0, 0]; }
    get canvas(): HTMLCanvasElement { return this._ctx?.canvas; }
    get windowWidth(): number { return this._ctx?.windowWidth ?? 0; }
    get windowHeight(): number { return this._ctx?.windowHeight ?? 0; }
    get canvasConfig(): CanvasConfig { return this._ctx?.canvasConfig; }
    get pixelRatio(): number { return this._ctx?.pixelRatio ?? 1; }

    // ── Event system ──────────────────────────────────────────────────────────
    addEventListener(type: string | number, fn: Function, thisObj?: any, param?: any, priority?: number): number {
        return this._ctx?.addEventListener(type, fn, thisObj, param, priority) ?? -1;
    }
    removeEventListener(type: string | number, fn: Function, thisObj?: any) {
        return this._ctx?.removeEventListener(type, fn, thisObj);
    }
    removeEventListenerAt(id: number): boolean {
        return this._ctx?.removeEventListenerAt(id) ?? false;
    }
    removeAllEventListener(eventType?: string | number) {
        return this._ctx?.removeAllEventListener(eventType);
    }
    dispatchEvent(event: any) {
        return this._ctx?.dispatchEvent(event);
    }
    hasEventListener(type: string | number, fn?: Function, thisObj?: any): boolean {
        return this._ctx?.hasEventListener(type, fn, thisObj) ?? false;
    }
    containEventListener(type: string): boolean {
        return this._ctx?.containEventListener(type) ?? false;
    }

    // ── Other methods ─────────────────────────────────────────────────────────
    updateSize() { return this._ctx?.updateSize(); }
}

/**
 * @internal
 * Global WebGPU context proxy.  Delegates to the currently-active Engine3D
 * instance's Context3D so that all existing call sites continue to work
 * unchanged, while each Engine3D instance manages its own canvas and context.
 */
export const webGPUContext: Context3D = new Context3DProxy() as unknown as Context3D;
