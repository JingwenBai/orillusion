import { Engine3D } from '../../../Engine3D';
import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';

/**
 * Runtime render-texture and view-quad registry.
 *
 * Can be used as a **static** (global) registry — for backward compatibility and
 * single-engine scenarios — or as a **per-engine instance** stored on Engine3D.
 *
 * When accessed via the static API the current engine's id is used to namespace
 * all keys, so two engines will never share render textures.
 * @internal
 * @group Post
 */
export class RTResourceMap {

    // ─── static (backward-compat / module-level) maps ────────────────────────

    public static rtTextureMap: Map<string, RenderTexture> = new Map();
    public static rtViewQuad: Map<string, ViewQuad> = new Map();

    /** Returns a storage key scoped to the currently-active engine. */
    private static scopedKey(name: string): string {
        const engine = Engine3D._currentEngine;
        return engine ? `${engine.id}:${name}` : name;
    }

    public static init() {
        // Kept for backward compat; the maps are already initialised above.
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        const key = this.scopedKey(name);
        let rt: RenderTexture = this.rtTextureMap.get(key);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            RTResourceMap.rtTextureMap.set(key, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        const key = this.scopedKey(name);
        let rt: RenderTexture = this.rtTextureMap.get(key);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            RTResourceMap.rtTextureMap.set(key, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        const key = this.scopedKey(name);
        let rtFrame = new RTFrame([
            outRtTexture
        ],
            [
                new RTDescriptor()
            ]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        RTResourceMap.rtViewQuad.set(key, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        return this.rtTextureMap.get(this.scopedKey(name));
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
