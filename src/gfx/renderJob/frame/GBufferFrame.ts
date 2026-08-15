
import { RenderTexture } from "../../../textures/RenderTexture";
import { webGPUContext } from "../../graphics/webGpu/Context3D";
import { GPUTextureFormat } from "../../graphics/webGpu/WebGPUConst";
import { RTDescriptor } from "../../graphics/webGpu/descriptor/RTDescriptor";
import { RTResourceConfig } from "../config/RTResourceConfig";
import { RTFrame } from "./RTFrame";
import { RTResourceMap } from "./RTResourceMap";

/** @internal active per-engine GBufferFrameMap, set by Engine3D.activate() */
let _activeGBufferFrameMap: GBufferFrameMap | null = null;
export function setActiveGBufferFrameMap(m: GBufferFrameMap): void {
    _activeGBufferFrameMap = m;
}

export class GBufferFrame extends RTFrame {
    public static colorPass_GBuffer: string = "ColorPassGBuffer";
    public static reflections_GBuffer: string = "reflections_GBuffer";
    public static gui_GBuffer: string = "gui_GBuffer";

    private _colorBufferTex: RenderTexture;
    private _compressGBufferTex: RenderTexture;

    constructor() {
        super([], []);
    }

    createGBuffer(key: string, rtWidth: number, rtHeight: number, autoResize: boolean = true, outColor: boolean = true, depthTexture?: RenderTexture, rtResourceMap?: RTResourceMap) {
        let attachments = this.renderTargets;
        let reDescriptors = this.rtDescriptors;
        if (outColor) {
            let colorDec = new RTDescriptor();
            colorDec.loadOp = 'clear';
            if (rtResourceMap) {
                this._colorBufferTex = rtResourceMap.createRTTexture(key + RTResourceConfig.colorBufferTex_NAME, rtWidth, rtHeight, GPUTextureFormat.rgba16float, true);
            } else {
                this._colorBufferTex = new RenderTexture(rtWidth, rtHeight, GPUTextureFormat.rgba16float, true);
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

    // Static backward-compat delegates — route through the active engine GBufferFrameMap
    public static getGBufferFrame(key: string, fixedWidth: number = 0, fixedHeight: number = 0, outColor: boolean = true, depthTexture?: RenderTexture, rtResourceMap?: RTResourceMap): GBufferFrame {
        return _activeGBufferFrameMap?.getGBufferFrame(key, fixedWidth, fixedHeight, outColor, depthTexture, rtResourceMap);
    }
    public static getGUIBufferFrame(rtResourceMap?: RTResourceMap): GBufferFrame {
        return _activeGBufferFrameMap?.getGUIBufferFrame(rtResourceMap);
    }
}

/**
 * Per-engine GBuffer frame registry — owned by Engine3D instances
 * @internal
 */
export class GBufferFrameMap {
    private _gBufferMap: Map<string, GBufferFrame> = new Map<string, GBufferFrame>();

    public getGBufferFrame(key: string, fixedWidth: number = 0, fixedHeight: number = 0, outColor: boolean = true, depthTexture?: RenderTexture, rtResourceMap?: RTResourceMap): GBufferFrame {
        let gBuffer: GBufferFrame;
        if (!this._gBufferMap.has(key)) {
            gBuffer = new GBufferFrame();
            let size = webGPUContext.presentationSize;
            gBuffer.createGBuffer(
                key,
                fixedWidth == 0 ? size[0] : fixedWidth,
                fixedHeight == 0 ? size[1] : fixedHeight,
                fixedWidth != 0 && fixedHeight != 0,
                outColor,
                depthTexture,
                rtResourceMap
            );
            this._gBufferMap.set(key, gBuffer);
        } else {
            gBuffer = this._gBufferMap.get(key);
        }
        return gBuffer;
    }

    public getGUIBufferFrame(rtResourceMap?: RTResourceMap): GBufferFrame {
        let colorRTFrame = this.getGBufferFrame(GBufferFrame.colorPass_GBuffer, 0, 0, true, undefined, rtResourceMap);
        return this.getGBufferFrame(GBufferFrame.gui_GBuffer, 0, 0, true, colorRTFrame.depthTexture, rtResourceMap);
    }

    public has(key: string): boolean {
        return this._gBufferMap.has(key);
    }
}
