
import { Engine3D } from '../../../Engine3D';
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
     * Per-engine GBuffer maps. Prevents string-key collisions when multiple
     * Engine3D instances are alive simultaneously.
     * @internal
     */
    private static _engineMaps: Map<object, Map<string, GBufferFrame>> = new Map();
    /** Shared fallback map used before any engine is initialised. */
    private static _legacyMap: Map<string, GBufferFrame> = new Map();

    /**
     * Returns the GBuffer map that belongs to the currently-active engine.
     * Falls back to the legacy shared map when no engine is active.
     * @internal
     */
    private static getEngineMap(): Map<string, GBufferFrame> {
        const engine = Engine3D.current;
        if (!engine) return GBufferFrame._legacyMap;
        if (!GBufferFrame._engineMaps.has(engine)) {
            GBufferFrame._engineMaps.set(engine, new Map<string, GBufferFrame>());
        }
        return GBufferFrame._engineMaps.get(engine);
    }

    /**
     * The GBuffer map for the active engine.
     * @deprecated Internal use; external code should call getGBufferFrame().
     */
    public static get gBufferMap(): Map<string, GBufferFrame> {
        return GBufferFrame.getEngineMap();
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
     */
    public static getGBufferFrame(key: string, fixedWidth: number = 0, fixedHeight: number = 0, outColor: boolean = true, depthTexture?: RenderTexture): GBufferFrame {
        const map = GBufferFrame.getEngineMap();
        let gBuffer: GBufferFrame;
        if (!map.has(key)) {
            gBuffer = new GBufferFrame();
            let size = webGPUContext.presentationSize;
            gBuffer.createGBuffer(
                key,
                fixedWidth == 0 ? size[0] : fixedWidth,
                fixedHeight == 0 ? size[1] : fixedHeight,
                fixedWidth != 0 && fixedHeight != 0,
                outColor,
                depthTexture
            );
            map.set(key, gBuffer);
        } else {
            gBuffer = map.get(key);
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
