import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';

/**
 * @internal
 * Per-engine instance that caches render textures and view quads.
 * The static methods delegate to the currently active instance set by Engine3D.
 * @group Post
 */
export class RTResourceMap {
    private static _active: RTResourceMap = null;

    /**
     * Switch the active RTResourceMap instance (called by Engine3D before each render frame).
     * @internal
     */
    public static setActive(map: RTResourceMap) {
        RTResourceMap._active = map;
    }

    // Static facade: init creates a new instance and activates it
    public static init(): RTResourceMap {
        const map = new RTResourceMap();
        RTResourceMap._active = map;
        return map;
    }

    // Static facade properties
    public static get rtTextureMap(): Map<string, RenderTexture> {
        return RTResourceMap._active?._rtTextureMap;
    }
    public static get rtViewQuad(): Map<string, ViewQuad> {
        return RTResourceMap._active?._rtViewQuad;
    }

    // Static facade methods
    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return RTResourceMap._active?._createRTTexture(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return RTResourceMap._active?._createRTTextureArray(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        return RTResourceMap._active?._createViewQuad(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    public static getTexture(name: string): RenderTexture {
        return RTResourceMap._active?._rtTextureMap.get(name);
    }

    public static CreateSplitTexture(id: string): RenderTexture {
        return RTResourceMap._active?._createSplitTexture(id);
    }

    public static WriteSplitColorTexture(id: string) {
        RTResourceMap._active?._writeSplitColorTexture(id);
    }

    // ── Instance state ──────────────────────────────────────────────────────
    private _rtTextureMap: Map<string, RenderTexture>;
    private _rtViewQuad: Map<string, ViewQuad>;

    constructor() {
        this._rtTextureMap = new Map<string, RenderTexture>();
        this._rtViewQuad = new Map<string, ViewQuad>();
    }

    private _createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean, sampleCount: number): RenderTexture {
        let rt: RenderTexture = this._rtTextureMap.get(name);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            this._rtTextureMap.set(name, rt);
        }
        return rt;
    }

    private _createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number, useMipmap: boolean, sampleCount: number): RenderTexture {
        let rt: RenderTexture = this._rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            this._rtTextureMap.set(name, rt);
        }
        return rt;
    }

    private _createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number): ViewQuad {
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this._rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    private _createSplitTexture(id: string): RenderTexture {
        let colorTex = this._rtTextureMap.get(RTResourceConfig.colorBufferTex_NAME);
        let tex = this._rtTextureMap.get(id + "_split");
        if (!tex) {
            tex = this._createRTTexture(id + "_split", colorTex.width, colorTex.height, colorTex.format, false, 0);
        }
        return tex;
    }

    private _writeSplitColorTexture(id: string) {
        let colorTex = this._rtTextureMap.get(RTResourceConfig.colorBufferTex_NAME);
        let tex = this._rtTextureMap.get(id + "_split");
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
