import { RenderTexture } from "../../../textures/RenderTexture";
import { webGPUContext } from "../../graphics/webGpu/Context3D";
import { GPUTextureFormat } from "../../graphics/webGpu/WebGPUConst";
import { RTDescriptor } from "../../graphics/webGpu/descriptor/RTDescriptor";
import { RTResourceConfig } from "../config/RTResourceConfig";
import { RTFrame } from "./RTFrame";
import { RTResourceMap } from "./RTResourceMap";

export class GBufferFrame extends RTFrame {
    public static colorPass_GBuffer: string = "ColorPassGBuffer";
    public static reflections_GBuffer: string = "reflections_GBuffer";
    public static gui_GBuffer: string = "gui_GBuffer";

    /**
     * @deprecated Use engine.getGBufferFrame() for multi-instance correctness.
     * Kept for backward compatibility (single-engine static API).
     */
    public static gBufferMap: Map<string, GBufferFrame> = new Map<string, GBufferFrame>();

    private _colorBufferTex: RenderTexture;
    private _compressGBufferTex: RenderTexture;

    constructor() {
        super([], []);
    }

    /**
     * Create the underlying render textures.
     * @param rtResourceMap  When provided, textures are registered in this per-engine cache.
     */
    createGBuffer(key: string, rtWidth: number, rtHeight: number, autoResize: boolean = true, outColor: boolean = true, depthTexture?: RenderTexture, rtResourceMap?: RTResourceMap) {
        const attachments = this.renderTargets;
        const reDescriptors = this.rtDescriptors;

        if (outColor) {
            const colorDec = new RTDescriptor();
            colorDec.loadOp = 'clear';

            if (rtResourceMap) {
                this._colorBufferTex = rtResourceMap.createRTTexture(
                    key + RTResourceConfig.colorBufferTex_NAME,
                    rtWidth, rtHeight, GPUTextureFormat.rgba16float, true
                );
            } else {
                // Legacy path: create texture directly (no per-engine cache)
                this._colorBufferTex = new RenderTexture(rtWidth, rtHeight, GPUTextureFormat.rgba16float, true, undefined, 1, 0, true);
                this._colorBufferTex.name = key + RTResourceConfig.colorBufferTex_NAME;
            }

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

        reDescriptors.push(new RTDescriptor());
    }

    public getPositionMap() { return this.renderTargets[1]; }
    public getNormalMap() { return this.renderTargets[2]; }
    public getColorTexture() { return this._colorBufferTex; }
    public getCompressGBufferTexture() { return this._compressGBufferTex; }

    /**
     * @internal
     * @deprecated Use engine.getGBufferFrame() for multi-instance correctness.
     */
    public static getGBufferFrame(key: string, fixedWidth: number = 0, fixedHeight: number = 0, outColor: boolean = true, depthTexture?: RenderTexture): GBufferFrame {
        let gBuffer = GBufferFrame.gBufferMap.get(key);
        if (!gBuffer) {
            gBuffer = new GBufferFrame();
            const size = webGPUContext.presentationSize;
            gBuffer.createGBuffer(
                key,
                fixedWidth === 0 ? size[0] : fixedWidth,
                fixedHeight === 0 ? size[1] : fixedHeight,
                fixedWidth !== 0 && fixedHeight !== 0,
                outColor,
                depthTexture,
                // no rtResourceMap in legacy path
            );
            GBufferFrame.gBufferMap.set(key, gBuffer);
        }
        return gBuffer;
    }

    /** @deprecated Use engine.getGUIBufferFrame() */
    public static getGUIBufferFrame(): GBufferFrame {
        const colorRTFrame = this.getGBufferFrame(this.colorPass_GBuffer);
        return this.getGBufferFrame(this.gui_GBuffer, 0, 0, true, colorRTFrame.depthTexture);
    }

    public clone(): GBufferFrame {
        const gBufferFrame = new GBufferFrame();
        this.clone2Frame(gBufferFrame);
        return gBufferFrame;
    }
}
