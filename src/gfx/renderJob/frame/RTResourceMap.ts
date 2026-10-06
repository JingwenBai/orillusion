import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { currentEngineId } from '../../../EngineContext';

/**
 * @internal
 * @group Post
 */
export class RTResourceMap {

    // Per-engine storage — each Engine3D instance gets its own texture maps so
    // that multiple engines sharing the same GPU device don't overwrite each
    // other's render targets.
    private static _engineMaps: Map<number, { rtTextureMap: Map<string, RenderTexture>; rtViewQuad: Map<string, ViewQuad> }> = new Map();

    private static _getEngineMaps() {
        const id = currentEngineId;
        let maps = RTResourceMap._engineMaps.get(id);
        if (!maps) {
            maps = { rtTextureMap: new Map<string, RenderTexture>(), rtViewQuad: new Map<string, ViewQuad>() };
            RTResourceMap._engineMaps.set(id, maps);
        }
        return maps;
    }

    // Backward-compatible accessors — always reflect the active engine's maps.
    public static get rtTextureMap(): Map<string, RenderTexture> { return RTResourceMap._getEngineMaps().rtTextureMap; }
    public static get rtViewQuad(): Map<string, ViewQuad> { return RTResourceMap._getEngineMaps().rtViewQuad; }

    public static init() {
        const id = currentEngineId;
        RTResourceMap._engineMaps.set(id, {
            rtTextureMap: new Map<string, RenderTexture>(),
            rtViewQuad: new Map<string, ViewQuad>(),
        });
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        const maps = RTResourceMap._getEngineMaps();
        let rt: RenderTexture = maps.rtTextureMap.get(name);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            maps.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        const maps = RTResourceMap._getEngineMaps();
        let rt: RenderTexture = maps.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            maps.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        const maps = RTResourceMap._getEngineMaps();
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        maps.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        return RTResourceMap._getEngineMaps().rtTextureMap.get(name);
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
            { texture: colorTex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: tex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: tex.width, height: tex.height, depthOrArrayLayers: 1 },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }
}
