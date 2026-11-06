import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { EngineRegistry } from '../../../core/EngineRegistry';
/**
 * @internal
 * @group Post
 */
export class RTResourceMap {

    /** @internal Fallback global maps (used before any engine is active) */
    public static rtTextureMap: Map<string, RenderTexture>;
    public static rtViewQuad: Map<string, ViewQuad>;

    /** @internal Returns the texture map for the currently-active engine. */
    private static get _textureMap(): Map<string, RenderTexture> {
        const engine = EngineRegistry.active;
        if (engine?.rtTextureMap) return engine.rtTextureMap as Map<string, RenderTexture>;
        return RTResourceMap.rtTextureMap;
    }

    /** @internal Returns the ViewQuad map for the currently-active engine. */
    private static get _viewQuadMap(): Map<string, ViewQuad> {
        const engine = EngineRegistry.active;
        if (engine?.rtViewQuad) return engine.rtViewQuad as Map<string, ViewQuad>;
        return RTResourceMap.rtViewQuad;
    }

    public static init() {
        // Global fallback maps — only initialised once
        if (!this.rtTextureMap) {
            this.rtTextureMap = new Map<string, RenderTexture>();
        }
        if (!this.rtViewQuad) {
            this.rtViewQuad = new Map<string, ViewQuad>();
        }
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        const map = this._textureMap;
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
        const map = this._textureMap;
        let rt: RenderTexture = map.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            map.set(name, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this._viewQuadMap.set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string): RenderTexture {
        return this._textureMap.get(name);
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
