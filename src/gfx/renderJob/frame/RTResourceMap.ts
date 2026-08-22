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

    /**
     * The currently active resource map used by static accessor methods.
     * Set to the rendering engine instance's resource map before each frame.
     */
    public static _active: RTResourceMap | null = null;

    /** @deprecated Use the instance via Engine3D */
    public static get rtTextureMap(): Map<string, RenderTexture> { return RTResourceMap._active?.rtTextureMap ?? RTResourceMap._default?.rtTextureMap; }
    /** @deprecated Use the instance via Engine3D */
    public static get rtViewQuad(): Map<string, ViewQuad> { return RTResourceMap._active?.rtViewQuad ?? RTResourceMap._default?.rtViewQuad; }

    private static _default: RTResourceMap | null = null;

    // Per-instance storage
    public _rtTextureMap: Map<string, RenderTexture>;
    public _rtViewQuad: Map<string, ViewQuad>;

    constructor() {
        this._rtTextureMap = new Map<string, RenderTexture>();
        this._rtViewQuad = new Map<string, ViewQuad>();
    }

    /** @internal */
    get rtTextureMap() { return this._rtTextureMap; }
    /** @internal */
    get rtViewQuad() { return this._rtViewQuad; }

    public static init() {
        // Use the already-active instance if one was set (e.g. by an Engine3D instance)
        if (!RTResourceMap._active) {
            RTResourceMap._active = new RTResourceMap();
        }
        if (!RTResourceMap._default) {
            RTResourceMap._default = RTResourceMap._active;
        }
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        const map = RTResourceMap._active ?? RTResourceMap._default;
        let rt: RenderTexture = map._rtTextureMap.get(name);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            map._rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        const map = RTResourceMap._active ?? RTResourceMap._default;
        let rt: RenderTexture = map._rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            map._rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        const map = RTResourceMap._active ?? RTResourceMap._default;
        let rtFrame = new RTFrame([
            outRtTexture
        ],
            [
                new RTDescriptor()
            ]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        map._rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        const map = RTResourceMap._active ?? RTResourceMap._default;
        return map._rtTextureMap.get(name);
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
