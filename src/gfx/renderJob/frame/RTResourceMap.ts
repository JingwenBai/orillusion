import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { getCurrentEngineId } from '../../graphics/webGpu/Context3D';

/**
 * @internal
 * @group Post
 *
 * Per-engine render-texture and view-quad cache.
 *
 * All static methods automatically delegate to the currently-active engine's
 * private maps (identified by `getCurrentEngineId()`), so multi-instance
 * rendering works without any changes to call-sites.
 */
export class RTResourceMap {

    // Master storage: engineId → maps for that engine.
    private static _engineMaps: Map<number, {
        rtTextureMap: Map<string, RenderTexture>;
        rtViewQuad: Map<string, ViewQuad>;
    }> = new Map();

    /** @internal – ensure a map-entry exists for the given (or current) engine. */
    private static _entry(engineId: number = getCurrentEngineId()) {
        let entry = this._engineMaps.get(engineId);
        if (!entry) {
            entry = {
                rtTextureMap: new Map<string, RenderTexture>(),
                rtViewQuad: new Map<string, ViewQuad>(),
            };
            this._engineMaps.set(engineId, entry);
        }
        return entry;
    }

    /** Render-texture cache for the currently-active engine. */
    public static get rtTextureMap(): Map<string, RenderTexture> {
        return this._entry().rtTextureMap;
    }

    /** View-quad cache for the currently-active engine. */
    public static get rtViewQuad(): Map<string, ViewQuad> {
        return this._entry().rtViewQuad;
    }

    /** (Re-)initialise the resource maps for the currently-active engine. */
    public static init() {
        this._engineMaps.set(getCurrentEngineId(), {
            rtTextureMap: new Map<string, RenderTexture>(),
            rtViewQuad: new Map<string, ViewQuad>(),
        });
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
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

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        let rt: RenderTexture = this.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            this.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        return this.rtTextureMap.get(name);
    }

    public static CreateSplitTexture(id: string) {
        let colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + '_split');
        if (!tex) {
            tex = this.createRTTexture(id + '_split', colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public static WriteSplitColorTexture(id: string) {
        let colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + '_split');
        const commandEncoder = GPUContext.beginCommandEncoder();
        commandEncoder.copyTextureToTexture(
            { texture: colorTex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: tex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: tex.width, height: tex.height, depthOrArrayLayers: 1 },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }
}
