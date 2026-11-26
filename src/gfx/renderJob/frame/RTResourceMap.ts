import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';

/**
 * @internal
 * @group Post
 *
 * Render-texture and view-quad registry scoped to one Engine3D instance.
 * The static helpers delegate to the currently-active instance so all
 * existing call sites continue to work without modification.
 */
export class RTResourceMap {

    // Per-instance storage
    public rtTextureMap: Map<string, RenderTexture>;
    public rtViewQuad: Map<string, ViewQuad>;

    constructor() {
        this.rtTextureMap = new Map<string, RenderTexture>();
        this.rtViewQuad = new Map<string, ViewQuad>();
    }

    // ── Active-instance registry ──────────────────────────────────────────

    private static _active: RTResourceMap | null = null;

    /** Switch the active instance.  Called by Engine3D before each frame. */
    public static setActive(instance: RTResourceMap): void {
        RTResourceMap._active = instance;
    }

    /** Return the currently-active instance (throws if none is set). */
    public static getActive(): RTResourceMap {
        if (!RTResourceMap._active) throw new Error('No active RTResourceMap – call Engine3D.init() first.');
        return RTResourceMap._active;
    }

    // ── Backward-compatible static API ───────────────────────────────────

    /** @deprecated Use Engine3D.init() instead; kept for compatibility. */
    public static init() {
        if (!RTResourceMap._active) {
            RTResourceMap._active = new RTResourceMap();
        } else {
            RTResourceMap._active.rtTextureMap = new Map<string, RenderTexture>();
            RTResourceMap._active.rtViewQuad = new Map<string, ViewQuad>();
        }
    }

    public static get rtTextureMap(): Map<string, RenderTexture> {
        return RTResourceMap.getActive().rtTextureMap;
    }

    public static get rtViewQuad(): Map<string, ViewQuad> {
        return RTResourceMap.getActive().rtViewQuad;
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        const map = RTResourceMap.getActive();
        let rt: RenderTexture = map.rtTextureMap.get(name);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            map.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        const map = RTResourceMap.getActive();
        let rt: RenderTexture = map.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            map.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        const map = RTResourceMap.getActive();
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        map.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        return RTResourceMap.getActive().rtTextureMap.get(name);
    }

    public static CreateSplitTexture(id: string) {
        let colorTex = RTResourceMap.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = RTResourceMap.getTexture(id + "_split");
        if (!tex) {
            tex = RTResourceMap.createRTTexture(id + "_split", colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public static WriteSplitColorTexture(id: string) {
        let colorTex = RTResourceMap.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = RTResourceMap.getTexture(id + "_split");
        const commandEncoder = GPUContext.beginCommandEncoder();
        commandEncoder.copyTextureToTexture(
            { texture: colorTex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: tex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: tex.width, height: tex.height, depthOrArrayLayers: 1 },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }
}
