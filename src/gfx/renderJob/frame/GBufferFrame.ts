
import { RenderTexture } from "../../../textures/RenderTexture";
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

    private _colorBufferTex: RenderTexture;
    private _compressGBufferTex: RenderTexture;

    constructor() {
        super([], []);
    }

    createGBuffer(rtResourceMap: RTResourceMap, key: string, rtWidth: number, rtHeight: number, autoResize: boolean = true, outColor: boolean = true, depthTexture?: RenderTexture) {
        let attachments = this.renderTargets;
        let reDescriptors = this.rtDescriptors;
        if (outColor) {
            let colorDec = new RTDescriptor();
            colorDec.loadOp = 'clear';
            this._colorBufferTex = rtResourceMap.createRTTexture(key + RTResourceConfig.colorBufferTex_NAME, rtWidth, rtHeight, GPUTextureFormat.rgba16float, true);
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

    public clone() {
        let gBufferFrame = new GBufferFrame();
        this.clone2Frame(gBufferFrame);
        return gBufferFrame;
    }

    // ---- Backward-compatible static wrappers ----
    public static getGBufferFrame(key: string, fixedWidth: number = 0, fixedHeight: number = 0, outColor: boolean = true, depthTexture?: RenderTexture): GBufferFrame {
        return Engine3D.defaultEngine?.getGBufferFrame(key, fixedWidth, fixedHeight, outColor, depthTexture);
    }
    public static getGUIBufferFrame(): GBufferFrame {
        return Engine3D.defaultEngine?.getGUIBufferFrame();
    }
}
