import { activeEngine } from '../../../core/EngineContext';
import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';

/**
 * Per-Engine3D render-target resource cache.
 * Static methods delegate to the currently active Engine3D instance.
 * @internal
 * @group Post
 */
export class RTResourceMap {

    // ─── Instance state ───────────────────────────────────────────────────────

    public rtTextureMap: Map<string, RenderTexture> = new Map();
    public rtViewQuad: Map<string, ViewQuad> = new Map();
    /** Per-engine GBufferFrame cache (moved from GBufferFrame.gBufferMap static). */
    public gBufferMap: Map<string, any> = new Map();

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
        let tex = this.getTexture(id + "_split");
        if (!tex) {
            tex = this.createRTTexture(id + "_split", colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public WriteSplitColorTexture(id: string): void {
        let colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + "_split");
        const commandEncoder = GPUContext.beginCommandEncoder();
        commandEncoder.copyTextureToTexture(
            { texture: colorTex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: tex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: tex.width, height: tex.height, depthOrArrayLayers: 1 },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }

    // ─── Static delegates → active engine's rtResourceMap ────────────────────

    /** @deprecated Use engine.rtResourceMap directly for multi-instance setups */
    public static get rtTextureMap(): Map<string, RenderTexture> {
        return activeEngine?.rtResourceMap?.rtTextureMap;
    }

    /** @deprecated Use engine.rtResourceMap directly for multi-instance setups */
    public static get rtViewQuad(): Map<string, ViewQuad> {
        return activeEngine?.rtResourceMap?.rtViewQuad;
    }

    /** @deprecated Use engine.rtResourceMap directly for multi-instance setups */
    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return activeEngine?.rtResourceMap?.createRTTexture(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    /** @deprecated Use engine.rtResourceMap directly for multi-instance setups */
    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return activeEngine?.rtResourceMap?.createRTTextureArray(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    /** @deprecated Use engine.rtResourceMap directly for multi-instance setups */
    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        return activeEngine?.rtResourceMap?.createViewQuad(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    /** @deprecated Use engine.rtResourceMap directly for multi-instance setups */
    public static getTexture(name: string): RenderTexture {
        return activeEngine?.rtResourceMap?.getTexture(name);
    }

    /** @deprecated Use engine.rtResourceMap directly for multi-instance setups */
    public static CreateSplitTexture(id: string): RenderTexture {
        return activeEngine?.rtResourceMap?.CreateSplitTexture(id);
    }

    /** @deprecated Use engine.rtResourceMap directly for multi-instance setups */
    public static WriteSplitColorTexture(id: string): void {
        activeEngine?.rtResourceMap?.WriteSplitColorTexture(id);
    }
}
