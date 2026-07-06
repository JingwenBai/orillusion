import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';

/**
 * @internal
 * Active per-engine RTResourceMap instance.
 * Swapped by setActiveRTResourceMap() when an Engine3D activates.
 */
let _active: RTResourceMap | null = null;

/**
 * @internal
 * Switch the active render-texture registry to the given engine's instance.
 */
export function setActiveRTResourceMap(map: RTResourceMap) {
    _active = map;
}

/**
 * @internal
 * @group Post
 */
export class RTResourceMap {

    // ── Instance state ────────────────────────────────────────────────────
    private _rtTextureMap: Map<string, RenderTexture> = new Map();
    private _rtViewQuad: Map<string, ViewQuad> = new Map();

    // ── Static backward-compat API (routes to the active instance) ────────

    /** @internal */
    public static get rtTextureMap(): Map<string, RenderTexture> {
        return _active!._rtTextureMap;
    }

    /** @internal */
    public static get rtViewQuad(): Map<string, ViewQuad> {
        return _active!._rtViewQuad;
    }

    /**
     * No-op: the instance is now created by Engine3D.init() and registered
     * via setActiveRTResourceMap().
     */
    public static init() { /* no-op */ }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return _active!._createRTTexture(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return _active!._createRTTextureArray(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        return _active!._createViewQuad(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    public static getTexture(name: string): RenderTexture {
        return _active!._rtTextureMap.get(name);
    }

    public static CreateSplitTexture(id: string): RenderTexture {
        return _active!._createSplitTexture(id);
    }

    public static WriteSplitColorTexture(id: string) {
        _active!._writeSplitColorTexture(id);
    }

    // ── Instance implementation ───────────────────────────────────────────

    private _createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
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

    private _createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        let rt: RenderTexture = this._rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            this._rtTextureMap.set(name, rt);
        }
        return rt;
    }

    private _createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this._rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    private _createSplitTexture(id: string): RenderTexture {
        let colorTex = this._rtTextureMap.get(RTResourceConfig.colorBufferTex_NAME);
        let tex = this._rtTextureMap.get(id + '_split');
        if (!tex) {
            tex = this._createRTTexture(id + '_split', colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    private _writeSplitColorTexture(id: string) {
        let colorTex = this._rtTextureMap.get(RTResourceConfig.colorBufferTex_NAME);
        let tex = this._rtTextureMap.get(id + '_split');
        const commandEncoder = GPUContext.beginCommandEncoder();
        commandEncoder.copyTextureToTexture(
            { texture: colorTex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: tex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: tex.width, height: tex.height, depthOrArrayLayers: 1 },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }
}
