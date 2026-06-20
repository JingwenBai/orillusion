import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { getCurrentEngineId } from '../../../core/EngineContext';

interface RTResourceMapData {
    rtTextureMap: Map<string, RenderTexture>;
    rtViewQuad: Map<string, ViewQuad>;
}

/**
 * @internal
 * @group Post
 */
export class RTResourceMap {
    private static _store: Map<number, RTResourceMapData> = new Map();

    private static _data(): RTResourceMapData {
        const id = getCurrentEngineId();
        let d = RTResourceMap._store.get(id);
        if (!d) {
            d = { rtTextureMap: new Map(), rtViewQuad: new Map() };
            RTResourceMap._store.set(id, d);
        }
        return d;
    }

    public static get rtTextureMap() { return RTResourceMap._data().rtTextureMap; }
    public static get rtViewQuad() { return RTResourceMap._data().rtViewQuad; }

    public static init() {
        const id = getCurrentEngineId();
        RTResourceMap._store.set(id, { rtTextureMap: new Map(), rtViewQuad: new Map() });
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        let rt: RenderTexture = RTResourceMap.rtTextureMap.get(name);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            RTResourceMap.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        let rt: RenderTexture = RTResourceMap.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            RTResourceMap.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        RTResourceMap.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        return RTResourceMap.rtTextureMap.get(name);
    }

    public static CreateSplitTexture(id: string) {
        let colorTex = RTResourceMap.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = RTResourceMap.getTexture(id + "_split");
        if (!tex) {
            tex = RTResourceMap.createRTTexture(id + "_split", colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public static WriteSplitColorTexture(id: string) {
        let colorTex = RTResourceMap.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = RTResourceMap.getTexture(id + "_split");
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
