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

    // Per-engine render texture maps — keyed by engine instance to avoid name conflicts
    // across multiple engine instances with different canvas sizes.
    private static _engineMaps: Map<object, { rtTextureMap: Map<string, RenderTexture>; rtViewQuad: Map<string, ViewQuad> }> = new Map();

    /** @internal — resolved at runtime via Engine3D.current */
    private static _getEngineData() {
        // Resolve the current engine via globalThis to avoid a circular import
        // (Engine3D → RTResourceMap → Engine3D).  Falls back to RTResourceMap
        // itself as the map key when no engine is active (e.g. during tests).
        const Engine3D = (globalThis as any).__Engine3D__;
        const engine = Engine3D?.current ?? RTResourceMap;
        let data = this._engineMaps.get(engine);
        if (!data) {
            data = { rtTextureMap: new Map<string, RenderTexture>(), rtViewQuad: new Map<string, ViewQuad>() };
            this._engineMaps.set(engine, data);
        }
        return data;
    }

    public static get rtTextureMap(): Map<string, RenderTexture> {
        return this._getEngineData().rtTextureMap;
    }

    public static get rtViewQuad(): Map<string, ViewQuad> {
        return this._getEngineData().rtViewQuad;
    }

    /** @deprecated Use per-engine data — init is now a no-op */
    public static init() {
        // Data is lazily initialized per engine instance; no global init needed.
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        const map = this._getEngineData().rtTextureMap;
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
        const map = this._getEngineData().rtTextureMap;
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
        this._getEngineData().rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        return this._getEngineData().rtTextureMap.get(name);
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
