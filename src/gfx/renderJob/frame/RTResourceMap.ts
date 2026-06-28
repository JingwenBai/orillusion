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

    public rtTextureMap: Map<string, RenderTexture>;
    public rtViewQuad: Map<string, ViewQuad>;

    constructor() {
        this.rtTextureMap = new Map<string, RenderTexture>();
        this.rtViewQuad = new Map<string, ViewQuad>();
    }

    // ── Instance methods ────────────────────────────────────────────────────

    public createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
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

    public createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        let rt: RenderTexture = this.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            this.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        const rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        const viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public getTexture(name: string): RenderTexture {
        return this.rtTextureMap.get(name);
    }

    public CreateSplitTexture(id: string): RenderTexture {
        const colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + "_split");
        if (!tex) {
            tex = this.createRTTexture(id + "_split", colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public WriteSplitColorTexture(id: string) {
        const colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        const tex = this.getTexture(id + "_split");
        const commandEncoder = GPUContext.beginCommandEncoder();
        commandEncoder.copyTextureToTexture(
            { texture: colorTex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: tex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: tex.width, height: tex.height, depthOrArrayLayers: 1 },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }

    // ── Static backward-compat delegates ────────────────────────────────────
    //    Engine3D sets _active before each render frame.

    /** Currently active RTResourceMap (set by Engine3D). @internal */
    public static _active: RTResourceMap | null = null;

    /** @deprecated Use engine.rtResourceMap.init() — now handled by Engine3D constructor */
    public static init() {
        // no-op: instance created per Engine3D constructor
    }

    /** @deprecated Use engine.rtResourceMap.createRTTexture(...) */
    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap?: boolean, sampleCount?: number): RenderTexture {
        return RTResourceMap._active?.createRTTexture(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    /** @deprecated Use engine.rtResourceMap.createRTTextureArray(...) */
    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length?: number, useMipmap?: boolean, sampleCount?: number): RenderTexture {
        return RTResourceMap._active?.createRTTextureArray(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    /** @deprecated Use engine.rtResourceMap.createViewQuad(...) */
    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample?: number): ViewQuad {
        return RTResourceMap._active?.createViewQuad(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    /** @deprecated Use engine.rtResourceMap.getTexture(name) */
    public static getTexture(name: string): RenderTexture {
        return RTResourceMap._active?.getTexture(name);
    }

    /** @deprecated Use engine.rtResourceMap.CreateSplitTexture(id) */
    public static CreateSplitTexture(id: string): RenderTexture {
        return RTResourceMap._active?.CreateSplitTexture(id);
    }

    /** @deprecated Use engine.rtResourceMap.WriteSplitColorTexture(id) */
    public static WriteSplitColorTexture(id: string) {
        RTResourceMap._active?.WriteSplitColorTexture(id);
    }
}
