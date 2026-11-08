import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { getCurrentEngine } from '../../../util/EngineHolder';

/**
 * @internal
 * @group Post
 */
export class RTResourceMap {

    // ─── per-instance state ───────────────────────────────────────────────────

    public rtTextureMap: Map<string, RenderTexture>;
    public rtViewQuad: Map<string, ViewQuad>;

    constructor() {
        this.rtTextureMap = new Map<string, RenderTexture>();
        this.rtViewQuad = new Map<string, ViewQuad>();
    }

    // ─── static facade helpers ────────────────────────────────────────────────

    private static get _current(): RTResourceMap {
        const engine = getCurrentEngine();
        return engine?.rtResourceMap ?? RTResourceMap._global;
    }

    private static readonly _global: RTResourceMap = new RTResourceMap();

    // ─── static init (kept for legacy callers) ────────────────────────────────

    /** @deprecated Create a new Engine3D instance instead. */
    public static init() {
        const r = RTResourceMap._current;
        r.rtTextureMap = new Map<string, RenderTexture>();
        r.rtViewQuad = new Map<string, ViewQuad>();
    }

    // ─── static facade API (backward-compatible) ─────────────────────────────

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        const r = RTResourceMap._current;
        let rt: RenderTexture = r.rtTextureMap.get(name);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            r.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        const r = RTResourceMap._current;
        let rt: RenderTexture = r.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            r.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        const r = RTResourceMap._current;
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        r.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        return RTResourceMap._current.rtTextureMap.get(name);
    }

    public static CreateSplitTexture(id: string) {
        const colorTex = RTResourceMap.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = RTResourceMap.getTexture(id + "_split");
        if (!tex) {
            tex = RTResourceMap.createRTTexture(id + "_split", colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public static WriteSplitColorTexture(id: string) {
        const colorTex = RTResourceMap.getTexture(RTResourceConfig.colorBufferTex_NAME);
        const tex = RTResourceMap.getTexture(id + "_split");
        const commandEncoder = GPUContext.beginCommandEncoder();
        commandEncoder.copyTextureToTexture(
            { texture: colorTex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: tex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: tex.width, height: tex.height, depthOrArrayLayers: 1 },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }
}
