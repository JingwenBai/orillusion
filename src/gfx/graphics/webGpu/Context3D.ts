import { CEvent, Texture } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * @internal
 */
export class Context3D extends CEventDispatcher {
    /** Shared GPU adapter across all engine instances */
    public static sharedAdapter: GPUAdapter;
    /** Shared GPU device across all engine instances */
    public static sharedDevice: GPUDevice;
    /** Shared presentation format across all engine instances */
    public static sharedPresentationFormat: GPUTextureFormat;

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

    /** Backward-compat instance getter: delegates to the shared device */
    public get adapter(): GPUAdapter {
        return Context3D.sharedAdapter;
    }

    /** Backward-compat instance getter: delegates to the shared device */
    public get device(): GPUDevice {
        return Context3D.sharedDevice;
    }

    /**
     * Configure canvas by CanvasConfig.
     * The GPUDevice is shared across all engine instances; it is created only on the
     * first call and reused by subsequent engines.
     */
    async init(canvasConfig?: CanvasConfig): Promise<boolean> {
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

        if (navigator.gpu === undefined) {
            throw new Error('Your browser does not support WebGPU!');
        }

        // Create the shared GPU device only once; all subsequent engines reuse it.
        if (!Context3D.sharedDevice) {
            Context3D.sharedAdapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance',
            });

            if (Context3D.sharedAdapter == null) {
                throw new Error('Your browser does not support WebGPU!');
            }

            Context3D.sharedDevice = await Context3D.sharedAdapter.requestDevice({
                requiredFeatures: [
                    'bgra8unorm-storage',
                    'depth-clip-control',
                    'depth32float-stencil8',
                    'indirect-first-instance',
                    'rg11b10ufloat-renderable',
                ],
                requiredLimits: {
                    minUniformBufferOffsetAlignment: 256,
                    maxStorageBufferBindingSize: Context3D.sharedAdapter.limits.maxStorageBufferBindingSize,
                },
            });

            if (Context3D.sharedDevice == null) {
                throw new Error('Your browser does not support WebGPU!');
            }

            Context3D.sharedDevice.label = 'device';
            Context3D.sharedPresentationFormat = navigator.gpu.getPreferredCanvasFormat();
        }

        this._pixelRatio = this.canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this._pixelRatio = Math.min(this._pixelRatio, 2.0);

        this.presentationFormat = Context3D.sharedPresentationFormat;
        this.context = this.canvas.getContext('webgpu');
        this.context.configure({
            device: Context3D.sharedDevice,
            format: this.presentationFormat,
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
 * @internal
 * The active WebGPU context for the engine instance currently executing its render frame.
 * Engine3D reassigns this reference at the start of each instance's render loop so that
 * all rendering subsystems automatically use the correct per-canvas state (size, swap-chain
 * texture, etc.) while sharing a single GPUDevice across engines.
 */
export let webGPUContext: Context3D = new Context3D();

/**
 * @internal
 * Called by Engine3D at the start of each render frame to redirect all
 * webGPUContext accesses to the engine instance that is currently rendering.
 */
export function setCurrentWebGPUContext(ctx: Context3D): void {
    webGPUContext = ctx;
}
