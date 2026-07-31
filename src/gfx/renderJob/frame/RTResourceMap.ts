import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';

// Declared before the class so the static delegate methods can reference it.
// Updated by Engine3D._activateSelf() before each render frame.
let _activeMap: RTResourceMap = null;

/**
 * Per-engine render texture and view-quad registry.
 * Each Engine3D instance owns one RTResourceMap so render textures are isolated
 * between concurrent engine instances.
 *
 * Static methods delegate to the currently-active engine's instance, preserving
 * backward compatibility with all existing call sites.
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

    // -------------------------------------------------------------------------
    // Instance methods (per-engine)
    // -------------------------------------------------------------------------

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
        let rtFrame = new RTFrame(
            [outRtTexture],
            [new RTDescriptor()]
        );
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

    // -------------------------------------------------------------------------
    // Static delegate methods — forward to the active per-engine instance.
    // These preserve backward compatibility with all existing static call sites.
    // -------------------------------------------------------------------------

    /** @deprecated Access via `engine.rtResourceMap.createRTTexture(...)` instead. */
    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap?: boolean, sampleCount?: number): RenderTexture {
        return _activeMap.createRTTexture(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    /** @deprecated Access via `engine.rtResourceMap.createRTTextureArray(...)` instead. */
    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length?: number, useMipmap?: boolean, sampleCount?: number): RenderTexture {
        return _activeMap.createRTTextureArray(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    /** @deprecated Access via `engine.rtResourceMap.createViewQuad(...)` instead. */
    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample?: number): ViewQuad {
        return _activeMap.createViewQuad(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    /** @deprecated Access via `engine.rtResourceMap.getTexture(...)` instead. */
    public static getTexture(name: string): RenderTexture {
        return _activeMap.getTexture(name);
    }

    /** @deprecated Access via `engine.rtResourceMap.CreateSplitTexture(...)` instead. */
    public static CreateSplitTexture(id: string): RenderTexture {
        return _activeMap.CreateSplitTexture(id);
    }

    /** @deprecated Access via `engine.rtResourceMap.WriteSplitColorTexture(...)` instead. */
    public static WriteSplitColorTexture(id: string): void {
        _activeMap.WriteSplitColorTexture(id);
    }
}

/**
 * Switch the active RTResourceMap to the currently-rendering engine's instance.
 * Called by Engine3D._activateSelf() (via setActiveGBufferResources) before each frame.
 * @internal
 */
export function setActiveRTResourceMap(map: RTResourceMap): void {
    _activeMap = map;
}
