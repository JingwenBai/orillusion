import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { getCurrentEngineId } from '../../../core/EngineContext';

/**
 * @internal
 * @group Post
 *
 * Multi-engine isolation
 * ----------------------
 * Render-target textures are per-engine resources (different canvases may have
 * different sizes and content).  RTResourceMap maintains a separate texture
 * map and ViewQuad map for each Engine3D instance, identified by engine ID.
 *
 * Engine3D sets the active engine ID (via EngineContext) before each render
 * so that all texture look-ups transparently operate on the correct store.
 * The public static API is unchanged, preserving backward compatibility.
 */
export class RTResourceMap {

    private static _engineMaps = new Map<number, {
        rtTextureMap: Map<string, RenderTexture>;
        rtViewQuad: Map<string, ViewQuad>;
    }>();

    private static _ensureEngine(id: number) {
        if (!this._engineMaps.has(id)) {
            this._engineMaps.set(id, {
                rtTextureMap: new Map<string, RenderTexture>(),
                rtViewQuad: new Map<string, ViewQuad>(),
            });
        }
        return this._engineMaps.get(id);
    }

    private static get _current() {
        return this._ensureEngine(getCurrentEngineId());
    }

    /** @internal Exposed for read-only inspection; prefer the helper methods. */
    public static get rtTextureMap(): Map<string, RenderTexture> {
        return this._current.rtTextureMap;
    }

    /** @internal */
    public static get rtViewQuad(): Map<string, ViewQuad> {
        return this._current.rtViewQuad;
    }

    /**
     * Initialize the resource store for the current engine.
     * Safe to call multiple times – subsequent calls are no-ops for the same
     * engine (the per-engine maps are created lazily by _ensureEngine).
     */
    public static init() {
        this._ensureEngine(getCurrentEngineId());
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        const store = this._current;
        let rt: RenderTexture = store.rtTextureMap.get(name);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            store.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        const store = this._current;
        let rt: RenderTexture = store.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            store.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        const store = this._current;
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        store.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        return this._current.rtTextureMap.get(name);
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
