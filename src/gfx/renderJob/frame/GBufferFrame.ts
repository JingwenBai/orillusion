import { RenderTexture } from "../../../textures/RenderTexture";
import { webGPUContext } from "../../graphics/webGpu/Context3D";
import { GPUTextureFormat } from "../../graphics/webGpu/WebGPUConst";
import { RTDescriptor } from "../../graphics/webGpu/descriptor/RTDescriptor";
import { RTResourceConfig } from "../config/RTResourceConfig";
import { RTFrame } from "./RTFrame";
import { RTResourceMap } from "./RTResourceMap";
import { EngineContext } from "../../../core/EngineContext";

export class GBufferFrame extends RTFrame {
    public static colorPass_GBuffer: string = "ColorPassGBuffer";
    public static reflections_GBuffer: string = "reflections_GBuffer";
    public static gui_GBuffer: string = "gui_GBuffer";

    /**
     * @deprecated Access per-engine gBufferMap via engine._gBufferFrameMap.
     * Provided for diagnostic purposes only.
     */
    public static get gBufferMap(): Map<string, GBufferFrame> {
        return EngineContext.current?._gBufferFrameMap ?? new Map();
    }

    private _colorBufferTex: RenderTexture;
    private _compressGBufferTex: RenderTexture;

    constructor() {
        super([], []);
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

        reDescriptors.push(new RTDescriptor());
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
     * Get or create a GBufferFrame for the active engine.
     * @internal
     */
    public static getGBufferFrame(key: string, fixedWidth: number = 0, fixedHeight: number = 0, outColor: boolean = true, depthTexture?: RenderTexture): GBufferFrame {
        const map: Map<string, GBufferFrame> = EngineContext.current?._gBufferFrameMap ?? new Map();

        let gBuffer = map.get(key);
        if (!gBuffer) {
            gBuffer = new GBufferFrame();
            const size = webGPUContext.presentationSize;
            gBuffer.createGBuffer(
                key,
                fixedWidth === 0 ? size[0] : fixedWidth,
                fixedHeight === 0 ? size[1] : fixedHeight,
                fixedWidth !== 0 && fixedHeight !== 0,
                outColor,
                depthTexture
            );
            map.set(key, gBuffer);
        }
        return gBuffer;
    }

    public static getGUIBufferFrame(): GBufferFrame {
        const colorRTFrame = this.getGBufferFrame(this.colorPass_GBuffer);
        return GBufferFrame.getGBufferFrame(GBufferFrame.gui_GBuffer, 0, 0, true, colorRTFrame.depthTexture);
    }

    public clone(): GBufferFrame {
        const gBufferFrame = new GBufferFrame();
        this.clone2Frame(gBufferFrame);
        return gBufferFrame;
    }
}
