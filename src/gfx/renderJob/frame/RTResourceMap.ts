import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { getActiveEngineId } from '../../../EngineRegistry';
/**
 * @internal
 * @group Post
 */
export class RTResourceMap {

    public static rtTextureMap: Map<string, RenderTexture>;
    public static rtViewQuad: Map<string, ViewQuad>;

    public static init() {
        if (this.rtTextureMap) return;
        this.rtTextureMap = new Map<string, RenderTexture>();
        this.rtViewQuad = new Map<string, ViewQuad>();
    }

    /** Prefix a resource name with the active engine ID to scope it per engine. */
    private static scopedName(name: string): string {
        const id = getActiveEngineId();
        return id ? id + '_' + name : name;
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        const sName = this.scopedName(name);
        let rt: RenderTexture = this.rtTextureMap.get(sName);
        if (!rt) {
            if (name.endsWith(RTResourceConfig.colorBufferTex_NAME)) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = sName;
            RTResourceMap.rtTextureMap.set(sName, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        const sName = this.scopedName(name);
        let rt: RenderTexture = this.rtTextureMap.get(sName);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = sName;
            RTResourceMap.rtTextureMap.set(sName, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        const sName = this.scopedName(name);
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        RTResourceMap.rtViewQuad.set(sName, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        return this.rtTextureMap.get(this.scopedName(name));
    }

    public static CreateSplitTexture(id: string) {
        let colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        const sId = this.scopedName(id + '_split');
        let tex = this.rtTextureMap.get(sId);
        if (!tex && colorTex) {
            tex = new RenderTexture(colorTex.width, colorTex.height, colorTex.format, false, undefined, 1, 0, true);
            tex.name = sId;
            RTResourceMap.rtTextureMap.set(sId, tex);
        }
        return tex;
    }

    public static WriteSplitColorTexture(id: string) {
        let colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        const sId = this.scopedName(id + '_split');
        let tex = this.rtTextureMap.get(sId);
        if (!colorTex || !tex) return;
        const commandEncoder = GPUContext.beginCommandEncoder();
        commandEncoder.copyTextureToTexture(
            {
                texture: colorTex.getGPUTexture(),
                mipLevel: 0,
                origin: { x: 0, y: 0, z: 0 },
            },
            {
                texture: tex.getGPUTexture(),
                mipLevel: 0,
                origin: { x: 0, y: 0, z: 0 },
            },
            {
                width: tex.width,
                height: tex.height,
                depthOrArrayLayers: 1,
            },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }
}
