import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';

/**
 * Active RTResourceMap instance for the currently-rendering Engine3D.
 * Set automatically by Engine3D before each render frame.
 * @internal
 */
let _active: RTResourceMap | null = null;

/**
 * @internal
 * @group Post
 */
export class RTResourceMap {

    public rtTextureMap: Map<string, RenderTexture>;
    public rtViewQuad: Map<string, ViewQuad>;

    constructor() {
        this.rtTextureMap = new Map<string, RenderTexture>();
        this.rtViewQuad = new Map<string, ViewQuad>();
    }

    // ── Instance API ─────────────────────────────────────────────────────────

    public createRTTextureInstance(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        let rt: RenderTexture = this.rtTextureMap.get(name);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            this.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public createRTTextureArrayInstance(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        let rt: RenderTexture = this.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            this.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public createViewQuadInstance(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public getTextureInstance(name: string) {
        return this.rtTextureMap.get(name);
    }

    public CreateSplitTextureInstance(id: string) {
        let colorTex = this.getTextureInstance(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTextureInstance(id + "_split");
        if (!tex) {
            tex = this.createRTTextureInstance(id + "_split", colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public WriteSplitColorTextureInstance(id: string) {
        let colorTex = this.getTextureInstance(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTextureInstance(id + "_split");
        const commandEncoder = GPUContext.beginCommandEncoder();
        commandEncoder.copyTextureToTexture(
            { texture: colorTex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: tex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: tex.width, height: tex.height, depthOrArrayLayers: 1 },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }

    // ── Static API (delegates to active instance — backward compatible) ───────

    /** @internal Set the active RTResourceMap for the currently-rendering engine. */
    public static setActive(rm: RTResourceMap) {
        _active = rm;
    }

    /** @deprecated Initialization is now handled by Engine3D constructor. */
    public static init() {
        // no-op: each Engine3D creates its own RTResourceMap instance
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        return _active!.createRTTextureInstance(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        return _active!.createRTTextureArrayInstance(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        return _active!.createViewQuadInstance(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    public static getTexture(name: string) {
        return _active!.getTextureInstance(name);
    }

    public static CreateSplitTexture(id: string) {
        return _active!.CreateSplitTextureInstance(id);
    }

    public static WriteSplitColorTexture(id: string) {
        return _active!.WriteSplitColorTextureInstance(id);
    }
}
