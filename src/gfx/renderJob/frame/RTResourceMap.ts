import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { activeEngine } from '../EngineContext';

/**
 * Render-target resource registry.
 *
 * Each Engine3D instance owns an RTResourceMap instance so that multiple
 * engines' render textures and view-quads never collide on shared string keys.
 * Static methods are backward-compatible shims that delegate to the active
 * engine's RTResourceMap (set via Engine3D.current at the start of each frame).
 *
 * @internal
 * @group Post
 */
export class RTResourceMap {

    // ─── Instance state ───────────────────────────────────────────────────────

    public rtTextureMap: Map<string, RenderTexture> = new Map();
    public rtViewQuad: Map<string, ViewQuad> = new Map();

    // ─── Static helpers ───────────────────────────────────────────────────────

    /** Returns the RTResourceMap belonging to the currently active engine, or a global fallback. */
    private static get _current(): RTResourceMap {
        return activeEngine?.rtResourceMap ?? RTResourceMap._global;
    }

    /** Global fallback used when no engine context is active (legacy / pre-init code). */
    private static _global: RTResourceMap = new RTResourceMap();

    // ─── Static backward-compat shims ─────────────────────────────────────────

    /** @deprecated use engine.rtResourceMap directly for multi-engine setups */
    public static init() {
        // No-op: each Engine3D creates its own RTResourceMap instance in its constructor.
        // Called here only for backward compatibility.
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return RTResourceMap._current.createRTTexture(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return RTResourceMap._current.createRTTextureArray(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        return RTResourceMap._current.createViewQuad(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    public static getTexture(name: string): RenderTexture {
        return RTResourceMap._current.getTexture(name);
    }

    public static CreateSplitTexture(id: string): RenderTexture {
        return RTResourceMap._current.CreateSplitTexture(id);
    }

    public static WriteSplitColorTexture(id: string): void {
        RTResourceMap._current.WriteSplitColorTexture(id);
    }

    // ─── Instance methods ─────────────────────────────────────────────────────

    public createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
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
