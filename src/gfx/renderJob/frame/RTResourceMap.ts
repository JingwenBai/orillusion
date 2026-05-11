import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { Engine3D } from '../../../Engine3D';

/**
 * Per-engine render-texture and ViewQuad pool.
 *
 * Each Engine3D instance creates its own RTResourceMap so that texture name
 * keys never collide across canvases / engine instances.
 *
 * All static methods delegate to Engine3D._current.rtResourceMap so that
 * existing call-sites continue to work without modification.
 * @internal
 * @group Post
 */
export class RTResourceMap {

    // ─── instance data ────────────────────────────────────────────────────────

    public rtTextureMap: Map<string, RenderTexture> = new Map();
    public rtViewQuad: Map<string, ViewQuad> = new Map();

    // ─── static helpers ───────────────────────────────────────────────────────

    /** Return the RTResourceMap that belongs to the currently active engine. */
    private static get _inst(): RTResourceMap {
        return Engine3D._current?.rtResourceMap;
    }

    // ─── static delegates (backwards compat) ─────────────────────────────────

    /** @deprecated Call init() is a no-op; RTResourceMap is created by Engine3D. */
    public static init(): void {
        // kept for any call-sites that still invoke RTResourceMap.init()
    }

    public static createRTTexture(
        name: string,
        rtWidth: number, rtHeight: number,
        format: GPUTextureFormat,
        useMipmap: boolean = false,
        sampleCount: number = 0
    ): RenderTexture {
        return RTResourceMap._inst?.createRTTexture(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    public static createRTTextureArray(
        name: string,
        rtWidth: number, rtHeight: number,
        format: GPUTextureFormat,
        length: number = 1,
        useMipmap: boolean = false,
        sampleCount: number = 0
    ): RenderTexture {
        return RTResourceMap._inst?.createRTTextureArray(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    public static createViewQuad(
        name: string,
        shaderVS: string, shaderFS: string,
        outRtTexture: RenderTexture,
        multisample: number = 0
    ): ViewQuad {
        return RTResourceMap._inst?.createViewQuad(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    public static getTexture(name: string): RenderTexture {
        return RTResourceMap._inst?.getTexture(name);
    }

    public static CreateSplitTexture(id: string): RenderTexture {
        return RTResourceMap._inst?.CreateSplitTexture(id);
    }

    public static WriteSplitColorTexture(id: string): void {
        RTResourceMap._inst?.WriteSplitColorTexture(id);
    }

    // ─── instance methods ─────────────────────────────────────────────────────

    public createRTTexture(
        name: string,
        rtWidth: number, rtHeight: number,
        format: GPUTextureFormat,
        useMipmap: boolean = false,
        sampleCount: number = 0
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
        rtWidth: number, rtHeight: number,
        format: GPUTextureFormat,
        length: number = 1,
        useMipmap: boolean = false,
        sampleCount: number = 0
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
        shaderVS: string, shaderFS: string,
        outRtTexture: RenderTexture,
        multisample: number = 0
    ): ViewQuad {
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
        let tex = this.getTexture(id + '_split');
        if (!tex) {
            tex = this.createRTTexture(id + '_split', colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public WriteSplitColorTexture(id: string): void {
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
