import { CanvasContext, webGPUContext } from '../../graphics/webGpu/Context3D';
import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';

/**
 * @internal
 * @group Post
 *
 * All texture and ViewQuad maps are keyed by the active CanvasContext so that
 * different Engine3D instances (each with its own canvas) maintain separate
 * render-target pools.  The active canvas is set by Engine3D before each frame.
 */
export class RTResourceMap {

    // Per-canvas-context maps – populated lazily via _getTextureMap() / _getViewQuadMap()
    private static _texturesByCanvas: Map<CanvasContext, Map<string, RenderTexture>> = new Map();
    private static _viewQuadByCanvas: Map<CanvasContext, Map<string, ViewQuad>> = new Map();

    /** @internal kept for backward compat – callers should prefer the static methods */
    public static get rtTextureMap(): Map<string, RenderTexture> {
        return RTResourceMap._getTextureMap();
    }
    public static get rtViewQuad(): Map<string, ViewQuad> {
        return RTResourceMap._getViewQuadMap();
    }

    private static _getTextureMap(): Map<string, RenderTexture> {
        const ctx = webGPUContext.activeCanvas;
        let map = this._texturesByCanvas.get(ctx);
        if (!map) {
            map = new Map<string, RenderTexture>();
            this._texturesByCanvas.set(ctx, map);
        }
        return map;
    }

    private static _getViewQuadMap(): Map<string, ViewQuad> {
        const ctx = webGPUContext.activeCanvas;
        let map = this._viewQuadByCanvas.get(ctx);
        if (!map) {
            map = new Map<string, ViewQuad>();
            this._viewQuadByCanvas.set(ctx, map);
        }
        return map;
    }

    /** No-op – maps are now created lazily per active CanvasContext. */
    public static init() { }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        const map = this._getTextureMap();
        let rt: RenderTexture = map.get(name);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            map.set(name, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        const map = this._getTextureMap();
        let rt: RenderTexture = map.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            map.set(name, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        const rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        const viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this._getViewQuadMap().set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        return this._getTextureMap().get(name);
    }

    public static CreateSplitTexture(id: string) {
        const colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + '_split');
        if (!tex) {
            tex = this.createRTTexture(id + '_split', colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public static WriteSplitColorTexture(id: string) {
        const colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        const tex = this.getTexture(id + '_split');
        const commandEncoder = GPUContext.beginCommandEncoder();
        commandEncoder.copyTextureToTexture(
            { texture: colorTex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: tex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: tex.width, height: tex.height, depthOrArrayLayers: 1 },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }
}
