import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';

/**
 * @internal
 * Per-Engine3D-instance state bag for RTResourceMap.
 */
export class RTResourceMapState {
    public rtTextureMap: Map<string, RenderTexture> = new Map<string, RenderTexture>();
    public rtViewQuad: Map<string, ViewQuad> = new Map<string, ViewQuad>();
}

let _activeState: RTResourceMapState;

/**
 * @internal
 * Switch the active RTResourceMap state.  Called by Engine3D.activate().
 */
export function setActiveRTResourceMap(state: RTResourceMapState) {
    _activeState = state;
}

/**
 * @internal
 * @group Post
 */
export class RTResourceMap {

    public static get rtTextureMap(): Map<string, RenderTexture> {
        return _activeState.rtTextureMap;
    }

    public static get rtViewQuad(): Map<string, ViewQuad> {
        return _activeState.rtViewQuad;
    }

    public static init() {
        // no-op: state is created per-engine via setActiveRTResourceMap
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        let rt: RenderTexture = _activeState.rtTextureMap.get(name);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            _activeState.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        let rt: RenderTexture = _activeState.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            _activeState.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        let rtFrame = new RTFrame(
            [outRtTexture],
            [new RTDescriptor()]
        );
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        _activeState.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        return _activeState.rtTextureMap.get(name);
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
