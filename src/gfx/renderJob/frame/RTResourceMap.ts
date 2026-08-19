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

    public static rtTextureMap: Map<string, RenderTexture>;
    public static rtViewQuad: Map<string, ViewQuad>;

    public static init() {
        this.rtTextureMap = new Map<string, RenderTexture>();
        this.rtViewQuad = new Map<string, ViewQuad>();
    }

    /**
     * Build a namespaced key that includes the active engine's ID so that
     * each Engine3D instance gets its own independent render texture resources.
     * @internal
     */
    private static namespacedKey(name: string): string {
        const Engine3D = (globalThis as any).__Engine3D_ref;
        if (Engine3D && Engine3D.current != null) {
            return `engine${Engine3D.current.id}_${name}`;
        }
        return name;
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        const nsName = RTResourceMap.namespacedKey(name);
        let rt: RenderTexture = this.rtTextureMap.get(nsName);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = nsName;
            RTResourceMap.rtTextureMap.set(nsName, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        const nsName = RTResourceMap.namespacedKey(name);
        let rt: RenderTexture = this.rtTextureMap.get(nsName);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = nsName;
            RTResourceMap.rtTextureMap.set(nsName, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        const nsName = RTResourceMap.namespacedKey(name);
        let rtFrame = new RTFrame([
            outRtTexture
        ],
            [
                new RTDescriptor()
            ]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        RTResourceMap.rtViewQuad.set(nsName, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        const nsName = RTResourceMap.namespacedKey(name);
        return this.rtTextureMap.get(nsName);
    }

    public static CreateSplitTexture(id: string) {
        let colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        const nsId = RTResourceMap.namespacedKey(id + "_split");
        let tex = this.rtTextureMap.get(nsId);
        if (!tex) {
            tex = this.createRTTexture(id + "_split", colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public static WriteSplitColorTexture(id: string) {
        let colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        const nsId = RTResourceMap.namespacedKey(id + "_split");
        let tex = this.rtTextureMap.get(nsId);
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
