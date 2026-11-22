import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { EngineContext } from '../../../core/EngineContext';

/**
 * @internal
 * Per-engine render-texture registry.
 * Each Engine3D instance owns one RTResourceMap so texture names like
 * "colorBufferTex" never collide between multiple engine instances.
 * The static methods delegate to the currently-active engine's instance.
 * @group Post
 */
export class RTResourceMap {

    // ── Instance state ─────────────────────────────────────────────────────
    public rtTextureMap: Map<string, RenderTexture> = new Map();
    public rtViewQuad: Map<string, ViewQuad> = new Map();

    // ── Instance methods ────────────────────────────────────────────────────

    public createRTTextureInst(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
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

    public createRTTextureArrayInst(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        let rt = this.rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            this.rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public createViewQuadInst(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this.rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public getTextureInst(name: string): RenderTexture {
        return this.rtTextureMap.get(name);
    }

    public createSplitTextureInst(id: string): RenderTexture {
        let colorTex = this.getTextureInst(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTextureInst(id + '_split');
        if (!tex) {
            tex = this.createRTTextureInst(id + '_split', colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public writeSplitColorTextureInst(id: string): void {
        let colorTex = this.getTextureInst(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTextureInst(id + '_split');
        const commandEncoder = GPUContext.beginCommandEncoder();
        commandEncoder.copyTextureToTexture(
            { texture: colorTex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: tex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: tex.width, height: tex.height, depthOrArrayLayers: 1 },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }

    // ── Static helpers (delegate to current engine's instance) ──────────────

    private static get _inst(): RTResourceMap {
        return EngineContext.current?.rtResourceMap as RTResourceMap;
    }

    /** @deprecated Use engine.rtResourceMap directly for new multi-instance code */
    public static init(): void {
        // No-op: instance is created by Engine3D constructor
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return RTResourceMap._inst?.createRTTextureInst(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return RTResourceMap._inst?.createRTTextureArrayInst(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        return RTResourceMap._inst?.createViewQuadInst(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    public static getTexture(name: string): RenderTexture {
        return RTResourceMap._inst?.getTextureInst(name);
    }

    public static CreateSplitTexture(id: string): RenderTexture {
        return RTResourceMap._inst?.createSplitTextureInst(id);
    }

    public static WriteSplitColorTexture(id: string): void {
        RTResourceMap._inst?.writeSplitColorTextureInst(id);
    }
}
