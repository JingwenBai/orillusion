import { ViewQuad } from '../../../core/ViewQuad';
import { engineRef } from '../../../EngineRef';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';

/**
 * Per-Engine3D render-texture and view-quad registry.
 * Each Engine3D instance owns one RTResourceMap.  The static methods delegate
 * to the active engine's instance for backward compatibility.
 * @internal
 * @group Post
 */
export class RTResourceMap {

    public rtTextureMap: Map<string, RenderTexture>;
    public rtViewQuad: Map<string, ViewQuad>;

    constructor() {
        this.rtTextureMap = new Map<string, RenderTexture>();
        this.rtViewQuad = new Map<string, ViewQuad>();
    }

    // ---- instance methods ----

    _createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        let rt: RenderTexture = this.rtTextureMap.get(name);
        if (!rt) {
            if (name === RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            this.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    _createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        let rt: RenderTexture = this.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            this.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    _createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    _getTexture(name: string): RenderTexture {
        return this.rtTextureMap.get(name);
    }

    _createSplitTexture(id: string): RenderTexture {
        let colorTex = this._getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this._getTexture(id + "_split");
        if (!tex) {
            tex = this._createRTTexture(id + "_split", colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    _writeSplitColorTexture(id: string) {
        let colorTex = this._getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this._getTexture(id + "_split");
        const commandEncoder = GPUContext.beginCommandEncoder();
        commandEncoder.copyTextureToTexture(
            { texture: colorTex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: tex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: tex.width, height: tex.height, depthOrArrayLayers: 1 },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }

    // ---- static backward-compat API ----

    private static _get(): RTResourceMap {
        return engineRef.active?.rtResourceMap;
    }

    /** @deprecated Instantiated automatically by Engine3D.init() */
    public static init() {
        // no-op: RTResourceMap is constructed in Engine3D.init()
    }

    public static get rtTextureMap(): Map<string, RenderTexture> {
        return this._get()?.rtTextureMap;
    }

    public static get rtViewQuad(): Map<string, ViewQuad> {
        return this._get()?.rtViewQuad;
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return this._get()?._createRTTexture(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return this._get()?._createRTTextureArray(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        return this._get()?._createViewQuad(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    public static getTexture(name: string): RenderTexture {
        return this._get()?._getTexture(name);
    }

    public static CreateSplitTexture(id: string): RenderTexture {
        return this._get()?._createSplitTexture(id);
    }

    public static WriteSplitColorTexture(id: string) {
        this._get()?._writeSplitColorTexture(id);
    }
}
