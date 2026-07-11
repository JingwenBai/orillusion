import { Engine3D } from '../../../Engine3D';
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

    /** Per-engine texture maps. Prevents string-key collisions across instances. */
    private static _engineTextureMaps: Map<object, Map<string, RenderTexture>> = new Map();
    /** Per-engine ViewQuad maps. */
    private static _engineViewQuadMaps: Map<object, Map<string, ViewQuad>> = new Map();

    /** Shared fallback maps used before any engine is initialised. */
    private static _legacyTextureMap: Map<string, RenderTexture> = new Map();
    private static _legacyViewQuadMap: Map<string, ViewQuad> = new Map();

    /** Returns the texture map for the currently-active engine. */
    private static getTextureMap(): Map<string, RenderTexture> {
        const engine = Engine3D.current;
        if (!engine) return RTResourceMap._legacyTextureMap;
        if (!RTResourceMap._engineTextureMaps.has(engine)) {
            RTResourceMap._engineTextureMaps.set(engine, new Map<string, RenderTexture>());
        }
        return RTResourceMap._engineTextureMaps.get(engine);
    }

    /** Returns the ViewQuad map for the currently-active engine. */
    private static getViewQuadMap(): Map<string, ViewQuad> {
        const engine = Engine3D.current;
        if (!engine) return RTResourceMap._legacyViewQuadMap;
        if (!RTResourceMap._engineViewQuadMaps.has(engine)) {
            RTResourceMap._engineViewQuadMaps.set(engine, new Map<string, ViewQuad>());
        }
        return RTResourceMap._engineViewQuadMaps.get(engine);
    }

    /**
     * @deprecated Access via getTexture() / createRTTexture(). Kept for
     * external code that reads RTResourceMap.rtTextureMap directly.
     */
    public static get rtTextureMap(): Map<string, RenderTexture> {
        return RTResourceMap.getTextureMap();
    }

    /**
     * @deprecated Access via createViewQuad(). Kept for external compatibility.
     */
    public static get rtViewQuad(): Map<string, ViewQuad> {
        return RTResourceMap.getViewQuadMap();
    }

    /**
     * Initialise per-engine resource maps for the currently-active engine.
     * Safe to call multiple times; subsequent calls are no-ops for the same engine.
     */
    public static init() {
        // Ensure the maps exist for the current engine (lazy creation via getters above)
        RTResourceMap.getTextureMap();
        RTResourceMap.getViewQuadMap();
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        const map = RTResourceMap.getTextureMap();
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
        const map = RTResourceMap.getTextureMap();
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
        RTResourceMap.getViewQuadMap().set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        return RTResourceMap.getTextureMap().get(name);
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
