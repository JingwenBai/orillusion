import { ViewQuad } from '../../../core/ViewQuad';
import { EngineContext } from '../../../core/EngineContext';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';

/**
 * @internal
 * Per-engine-instance render-texture registry.
 *
 * Static methods are backward-compatible proxies that route to the
 * currently-active engine's RTResourceMap instance via
 * `EngineContext.getCurrent()`.
 * @group Post
 */
export class RTResourceMap {

    // ---- static proxies (backward compat) ---- //

    public static init() {
        EngineContext.getCurrent()?.rtResourceMap._init();
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return _resolve()?.createRTTexture(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return _resolve()?.createRTTextureArray(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        return _resolve()?.createViewQuad(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    public static getTexture(name: string): RenderTexture | undefined {
        return _resolve()?.getTexture(name);
    }

    public static CreateSplitTexture(id: string): RenderTexture {
        return _resolve()?.CreateSplitTexture(id);
    }

    public static WriteSplitColorTexture(id: string) {
        _resolve()?.WriteSplitColorTexture(id);
    }

    // ---- instance data ---- //
    public rtTextureMap: Map<string, RenderTexture>;
    public rtViewQuad: Map<string, ViewQuad>;

    private _initDone: boolean = false;

    public _init() {
        if (!this._initDone) {
            this._initDone = true;
            this.rtTextureMap = new Map();
            this.rtViewQuad = new Map();
        }
    }

    // ---- instance methods ---- //

    public createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        this._init();
        let rt = this.rtTextureMap.get(name);
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

    public createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        this._init();
        let rt = this.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            this.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        this._init();
        const rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        const viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public getTexture(name: string): RenderTexture | undefined {
        this._init();
        return this.rtTextureMap.get(name);
    }

    public CreateSplitTexture(id: string): RenderTexture {
        this._init();
        const colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + '_split');
        if (!tex) {
            tex = this.createRTTexture(id + '_split', colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public WriteSplitColorTexture(id: string) {
        this._init();
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

function _resolve(): RTResourceMap | null {
    return EngineContext.getCurrent()?.rtResourceMap ?? null;
}
