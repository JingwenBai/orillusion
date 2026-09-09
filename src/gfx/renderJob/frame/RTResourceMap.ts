import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { getCurrentHandle } from '../../EngineContext';

interface RTResourceState {
    rtTextureMap: Map<string, RenderTexture>;
    rtViewQuad: Map<string, ViewQuad>;
}

/**
 * @internal
 * @group Post
 */
export class RTResourceMap {

    private static _stateMap: Map<object, RTResourceState> = new Map();

    private static getState(): RTResourceState {
        return this._stateMap.get(getCurrentHandle()!)!;
    }

    public static get rtTextureMap(): Map<string, RenderTexture> {
        return this.getState().rtTextureMap;
    }

    public static get rtViewQuad(): Map<string, ViewQuad> {
        return this.getState().rtViewQuad;
    }

    public static init(): void {
        const handle = getCurrentHandle()!;
        this._stateMap.set(handle, {
            rtTextureMap: new Map<string, RenderTexture>(),
            rtViewQuad: new Map<string, ViewQuad>(),
        });
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        const state = this.getState();
        let rt: RenderTexture = state.rtTextureMap.get(name);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            state.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        const state = this.getState();
        let rt: RenderTexture = state.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            state.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        const rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        const viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this.getState().rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string): RenderTexture {
        return this.getState().rtTextureMap.get(name);
    }

    public static CreateSplitTexture(id: string): RenderTexture {
        let colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + "_split");
        if (!tex) {
            tex = this.createRTTexture(id + "_split", colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public static WriteSplitColorTexture(id: string): void {
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
