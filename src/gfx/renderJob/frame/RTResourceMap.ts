import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { EngineContext } from '../../../EngineContext';

/**
 * Render-texture registry.  Each EngineCore instance owns its own RTResourceMap so
 * that different engines (different canvases / resolutions) do not share textures.
 *
 * Static methods delegate to the currently-rendering engine's instance via
 * EngineContext.current.rtResourceMap, preserving the existing call sites.
 *
 * @internal
 * @group Post
 */
export class RTResourceMap {

    /** Render textures for this engine, keyed by name. */
    public rtTextureMap: Map<string, RenderTexture>;

    /** View quads for this engine, keyed by name. */
    public rtViewQuad: Map<string, ViewQuad>;

    constructor() {
        this.rtTextureMap = new Map<string, RenderTexture>();
        this.rtViewQuad = new Map<string, ViewQuad>();
    }

    // ─── Instance methods ────────────────────────────────────────────────────────

    public createRTTexture(
        name: string,
        rtWidth: number,
        rtHeight: number,
        format: GPUTextureFormat,
        useMipmap: boolean = false,
        sampleCount: number = 0,
    ): RenderTexture {
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

    public createRTTextureArray(
        name: string,
        rtWidth: number,
        rtHeight: number,
        format: GPUTextureFormat,
        length: number = 1,
        useMipmap: boolean = false,
        sampleCount: number = 0,
    ): RenderTexture {
        let rt = this.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            this.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public createViewQuad(
        name: string,
        shaderVS: string,
        shaderFS: string,
        outRtTexture: RenderTexture,
        multisample: number = 0,
    ): ViewQuad {
        const rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        const viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public getTexture(name: string): RenderTexture {
        return this.rtTextureMap.get(name);
    }

    public createSplitTexture(id: string): RenderTexture {
        const colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + '_split');
        if (!tex) {
            tex = this.createRTTexture(id + '_split', colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public writeSplitColorTexture(id: string): void {
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

    // ─── Static API (backward-compatible; delegates to current engine's instance) ─

    /**
     * Initialize the per-engine RTResourceMap.
     * Called by EngineCore.init() after EngineContext.current is set.
     */
    public static init(): void {
        const engine = EngineContext.current;
        if (engine) {
            engine.rtResourceMap = new RTResourceMap();
        }
    }

    private static get _current(): RTResourceMap {
        return EngineContext.current?.rtResourceMap;
    }

    public static createRTTexture(
        name: string,
        rtWidth: number,
        rtHeight: number,
        format: GPUTextureFormat,
        useMipmap: boolean = false,
        sampleCount: number = 0,
    ): RenderTexture {
        return RTResourceMap._current?.createRTTexture(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    public static createRTTextureArray(
        name: string,
        rtWidth: number,
        rtHeight: number,
        format: GPUTextureFormat,
        length: number = 1,
        useMipmap: boolean = false,
        sampleCount: number = 0,
    ): RenderTexture {
        return RTResourceMap._current?.createRTTextureArray(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    public static createViewQuad(
        name: string,
        shaderVS: string,
        shaderFS: string,
        outRtTexture: RenderTexture,
        multisample: number = 0,
    ): ViewQuad {
        return RTResourceMap._current?.createViewQuad(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    public static getTexture(name: string): RenderTexture {
        return RTResourceMap._current?.getTexture(name);
    }

    public static CreateSplitTexture(id: string): RenderTexture {
        return RTResourceMap._current?.createSplitTexture(id);
    }

    public static WriteSplitColorTexture(id: string): void {
        RTResourceMap._current?.writeSplitColorTexture(id);
    }
}
