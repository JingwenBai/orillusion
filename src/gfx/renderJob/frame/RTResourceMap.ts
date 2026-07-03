import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
/**
 * @internal
 * @group Post
 */
export class RTResourceMap {

    /**
     * Per-engine render texture map — swapped in by Engine3D.activate() before each frame.
     * @internal
     */
    public static _activeRtTextureMap: Map<string, RenderTexture> | null = null;

    /**
     * Per-engine view quad map — swapped in by Engine3D.activate() before each frame.
     * @internal
     */
    public static _activeRtViewQuad: Map<string, ViewQuad> | null = null;

    /** Accessor that always returns the current engine's RT texture map. */
    public static get rtTextureMap(): Map<string, RenderTexture> {
        return RTResourceMap._activeRtTextureMap!;
    }
    public static set rtTextureMap(v: Map<string, RenderTexture>) {
        RTResourceMap._activeRtTextureMap = v;
    }

    /** Accessor that always returns the current engine's view quad map. */
    public static get rtViewQuad(): Map<string, ViewQuad> {
        return RTResourceMap._activeRtViewQuad!;
    }
    public static set rtViewQuad(v: Map<string, ViewQuad>) {
        RTResourceMap._activeRtViewQuad = v;
    }

    /** Create fresh maps for a new engine instance. Call once per engine during init. */
    public static init() {
        RTResourceMap._activeRtTextureMap = new Map<string, RenderTexture>();
        RTResourceMap._activeRtViewQuad = new Map<string, ViewQuad>();
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        let rt: RenderTexture = RTResourceMap._activeRtTextureMap!.get(name);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            RTResourceMap._activeRtTextureMap!.set(name, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        let rt: RenderTexture = RTResourceMap._activeRtTextureMap!.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            RTResourceMap._activeRtTextureMap!.set(name, rt);
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
        RTResourceMap._activeRtViewQuad!.set(name, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        return RTResourceMap._activeRtTextureMap!.get(name);
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
