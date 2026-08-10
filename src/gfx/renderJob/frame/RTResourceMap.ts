import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { getActiveEngine } from '../../../_activeEngine';

/**
 * @internal
 * Per-engine render-texture and view-quad registry.
 * RenderTexture / GPUTexture objects are device-specific, so they must not be
 * shared between Engine3D instances. Static shims delegate to the active
 * engine's RTResourceMap instance.
 * @group Post
 */
export class RTResourceMap {
    // ── instance state ────────────────────────────────────────────────────────
    public rtTextureMap: Map<string, RenderTexture> = new Map();
    public rtViewQuad: Map<string, ViewQuad> = new Map();

    public initState() {
        this.rtTextureMap = new Map<string, RenderTexture>();
        this.rtViewQuad = new Map<string, ViewQuad>();
    }

    public createRTTextureInst(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        let rt = this.rtTextureMap.get(name);
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
        let tex = this.getTextureInst(id + "_split");
        if (!tex) {
            tex = this.createRTTextureInst(id + "_split", colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public writeSplitColorTextureInst(id: string) {
        let colorTex = this.getTextureInst(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTextureInst(id + "_split");
        const commandEncoder = GPUContext.beginCommandEncoder();
        commandEncoder.copyTextureToTexture(
            { texture: colorTex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: tex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: tex.width, height: tex.height, depthOrArrayLayers: 1 },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }

    // ── static shims ──────────────────────────────────────────────────────────
    private static _rm(): RTResourceMap { return getActiveEngine()?._rtResourceMap; }

    public static get rtTextureMap(): Map<string, RenderTexture> { return RTResourceMap._rm()?.rtTextureMap; }
    public static get rtViewQuad(): Map<string, ViewQuad> { return RTResourceMap._rm()?.rtViewQuad; }

    public static init() {
        const e = getActiveEngine();
        if (!e._rtResourceMap) e._rtResourceMap = new RTResourceMap();
        e._rtResourceMap.initState();
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return RTResourceMap._rm().createRTTextureInst(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return RTResourceMap._rm().createRTTextureArrayInst(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        return RTResourceMap._rm().createViewQuadInst(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    public static getTexture(name: string): RenderTexture {
        return RTResourceMap._rm()?.getTextureInst(name);
    }

    public static CreateSplitTexture(id: string): RenderTexture {
        return RTResourceMap._rm().createSplitTextureInst(id);
    }

    public static WriteSplitColorTexture(id: string) {
        RTResourceMap._rm().writeSplitColorTextureInst(id);
    }
}
