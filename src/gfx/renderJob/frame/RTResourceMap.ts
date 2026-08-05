import { ViewQuad } from '../../../core/ViewQuad';
import { getActiveEngineContext } from '../../../core/EngineRegistry';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';

/**
 * Per-engine render-texture and ViewQuad pool.
 * Each Engine3D instance owns one RTResourceMap so textures from different
 * engine instances (and their differing canvas sizes) do not collide.
 * @internal
 * @group Post
 */
export class RTResourceMap {

    public rtTextureMap: Map<string, RenderTexture> = new Map();
    public rtViewQuad: Map<string, ViewQuad> = new Map();

    // ─── static façade ───────────────────────────────────────────────────────
    // All static members delegate to the active engine's RTResourceMap so that
    // existing call sites need no changes.

    private static _get(): RTResourceMap {
        const ctx = getActiveEngineContext();
        if (!ctx) throw new Error('No active Engine3D — call Engine3D.init() first');
        return ctx.rtResourceMap;
    }

    /**
     * @deprecated Use the instance method — this static accessor is kept for
     * backward compatibility and delegates to the active engine's map.
     */
    public static get rtTextureMap(): Map<string, RenderTexture> {
        return this._get().rtTextureMap;
    }

    /**
     * @deprecated Use the instance method — this static accessor is kept for
     * backward compatibility and delegates to the active engine's map.
     */
    public static get rtViewQuad(): Map<string, ViewQuad> {
        return this._get().rtViewQuad;
    }

    /** @internal */
    public static init() {
        // No-op: initialisation happens in the Engine3D constructor.
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        const rm = this._get();
        let rt = rm.rtTextureMap.get(name);
        if (!rt) {
            if (name === RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            rm.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        const rm = this._get();
        let rt = rm.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            rm.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        const rm = this._get();
        const rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        const viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        rm.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string): RenderTexture {
        return this._get().rtTextureMap.get(name);
    }

    public static CreateSplitTexture(id: string): RenderTexture {
        const rm = this._get();
        const colorTex = rm.rtTextureMap.get(RTResourceConfig.colorBufferTex_NAME);
        let tex = rm.rtTextureMap.get(id + '_split');
        if (!tex) {
            tex = this.createRTTexture(id + '_split', colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public static WriteSplitColorTexture(id: string): void {
        const rm = this._get();
        const colorTex = rm.rtTextureMap.get(RTResourceConfig.colorBufferTex_NAME);
        const tex = rm.rtTextureMap.get(id + '_split');
        const commandEncoder = GPUContext.beginCommandEncoder();
        commandEncoder.copyTextureToTexture(
            { texture: colorTex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: tex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: tex.width, height: tex.height, depthOrArrayLayers: 1 },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }
}
