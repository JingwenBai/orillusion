
import { View3D } from "../../../core/View3D";
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
     * Legacy global map — used when no scope is active (single-instance backward compat).
     */
    public static gBufferMap: Map<string, GBufferFrame> = new Map<string, GBufferFrame>();

    /**
     * Per-View3D scoped maps. Each Engine3D instance owns a distinct set of
     * View3D objects, so keying by View3D isolates frame buffers between instances.
     */
    private static _scopedMaps: Map<View3D, Map<string, GBufferFrame>> = new Map();

    /**
     * Active scope set by RendererJob before each frame render.
     * null means use the legacy global map (single-instance mode).
     */
    private static _currentScope: View3D | null = null;

    /**
     * Per-View3D unique numeric IDs used to generate unique RTResourceMap keys.
     */
    private static _viewIds: WeakMap<View3D, number> = new WeakMap();
    private static _nextViewId: number = 0;

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
     * Set the active View3D scope for GBufferFrame lookups.
     * RendererJob calls this before rendering each frame so that GBufferFrame
     * operations are isolated to the owning engine instance.
     * Pass null to restore the legacy global (single-instance) behaviour.
     * @internal
     */
    public static setScope(view: View3D | null): void {
        GBufferFrame._currentScope = view;
    }

    /** @internal */
    private static _getViewId(view: View3D): string {
        if (!GBufferFrame._viewIds.has(view)) {
            GBufferFrame._viewIds.set(view, GBufferFrame._nextViewId++);
        }
        return `_v${GBufferFrame._viewIds.get(view)}_`;
    }

    /** @internal */
    private static _getScopedMap(view: View3D): Map<string, GBufferFrame> {
        let map = GBufferFrame._scopedMaps.get(view);
        if (!map) {
            map = new Map<string, GBufferFrame>();
            GBufferFrame._scopedMaps.set(view, map);
        }
        return map;
    }

    /**
     * @internal
     */
    public static getGBufferFrame(key: string, fixedWidth: number = 0, fixedHeight: number = 0, outColor: boolean = true, depthTexture?: RenderTexture): GBufferFrame {
        const scope = GBufferFrame._currentScope;
        const map = scope ? GBufferFrame._getScopedMap(scope) : GBufferFrame.gBufferMap;

        let gBuffer = map.get(key);
        if (!gBuffer) {
            gBuffer = new GBufferFrame();
            let size = webGPUContext.presentationSize;
            // Prefix RTResourceMap keys with the scope's view ID to avoid
            // collisions between multiple engine instances.
            const keyPrefix = scope ? GBufferFrame._getViewId(scope) : '';
            gBuffer.createGBuffer(
                keyPrefix + key,
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

    public static getGUIBufferFrame() {
        let colorRTFrame = this.getGBufferFrame(this.colorPass_GBuffer);
        let rtFrame = GBufferFrame.getGBufferFrame(GBufferFrame.gui_GBuffer, 0, 0, true, colorRTFrame.depthTexture);
        return rtFrame;
    }

    /**
     * Release all GBufferFrames associated with a view (called when the view
     * is removed from an engine instance).
     * @internal
     */
    public static releaseScope(view: View3D): void {
        GBufferFrame._scopedMaps.delete(view);
        GBufferFrame._viewIds.delete(view);
    }

    public clone() {
        let gBufferFrame = new GBufferFrame();
        this.clone2Frame(gBufferFrame);
        return gBufferFrame;
    }
}
