
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
    public static gBufferMap: Map<string, GBufferFrame> = new Map<string, GBufferFrame>();
    // public static bufferTexture: boolean = false;

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
     * @internal
     * @param engineId Optional engine ID prefix to namespace per-engine GBuffer entries.
     */
    public static getGBufferFrame(key: string, fixedWidth: number = 0, fixedHeight: number = 0, outColor: boolean = true, depthTexture?: RenderTexture, engineId: string = ''): GBufferFrame {
        let scopedKey = engineId ? engineId + '_' + key : key;
        let gBuffer: GBufferFrame;
        if (!GBufferFrame.gBufferMap.has(scopedKey)) {
            gBuffer = new GBufferFrame();
            let size = webGPUContext.presentationSize;
            gBuffer.createGBuffer(
                scopedKey,
                fixedWidth == 0 ? size[0] : fixedWidth,
                fixedHeight == 0 ? size[1] : fixedHeight,
                fixedWidth != 0 && fixedHeight != 0,
                outColor,
                depthTexture
            );
            GBufferFrame.gBufferMap.set(scopedKey, gBuffer);
        } else {
            gBuffer = GBufferFrame.gBufferMap.get(scopedKey);
        }
        return gBuffer;
    }


    public static getGUIBufferFrame(engineId: string = '') {
        let colorRTFrame = this.getGBufferFrame(this.colorPass_GBuffer, 0, 0, true, undefined, engineId);
        let rtFrame = GBufferFrame.getGBufferFrame(GBufferFrame.gui_GBuffer, 0, 0, true, colorRTFrame.depthTexture, engineId);
        return rtFrame;
    }

    public clone() {
        let gBufferFrame = new GBufferFrame();
        this.clone2Frame(gBufferFrame);
        return gBufferFrame;
    }
}