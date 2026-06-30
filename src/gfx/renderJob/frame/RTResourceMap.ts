import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';

/**
 * @internal
 * @group Post
 */
export class RTResourceMap {

    // ---- Instance state (per-engine) ----
    public rtTextureMap: Map<string, RenderTexture>;
    public rtViewQuad: Map<string, ViewQuad>;

    public init() {
        this.rtTextureMap = new Map<string, RenderTexture>();
        this.rtViewQuad = new Map<string, ViewQuad>();
    }

    public createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
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

    public createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        let rt: RenderTexture = this.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            this.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public getTexture(name: string) {
        return this.rtTextureMap.get(name);
    }

    public CreateSplitTexture(id: string) {
        let colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + "_split");
        if (!tex) {
            tex = this.createRTTexture(id + "_split", colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public WriteSplitColorTexture(id: string) {
        let colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + "_split");
        const commandEncoder = GPUContext.beginCommandEncoder();
        commandEncoder.copyTextureToTexture(
            { texture: colorTex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: tex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: tex.width, height: tex.height, depthOrArrayLayers: 1 },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }

    // ---- Static backward-compat API ----

    /**
     * @internal
     */
    private static _primary: RTResourceMap | null = null;

    /**
     * @internal
     */
    public static _setPrimary(instance: RTResourceMap) {
        RTResourceMap._primary = instance;
    }

    /** @deprecated Use engine.rtResourceMap.rtTextureMap */
    public static get rtTextureMap(): Map<string, RenderTexture> {
        return RTResourceMap._primary?.rtTextureMap;
    }

    /** @deprecated Use engine.rtResourceMap.rtViewQuad */
    public static get rtViewQuad(): Map<string, ViewQuad> {
        return RTResourceMap._primary?.rtViewQuad;
    }

    /** @deprecated Use engine.rtResourceMap.init() */
    public static init() {
        RTResourceMap._primary?.init();
    }

    /** @deprecated Use engine.rtResourceMap.createRTTexture(...) */
    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        return RTResourceMap._primary?.createRTTexture(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    /** @deprecated Use engine.rtResourceMap.createRTTextureArray(...) */
    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        return RTResourceMap._primary?.createRTTextureArray(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    /** @deprecated Use engine.rtResourceMap.createViewQuad(...) */
    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        return RTResourceMap._primary?.createViewQuad(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    /** @deprecated Use engine.rtResourceMap.getTexture(name) */
    public static getTexture(name: string) {
        return RTResourceMap._primary?.getTexture(name);
    }

    /** @deprecated Use engine.rtResourceMap.CreateSplitTexture(id) */
    public static CreateSplitTexture(id: string) {
        return RTResourceMap._primary?.CreateSplitTexture(id);
    }

    /** @deprecated Use engine.rtResourceMap.WriteSplitColorTexture(id) */
    public static WriteSplitColorTexture(id: string) {
        RTResourceMap._primary?.WriteSplitColorTexture(id);
    }
}
