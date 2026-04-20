import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * Shared WebGPU adapter and device state.
 * The adapter and device are created once and reused across all Engine3D instances.
 * @internal
 */
class WebGPUDeviceState {
    public static adapter: GPUAdapter = null;
    public static device: GPUDevice = null;
    public static presentationFormat: GPUTextureFormat = null;
    private static _initialized: boolean = false;

    public static async init(): Promise<boolean> {
        if (this._initialized) return true;

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
        this._initialized = true;
        return true;
    }
}

/**
 * Per-instance WebGPU canvas context.
 * Each Engine3D instance owns one Context3D that wraps a canvas element and its
 * GPUCanvasContext.  The underlying GPUDevice and GPUAdapter are shared across
 * all instances via WebGPUDeviceState.
 * @internal
 */
export class Context3D extends CEventDispatcher {

    public context: GPUCanvasContext;
    public aspect: number;
    public presentationSize: number[] = [0, 0];
    public canvas: HTMLCanvasElement;
    public windowWidth: number;
    public windowHeight: number;
    public canvasConfig: CanvasConfig;
    private _pixelRatio: number = 1.0;
    private _resizeEvent: CEvent;

    /** Shared GPU adapter (same for every Context3D instance). */
    public get adapter(): GPUAdapter {
        return WebGPUDeviceState.adapter;
    }

    /** Shared GPU device (same for every Context3D instance). */
    public get device(): GPUDevice {
        return WebGPUDeviceState.device;
    }

    /** Shared presentation format (same for every Context3D instance). */
    public get presentationFormat(): GPUTextureFormat {
        return WebGPUDeviceState.presentationFormat;
    }

    public get pixelRatio() {
        return this._pixelRatio;
    }

    /**
     * Configure canvas by CanvasConfig.
     * The first call initialises the shared WebGPU device; subsequent calls reuse it.
     * @param canvasConfig
     */
    async init(canvasConfig?: CanvasConfig): Promise<boolean> {
        this.canvasConfig = canvasConfig;

        // Initialize shared GPU device (no-op if already done).
        await WebGPUDeviceState.init();

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
            device: WebGPUDeviceState.device,
            format: WebGPUDeviceState.presentationFormat,
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
 * The currently-active Context3D instance.
 * Points to the context of whichever Engine3D instance is currently rendering.
 * All subsystem code that imports this symbol always operates on the right canvas
 * without any changes – the active engine swaps this reference before rendering.
 * @internal
 */
export let webGPUContext: Context3D = new Context3D();

/**
 * Switch the active GPU context to the given instance.
 * Called by Engine3D.init() and before each render frame.
 * @internal
 */
export function setActiveGPUContext(ctx: Context3D): void {
    webGPUContext = ctx;
}
