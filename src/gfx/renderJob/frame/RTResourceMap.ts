import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';

/**
 * Per-engine render-texture registry. Each Engine3D instance owns one of these
 * so that multiple engines on the same page never share render textures that
 * may have different resolutions or formats.
 *
 * The static methods on this class delegate to the currently active instance
 * (set by Engine3D before each frame) so all existing call sites require no change.
 * @internal
 * @group Post
 */
export class RTResourceMap {

    // ---- instance state ----
    private _rtTextureMap: Map<string, RenderTexture> = new Map();
    private _rtViewQuad: Map<string, ViewQuad> = new Map();

    // ---- active-instance registry ----
    private static _current: RTResourceMap;

    /** Register the instance that all static methods should operate on. Called by Engine3D. */
    public static setActive(instance: RTResourceMap): void {
        RTResourceMap._current = instance;
    }

    /** @internal – lazy accessor used by static helpers */
    private static get _c(): RTResourceMap {
        if (!RTResourceMap._current) {
            RTResourceMap._current = new RTResourceMap();
        }
        return RTResourceMap._current;
    }

    // ---- static API (backward-compatible surface) ----

    /** @deprecated Use per-instance access; remains for backward compatibility. */
    public static get rtTextureMap(): Map<string, RenderTexture> {
        return RTResourceMap._c._rtTextureMap;
    }

    /** @deprecated Use per-instance access; remains for backward compatibility. */
    public static get rtViewQuad(): Map<string, ViewQuad> {
        return RTResourceMap._c._rtViewQuad;
    }

    public static init() {
        // Ensure a current instance exists; called by Engine3D.init().
        // The active instance was already created by Engine3D; this is a no-op guard.
        if (!RTResourceMap._current) {
            RTResourceMap._current = new RTResourceMap();
        }
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        const map = RTResourceMap._c._rtTextureMap;
        let rt: RenderTexture = map.get(name);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            map.set(name, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        const map = RTResourceMap._c._rtTextureMap;
        let rt: RenderTexture = map.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            map.set(name, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        let rtFrame = new RTFrame([
            outRtTexture
        ],
            [
                new RTDescriptor()
            ]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        RTResourceMap._c._rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        return RTResourceMap._c._rtTextureMap.get(name);
    }

    public static CreateSplitTexture(id: string) {
        let colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + "_split");
        if (!tex) {
            tex = this.createRTTexture(id + "_split", colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public static WriteSplitColorTexture(id: string) {
        let colorTex = this.getTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.getTexture(id + "_split");
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
}
