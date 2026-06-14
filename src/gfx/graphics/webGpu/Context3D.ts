import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

// Shared GPU resources — one adapter/device per browser page, reused across all Engine3D instances.
let _sharedAdapter: GPUAdapter | null = null;
let _sharedDevice: GPUDevice | null = null;

// The Context3D instance that is currently "active" (i.e. the engine that owns the current frame).
let _activeContext: Context3D | null = null;

/**
 * Activate a Context3D so that the global `webGPUContext` proxy forwards to it.
 * Engine3D calls this at the start of every frame and whenever it performs
 * canvas-specific GPU work.
 * @internal
 */
export function activateWebGPUContext(ctx: Context3D): void {
    _activeContext = ctx;
}

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
     * Configure canvas by CanvasConfig.
     * The WebGPU adapter and device are shared across all Context3D instances
     * (they are browser-level singletons). Only canvas-specific state is
     * created per instance.
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

        // Request adapter once and reuse for all subsequent Engine3D instances.
        if (!_sharedAdapter) {
            _sharedAdapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance',
            });
            if (_sharedAdapter == null) {
                throw new Error('Your browser does not support WebGPU!');
            }
        }
        this.adapter = _sharedAdapter;

        // Request device once and reuse for all subsequent Engine3D instances.
        if (!_sharedDevice) {
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
        }
        this.device = _sharedDevice;

        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        // Configure the canvas-specific WebGPU context.
        this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
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
            this.updateSize();
            Texture.destroyTexture();
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
 * Global WebGPU context proxy.
 *
 * This export exists for backward compatibility: all existing code that imports
 * `webGPUContext` continues to work without modification.  The proxy forwards
 * every property access and method call to whichever `Context3D` instance is
 * currently active (i.e. the one belonging to the Engine3D that owns the
 * current render frame).
 *
 * Engine3D calls `activateWebGPUContext(this.context3D)` at the start of
 * every frame, so even with multiple engine instances the correct canvas /
 * presentation context is always in scope.
 *
 * @internal
 */
export const webGPUContext: Context3D = new Proxy(Object.create(null) as Context3D, {
    get(_: Context3D, key: string | symbol): unknown {
        // Prevent Promise-detection (e.g. `.then`) from treating the proxy as a thenable.
        if (key === 'then') return undefined;
        const val = (_activeContext as unknown as Record<string | symbol, unknown>)?.[key];
        return typeof val === 'function' ? (val as Function).bind(_activeContext) : val;
    },
    set(_: Context3D, key: string | symbol, value: unknown): boolean {
        if (_activeContext) {
            (_activeContext as unknown as Record<string | symbol, unknown>)[key] = value;
        }
        return true;
    },
}) as unknown as Context3D;
