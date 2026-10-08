import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
/**
 * @internal
 * @group Post
 */
export class RTResourceMap {

    // ---- per-engine instance state ----
    private _rtTextureMap: Map<string, RenderTexture> = new Map();
    private _rtViewQuad: Map<string, ViewQuad> = new Map();

    // ---- static "current engine" maps (reassigned by activate()) ----
    public static rtTextureMap: Map<string, RenderTexture> = new Map();
    public static rtViewQuad: Map<string, ViewQuad> = new Map();

    // ---- active instance ----
    private static _current: RTResourceMap | null = null;

    /**
     * Activate an engine's RTResourceMap as the current context.
     * @internal
     */
    public static activate(instance: RTResourceMap): void {
        this._current = instance;
        this.rtTextureMap = instance._rtTextureMap;
        this.rtViewQuad = instance._rtViewQuad;
    }

    // ---- static backward-compat API ----

    public static init() {
        if (!this._current) return;
        this._current._rtTextureMap = new Map<string, RenderTexture>();
        this._current._rtViewQuad = new Map<string, ViewQuad>();
        this.rtTextureMap = this._current._rtTextureMap;
        this.rtViewQuad = this._current._rtViewQuad;
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        return this._current?.createRTTexture(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        return this._current?.createRTTextureArray(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        return this._current?.createViewQuad(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    public static getTexture(name: string) {
        return this._current?._rtTextureMap.get(name);
    }

    public static CreateSplitTexture(id: string) {
        return this._current?.CreateSplitTexture(id);
    }

    public static WriteSplitColorTexture(id: string) {
        this._current?.WriteSplitColorTexture(id);
    }

    // ---- instance methods ----

    public createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
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

    public createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        let rt: RenderTexture = this._rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            this._rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        let rtFrame = new RTFrame([
            outRtTexture
        ],
            [
                new RTDescriptor()
            ]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this._rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public CreateSplitTexture(id: string): RenderTexture {
        let colorTex = this._rtTextureMap.get(RTResourceConfig.colorBufferTex_NAME);
        let tex = this._rtTextureMap.get(id + "_split");
        if (!tex) {
            tex = this.createRTTexture(id + "_split", colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public WriteSplitColorTexture(id: string): void {
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
