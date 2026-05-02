import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { getActiveEngine } from '../../../EngineRegistry';

/**
 * @internal
 * Per-engine instance data for render texture resources.
 * Each Engine3D instance owns one RTResourceMap.
 * @group Post
 */
export class RTResourceMap {

    public rtTextureMap: Map<string, RenderTexture>;
    public rtViewQuad: Map<string, ViewQuad>;

    constructor() {
        this.rtTextureMap = new Map<string, RenderTexture>();
        this.rtViewQuad = new Map<string, ViewQuad>();
    }

    public createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
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

    public createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        let rt: RenderTexture = this.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            this.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public getTexture(name: string): RenderTexture {
        return this.rtTextureMap.get(name);
    }

    public CreateSplitTexture(id: string): RenderTexture {
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

    // -------------------------------------------------------------------------
    // Static proxy API – delegates to the currently active Engine3D instance so
    // that all existing call-sites continue to work without modification.
    // -------------------------------------------------------------------------

    /** @internal */
    private static _getActive(): RTResourceMap {
        return getActiveEngine().rtResourceMap;
    }

    /** @deprecated Use engine.rtResourceMap.createRTTexture() for multi-instance */
    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return RTResourceMap._getActive().createRTTexture(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    /** @deprecated Use engine.rtResourceMap.createRTTextureArray() for multi-instance */
    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return RTResourceMap._getActive().createRTTextureArray(name, rtWidth, rtHeight, format, useMipmap, length, sampleCount);
    }

    /** @deprecated Use engine.rtResourceMap.createViewQuad() for multi-instance */
    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        return RTResourceMap._getActive().createViewQuad(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    /** @deprecated Use engine.rtResourceMap.getTexture() for multi-instance */
    public static getTexture(name: string): RenderTexture {
        return RTResourceMap._getActive().getTexture(name);
    }

    /** @deprecated Use engine.rtResourceMap.CreateSplitTexture() for multi-instance */
    public static CreateSplitTexture(id: string): RenderTexture {
        return RTResourceMap._getActive().CreateSplitTexture(id);
    }

    /** @deprecated Use engine.rtResourceMap.WriteSplitColorTexture() for multi-instance */
    public static WriteSplitColorTexture(id: string) {
        RTResourceMap._getActive().WriteSplitColorTexture(id);
    }

    /** @deprecated  */
    public static init() {
        // No-op for backward compat; Engine3D creates a new RTResourceMap per instance.
    }

    /** @deprecated Use engine.rtResourceMap.rtTextureMap directly */
    public static get rtTextureMap(): Map<string, RenderTexture> {
        return RTResourceMap._getActive().rtTextureMap;
    }

    /** @deprecated Use engine.rtResourceMap.rtViewQuad directly */
    public static get rtViewQuad(): Map<string, ViewQuad> {
        return RTResourceMap._getActive().rtViewQuad;
    }
}
