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
 * Per-engine render-texture and view-quad pool.
 * Each Engine3D instance owns its own RTResourceMap so that render targets are
 * never shared (and never collide on string keys) across multiple engine instances.
 *
 * Static methods are kept as a backward-compatible facade that delegates to the
 * RTResourceMap belonging to the engine instance currently executing its render
 * frame.  The provider callback is registered by Engine3D to avoid a circular
 * module dependency.
 */
export class RTResourceMap {

    // ---------------------------------------------------------------
    // Static callback provider (registered by Engine3D, no import)
    // ---------------------------------------------------------------
    private static _provider: (() => RTResourceMap) | null = null;

    /** Called once by Engine3D to wire up the per-instance accessor. */
    public static setContextProvider(fn: () => RTResourceMap): void {
        RTResourceMap._provider = fn;
    }

    private static get _current(): RTResourceMap | null {
        return RTResourceMap._provider ? RTResourceMap._provider() : null;
    }

    // ---------------------------------------------------------------
    // Static backward-compatible facade
    // ---------------------------------------------------------------
    public static init(): void {
        // No-op: each Engine3D instance creates its own RTResourceMap.
        // Kept for API compatibility.
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

    public static get rtTextureMap(): Map<string, RenderTexture> {
        return RTResourceMap._current?.rtTextureMap ?? new Map();
    }

    public static get rtViewQuad(): Map<string, ViewQuad> {
        return RTResourceMap._current?.rtViewQuad ?? new Map();
    }

    public static CreateSplitTexture(id: string): RenderTexture {
        return RTResourceMap._current?.CreateSplitTexture(id);
    }

    public static WriteSplitColorTexture(id: string): void {
        RTResourceMap._current?.WriteSplitColorTexture(id);
    }

    // ---------------------------------------------------------------
    // Instance state
    // ---------------------------------------------------------------
    public rtTextureMap: Map<string, RenderTexture>;
    public rtViewQuad: Map<string, ViewQuad>;

    constructor() {
        this.rtTextureMap = new Map<string, RenderTexture>();
        this.rtViewQuad = new Map<string, ViewQuad>();
    }

    // ---------------------------------------------------------------
    // Instance methods (contain the actual logic)
    // ---------------------------------------------------------------
    public createRTTexture(
        name: string,
        rtWidth: number,
        rtHeight: number,
        format: GPUTextureFormat,
        useMipmap: boolean = false,
        sampleCount: number = 0,
    ): RenderTexture {
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

    public createRTTextureArray(
        name: string,
        rtWidth: number,
        rtHeight: number,
        format: GPUTextureFormat,
        length: number = 1,
        useMipmap: boolean = false,
        sampleCount: number = 0,
    ): RenderTexture {
        let rt: RenderTexture = this.rtTextureMap.get(name);
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
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public getTexture(name: string): RenderTexture {
        return this.rtTextureMap.get(name);
    }

    public CreateSplitTexture(id: string): RenderTexture {
        let colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + '_split');
        if (!tex) {
            tex = this.createRTTexture(id + '_split', colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public WriteSplitColorTexture(id: string): void {
        let colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + '_split');
        const commandEncoder = GPUContext.beginCommandEncoder();
        commandEncoder.copyTextureToTexture(
            { texture: colorTex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: tex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: tex.width, height: tex.height, depthOrArrayLayers: 1 },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }
}
