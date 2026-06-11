import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';
import { currentEngineId } from '../../../core/EngineRegistry';
/**
 * @internal
 * @group Post
 */
export class RTResourceMap {

    public static rtTextureMap: Map<string, RenderTexture>;
    public static rtViewQuad: Map<string, ViewQuad>;

    /** Prefix a resource name with the active engine ID for per-instance isolation. */
    private static _key(name: string): string {
        return currentEngineId ? `${currentEngineId}_${name}` : name;
    }

    /** Initialise resource maps. Safe to call multiple times (idempotent). */
    public static init() {
        if (!this.rtTextureMap) {
            this.rtTextureMap = new Map<string, RenderTexture>();
        }
        if (!this.rtViewQuad) {
            this.rtViewQuad = new Map<string, ViewQuad>();
        }
    }

    /**
     * Remove all resources belonging to the given engine instance.
     * @internal
     */
    public static destroyForEngine(engineId: string): void {
        if (this.rtTextureMap) {
            for (const key of [...this.rtTextureMap.keys()]) {
                if (key.startsWith(engineId + '_')) {
                    this.rtTextureMap.delete(key);
                }
            }
        }
        if (this.rtViewQuad) {
            for (const key of [...this.rtViewQuad.keys()]) {
                if (key.startsWith(engineId + '_')) {
                    this.rtViewQuad.delete(key);
                }
            }
        }
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        const fullName = this._key(name);
        let rt: RenderTexture = this.rtTextureMap.get(fullName);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = fullName;
            RTResourceMap.rtTextureMap.set(fullName, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        const fullName = this._key(name);
        let rt: RenderTexture = this.rtTextureMap.get(fullName);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = fullName;
            RTResourceMap.rtTextureMap.set(fullName, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        const fullName = this._key(name);
        let rtFrame = new RTFrame([
            outRtTexture
        ],
            [
                new RTDescriptor()
            ]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        RTResourceMap.rtViewQuad.set(fullName, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string) {
        return this.rtTextureMap.get(this._key(name));
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
