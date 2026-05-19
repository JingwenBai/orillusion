import { CEvent } from '../../..';
import { CEventDispatcher } from '../../../event/CEventDispatcher';
import { CResizeEvent } from '../../../event/CResizeEvent';
import { CanvasConfig } from './CanvasConfig';

/**
 * Per-engine canvas context. Holds per-canvas state extracted from Context3D.
 * Each Engine3D instance owns one EngineContext.
 * @internal
 */
export class EngineContext extends CEventDispatcher {
    public canvas: HTMLCanvasElement;
    public gpuContext: GPUCanvasContext;
    public width: number = 0;
    public height: number = 0;
    public size: number[] = [0, 0];
    public aspect: number = 1;
    public canvasConfig: CanvasConfig;
    public pixelRatio: number = 1;

    // Per-engine GPU resource maps (avoid static collision between instances)
    public gBufferMap: Map<string, any> = new Map();
    public rtTextureMap: Map<string, any> = new Map();
    public rtViewQuad: Map<string, any> = new Map();

    private _resizeEvent: CEvent;

    async init(canvasConfig: CanvasConfig | undefined, device: GPUDevice, presentationFormat: GPUTextureFormat): Promise<void> {
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

        this.pixelRatio = canvasConfig?.devicePixelRatio || window.devicePixelRatio || 1;
        this.pixelRatio = Math.min(this.pixelRatio, 2.0);

        this.gpuContext = this.canvas.getContext('webgpu') as GPUCanvasContext;
        this.gpuContext.configure({
            device,
            format: presentationFormat,
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            alphaMode: 'premultiplied',
            colorSpace: 'srgb',
        });

        this._resizeEvent = new CResizeEvent(CResizeEvent.RESIZE, { width: this.width, height: this.height });
        const resizeObserver = new ResizeObserver(() => {
            this.updateSize();
        });
        resizeObserver.observe(this.canvas);
        this.updateSize();
    }

    public updateSize(): void {
        let w = Math.floor(this.canvas.clientWidth * this.pixelRatio);
        let h = Math.floor(this.canvas.clientHeight * this.pixelRatio);
        if (w !== this.width || h !== this.height) {
            this.canvas.width = this.width = w;
            this.canvas.height = this.height = h;
            this.size[0] = this.width;
            this.size[1] = this.height;
            this.aspect = this.width / this.height;

            this._resizeEvent.data.width = this.width;
            this._resizeEvent.data.height = this.height;
            this.dispatchEvent(this._resizeEvent);
        }
    }
}
