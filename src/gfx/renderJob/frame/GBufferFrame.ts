
import { RenderTexture } from "../../../textures/RenderTexture";
import { webGPUContext } from "../../graphics/webGpu/Context3D";
import { GPUTextureFormat } from "../../graphics/webGpu/WebGPUConst";
import { RTDescriptor } from "../../graphics/webGpu/descriptor/RTDescriptor";
import { RTResourceConfig } from "../config/RTResourceConfig";
import { RTFrame } from "./RTFrame";
import { RTResourceMap } from "./RTResourceMap";
import { getCurrentEngine } from "../../../util/EngineInstance";

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

    // ---- backward-compat static shims ----
    /** @deprecated use engine.gBufferFrameMap.getGBufferFrame() */
    public static getGBufferFrame(key: string, fixedWidth: number = 0, fixedHeight: number = 0, outColor: boolean = true, depthTexture?: RenderTexture): GBufferFrame {
        return getCurrentEngine()?.gBufferFrameMap?.getGBufferFrame(key, fixedWidth, fixedHeight, outColor, depthTexture);
    }
    /** @deprecated use engine.gBufferFrameMap.getGUIBufferFrame() */
    public static getGUIBufferFrame(): GBufferFrame {
        return getCurrentEngine()?.gBufferFrameMap?.getGUIBufferFrame();
    }
}

/**
 * Per-engine GBuffer frame manager.
 * @internal
 */
export class GBufferFrameMap {
    private _map: Map<string, GBufferFrame> = new Map<string, GBufferFrame>();
    private _rtResourceMap: RTResourceMap;

    constructor(rtResourceMap: RTResourceMap) {
        this._rtResourceMap = rtResourceMap;
    }

    /**
     * @internal
     */
    public getGBufferFrame(key: string, fixedWidth: number = 0, fixedHeight: number = 0, outColor: boolean = true, depthTexture?: RenderTexture): GBufferFrame {
        let gBuffer = this._map.get(key);
        if (!gBuffer) {
            gBuffer = new GBufferFrame();
            let size = webGPUContext.presentationSize;
            gBuffer.createGBuffer(
                this._rtResourceMap,
                key,
                fixedWidth == 0 ? size[0] : fixedWidth,
                fixedHeight == 0 ? size[1] : fixedHeight,
                fixedWidth != 0 && fixedHeight != 0,
                outColor,
                depthTexture
            );
            this._map.set(key, gBuffer);
        } else {
            gBuffer = this._map.get(key);
        }
        return gBuffer;
    }

    public getGUIBufferFrame() {
        let colorRTFrame = this.getGBufferFrame(GBufferFrame.colorPass_GBuffer);
        let rtFrame = this.getGBufferFrame(GBufferFrame.gui_GBuffer, 0, 0, true, colorRTFrame.depthTexture);
        return rtFrame;
    }
}
