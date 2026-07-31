
import { RenderTexture } from "../../../textures/RenderTexture";
import { webGPUContext } from "../../graphics/webGpu/Context3D";
import { GPUTextureFormat } from "../../graphics/webGpu/WebGPUConst";
import { RTDescriptor } from "../../graphics/webGpu/descriptor/RTDescriptor";
import { RTResourceConfig } from "../config/RTResourceConfig";
import { RTFrame } from "./RTFrame";
import { RTResourceMap, setActiveRTResourceMap } from "./RTResourceMap";

export class GBufferFrame extends RTFrame {
    public static colorPass_GBuffer: string = "ColorPassGBuffer";
    public static reflections_GBuffer: string = "reflections_GBuffer";
    public static gui_GBuffer: string = "gui_GBuffer";

    private _colorBufferTex: RenderTexture;
    private _compressGBufferTex: RenderTexture;

    constructor() {
        super([], []);
    }

    createGBuffer(key: string, rtWidth: number, rtHeight: number, rtResourceMap: RTResourceMap, autoResize: boolean = true, outColor: boolean = true, depthTexture?: RenderTexture) {
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
     * Get or create a GBufferFrame from the active per-engine maps.
     * Falls back to the module-level active maps so existing static call sites work.
     * @internal
     */
    public static getGBufferFrame(key: string, fixedWidth: number = 0, fixedHeight: number = 0, outColor: boolean = true, depthTexture?: RenderTexture): GBufferFrame {
        let gBuffer: GBufferFrame;
        if (!_activeGBufferMap.has(key)) {
            gBuffer = new GBufferFrame();
            let size = webGPUContext.presentationSize;
            gBuffer.createGBuffer(
                key,
                fixedWidth == 0 ? size[0] : fixedWidth,
                fixedHeight == 0 ? size[1] : fixedHeight,
                _activeRTResourceMap,
                fixedWidth != 0 && fixedHeight != 0,
                outColor,
                depthTexture
            );
            _activeGBufferMap.set(key, gBuffer);
        } else {
            gBuffer = _activeGBufferMap.get(key);
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

// ---------------------------------------------------------------------------
// Module-level active maps — swapped by Engine3D before each render frame so
// all static GBufferFrame.getGBufferFrame() call sites route to the right
// per-engine storage automatically.
// ---------------------------------------------------------------------------

let _activeGBufferMap: Map<string, GBufferFrame> = new Map();
let _activeRTResourceMap: RTResourceMap = new RTResourceMap();

/**
 * Switch the GBuffer and RTResource maps to the currently-rendering engine's instances.
 * Called by Engine3D at the start of each render frame.
 * @internal
 */
export function setActiveGBufferResources(
    gBufferMap: Map<string, GBufferFrame>,
    rtResourceMap: RTResourceMap
): void {
    _activeGBufferMap = gBufferMap;
    _activeRTResourceMap = rtResourceMap;
    setActiveRTResourceMap(rtResourceMap);
}
