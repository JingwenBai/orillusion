import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { getCurrentEngine } from '../../../engineRegistry';

/**
 * Per-engine render-target and view-quad registry.
 * Static methods are compatibility shims that delegate to the active engine instance.
 * @internal
 * @group Post
 */
export class RTResourceMap {

    // ── Instance fields ────────────────────────────────────────────────────

    public rtTextureMap: Map<string, RenderTexture> = new Map();
    public rtViewQuad: Map<string, ViewQuad> = new Map();

    // ── Instance methods ───────────────────────────────────────────────────

    init() {
        this.rtTextureMap = new Map<string, RenderTexture>();
        this.rtViewQuad = new Map<string, ViewQuad>();
    }

    createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
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

    createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        let rt = this.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            this.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        const rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        const viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    getTexture(name: string): RenderTexture | undefined {
        return this.rtTextureMap.get(name);
    }

    CreateSplitTexture(id: string): RenderTexture {
        const colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + '_split');
        if (!tex) {
            tex = this.createRTTexture(id + '_split', colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    WriteSplitColorTexture(id: string) {
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

    // ── Static compatibility shims ─────────────────────────────────────────

    /** @internal */
    public static init() { RTResourceMap._get()?.init(); }

    /** @internal */
    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return RTResourceMap._get()?.createRTTexture(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    /** @internal */
    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return RTResourceMap._get()?.createRTTextureArray(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    /** @internal */
    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        return RTResourceMap._get()?.createViewQuad(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    /** @internal */
    public static getTexture(name: string): RenderTexture | undefined {
        return RTResourceMap._get()?.getTexture(name);
    }

    /** @internal */
    public static CreateSplitTexture(id: string): RenderTexture {
        return RTResourceMap._get()?.CreateSplitTexture(id);
    }

    /** @internal */
    public static WriteSplitColorTexture(id: string) {
        RTResourceMap._get()?.WriteSplitColorTexture(id);
    }

    /** @internal */
    public static get rtTextureMap(): Map<string, RenderTexture> {
        return RTResourceMap._get()?.rtTextureMap ?? new Map();
    }

    /** @internal */
    public static get rtViewQuad(): Map<string, ViewQuad> {
        return RTResourceMap._get()?.rtViewQuad ?? new Map();
    }

    private static _get(): RTResourceMap | null {
        return getCurrentEngine()?.rtResourceMap ?? null;
    }
}
