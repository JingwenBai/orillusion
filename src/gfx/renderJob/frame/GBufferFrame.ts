
import { RenderTexture } from "../../../textures/RenderTexture";
import { webGPUContext } from "../../graphics/webGpu/Context3D";
import { GPUTextureFormat } from "../../graphics/webGpu/WebGPUConst";
import { RTDescriptor } from "../../graphics/webGpu/descriptor/RTDescriptor";
import { RTResourceConfig } from "../config/RTResourceConfig";
import { RTFrame } from "./RTFrame";
import { RTResourceMap } from "./RTResourceMap";
import { Engine3D } from "../../../Engine3D";

export class GBufferFrame extends RTFrame {
    public static colorPass_GBuffer: string = "ColorPassGBuffer";
    public static reflections_GBuffer: string = "reflections_GBuffer";
    public static gui_GBuffer: string = "gui_GBuffer";

    /**
     * Global GBuffer map keyed by "<engineId>:<name>".
     * When a single engine is used (the common case) the key is just the name,
     * so existing code that passes a bare string continues to work unchanged.
     */
    public static gBufferMap: Map<string, GBufferFrame> = new Map<string, GBufferFrame>();

    private _colorBufferTex: RenderTexture;
    private _compressGBufferTex: RenderTexture;

    constructor() {
        super([], []);
    }

    /**
     * Returns a scoped storage key for the current engine instance.
     * When there is only one engine the key equals the supplied `name` so
     * that nothing breaks in the single-instance case.
     */
    private static scopedKey(name: string): string {
        const engine = Engine3D._currentEngine;
        return engine ? `${engine.id}:${name}` : name;
    }

    createGBuffer(key: string, rtWidth: number, rtHeight: number, autoResize: boolean = true, outColor: boolean = true, depthTexture?: RenderTexture) {
        let attachments = this.renderTargets;
        let reDescriptors = this.rtDescriptors;
        if (outColor) {
            let colorDec = new RTDescriptor();
            colorDec.loadOp = 'clear';
            this._colorBufferTex = RTResourceMap.createRTTexture(key + RTResourceConfig.colorBufferTex_NAME, rtWidth, rtHeight, GPUTextureFormat.rgba16float, true);
            attachments.push(this._colorBufferTex);
            reDescriptors.push(colorDec);
        }

        this._compressGBufferTex = new RenderTexture(rtWidth, rtHeight, GPUTextureFormat.rgba32float, false, undefined, 1, 0, true, true);
        attachments.push(this._compressGBufferTex);

        if (depthTexture) {
            this.depthTexture = depthTexture;
        } else {
            this.depthTexture = new RenderTexture(rtWidth, rtHeight, GPUTextureFormat.depth24plus, false, undefined, 1, 0, true, true);
            this.depthTexture.name = key + `_depthTexture`;
        }

        let compressGBufferRTDes: RTDescriptor;
        compressGBufferRTDes = new RTDescriptor();

        reDescriptors.push(compressGBufferRTDes);
    }

    public getPositionMap() {
        return this.renderTargets[1];
    }

    public getNormalMap() {
        return this.renderTargets[2];
    }

    public getColorTexture() {
        return this._colorBufferTex;
    }

    public getCompressGBufferTexture() {
        return this._compressGBufferTex;
    }

    /**
     * Get (or lazily create) a GBufferFrame for the given logical name.
     *
     * In multi-instance scenarios the frame is keyed per engine so that
     * two engines with the same logical name don't share GPU resources.
     * @internal
     */
    public static getGBufferFrame(key: string, fixedWidth: number = 0, fixedHeight: number = 0, outColor: boolean = true, depthTexture?: RenderTexture): GBufferFrame {
        const storageKey = this.scopedKey(key);
        let gBuffer = GBufferFrame.gBufferMap.get(storageKey);
        if (!gBuffer) {
            gBuffer = new GBufferFrame();
            // Use the active engine's webGPU context size if available, else the
            // module-level webGPUContext (primary engine / backward compat).
            const ctx = Engine3D._currentEngine?.webGPUContext ?? webGPUContext;
            const size = ctx.presentationSize;
            gBuffer.createGBuffer(
                storageKey,
                fixedWidth === 0 ? size[0] : fixedWidth,
                fixedHeight === 0 ? size[1] : fixedHeight,
                fixedWidth !== 0 && fixedHeight !== 0,
                outColor,
                depthTexture
            );
            GBufferFrame.gBufferMap.set(storageKey, gBuffer);
        }
        return gBuffer;
    }

    public static getGUIBufferFrame() {
        let colorRTFrame = this.getGBufferFrame(this.colorPass_GBuffer);
        let rtFrame = GBufferFrame.getGBufferFrame(GBufferFrame.gui_GBuffer, 0, 0, true, colorRTFrame.depthTexture);
        return rtFrame;
    }

    public clone() {
        let gBufferFrame = new GBufferFrame();
        this.clone2Frame(gBufferFrame);
        return gBufferFrame;
    }
}
