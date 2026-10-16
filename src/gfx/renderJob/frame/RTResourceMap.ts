import { ViewQuad } from '../../../core/ViewQuad';
import { EngineContext } from '../../../core/EngineContext';
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

    /**
     * Returns the per-engine texture map from the active EngineContext.
     * Falls back to a module-level map for cases where no engine context is active.
     */
    private static get _textureMap(): Map<string, RenderTexture> {
        return (EngineContext.current?.rtTextureMap ?? RTResourceMap._fallbackTextureMap) as Map<string, RenderTexture>;
    }

    private static get _quadMap(): Map<string, ViewQuad> {
        return (EngineContext.current?.rtViewQuad ?? RTResourceMap._fallbackQuadMap) as Map<string, ViewQuad>;
    }

    private static _fallbackTextureMap: Map<string, RenderTexture> = new Map();
    private static _fallbackQuadMap: Map<string, ViewQuad> = new Map();

    /** @deprecated Use EngineContext.current.rtTextureMap instead. Kept for read access. */
    public static get rtTextureMap(): Map<string, RenderTexture> {
        return RTResourceMap._textureMap;
    }

    /** @deprecated Use EngineContext.current.rtViewQuad instead. Kept for read access. */
    public static get rtViewQuad(): Map<string, ViewQuad> {
        return RTResourceMap._quadMap;
    }

    /** @internal Called once per engine instance during init. */
    public static init() {
        // Per-engine maps are stored in EngineContext; nothing to do here now.
        // Kept for backward compatibility.
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        const map = RTResourceMap._textureMap;
        let rt: RenderTexture = map.get(name);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            map.set(name, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        const map = RTResourceMap._textureMap;
        let rt: RenderTexture = map.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            map.set(name, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        let rtFrame = new RTFrame([
            outRtTexture
        ],
            [
                new RTDescriptor()
            ]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        RTResourceMap._quadMap.set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        return RTResourceMap._textureMap.get(name);
    }

    public static CreateSplitTexture(id: string) {
        let colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + "_split");
        if (!tex) {
            tex = this.createRTTexture(id + "_split", colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public static WriteSplitColorTexture(id: string) {
        let colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + "_split");
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
