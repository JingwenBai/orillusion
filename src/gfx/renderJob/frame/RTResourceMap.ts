import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { getActiveEngine } from '../../../core/EngineRegistry';
/**
 * @internal
 * @group Post
 */
export class RTResourceMap {

    /** @internal per-instance texture map */
    public rtTextureMap: Map<string, RenderTexture>;
    /** @internal per-instance view quad map */
    public rtViewQuad: Map<string, ViewQuad>;
    /** @internal per-instance GBuffer frame map (used by GBufferFrame) */
    public gBufferMap: Map<string, any>;

    /** Global fallback instance (used by single-engine/legacy code) */
    private static _global: RTResourceMap = new RTResourceMap();

    /** @internal Return the active engine's RTResourceMap, or the global fallback */
    private static _get(): RTResourceMap {
        return getActiveEngine()?.rtResourceMap ?? RTResourceMap._global;
    }

    constructor() {
        this.rtTextureMap = new Map<string, RenderTexture>();
        this.rtViewQuad = new Map<string, ViewQuad>();
        this.gBufferMap = new Map<string, any>();
    }

    /** @internal initialise maps (clear previous state) */
    public init() {
        this.rtTextureMap = new Map<string, RenderTexture>();
        this.rtViewQuad = new Map<string, ViewQuad>();
        this.gBufferMap = new Map<string, any>();
    }

    // ─── Instance methods ──────────────────────────────────────────────────────

    public createRTTextureInstance(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        let rt: RenderTexture = this.rtTextureMap.get(name);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            this.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public createRTTextureArrayInstance(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        let rt: RenderTexture = this.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            this.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public createViewQuadInstance(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public getTextureInstance(name: string): RenderTexture {
        return this.rtTextureMap.get(name);
    }

    // ─── Static API (backward-compatible, delegates to active engine's instance) ──

    public static init() {
        RTResourceMap._get().init();
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return RTResourceMap._get().createRTTextureInstance(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return RTResourceMap._get().createRTTextureArrayInstance(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        return RTResourceMap._get().createViewQuadInstance(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    public static getTexture(name: string): RenderTexture {
        return RTResourceMap._get().getTextureInstance(name);
    }

    public static CreateSplitTexture(id: string): RenderTexture {
        const map = RTResourceMap._get();
        let colorTex = map.getTextureInstance(RTResourceConfig.colorBufferTex_NAME);
        let tex = map.getTextureInstance(id + "_split");
        if (!tex) {
            tex = map.createRTTextureInstance(id + "_split", colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public static WriteSplitColorTexture(id: string) {
        const map = RTResourceMap._get();
        let colorTex = map.getTextureInstance(RTResourceConfig.colorBufferTex_NAME);
        let tex = map.getTextureInstance(id + "_split");
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

    // ─── Legacy static field aliases (read-only for backward compat) ──────────
    public static get rtTextureMap(): Map<string, RenderTexture> {
        return RTResourceMap._get().rtTextureMap;
    }
    public static get rtViewQuad(): Map<string, ViewQuad> {
        return RTResourceMap._get().rtViewQuad;
    }
}
