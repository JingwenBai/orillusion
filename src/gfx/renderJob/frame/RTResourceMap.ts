import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';

/**
 * @internal
 * Per-engine render texture registry. Each Engine3D instance owns one RTResourceMap.
 * Static methods delegate to the currently active instance (set by Engine3D before rendering).
 * @group Post
 */
export class RTResourceMap {

    // Active instance — set by Engine3D before each render frame
    private static _active: RTResourceMap | null = null;

    /** Set the active RTResourceMap instance for the current engine */
    public static setActive(instance: RTResourceMap): void {
        this._active = instance;
    }

    // Per-instance state
    public rtTextureMap: Map<string, RenderTexture>;
    public rtViewQuad: Map<string, ViewQuad>;

    constructor() {
        this.rtTextureMap = new Map<string, RenderTexture>();
        this.rtViewQuad = new Map<string, ViewQuad>();
    }

    // ===== Instance methods =====

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

    // ===== Static backward-compat API (delegate to active instance) =====

    /** Create a new RTResourceMap instance and make it active */
    public static init(): RTResourceMap {
        const instance = new RTResourceMap();
        this.setActive(instance);
        return instance;
    }

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return this._active!.createRTTexture(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return this._active!.createRTTextureArray(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        return this._active!.createViewQuad(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    public static getTexture(name: string): RenderTexture {
        return this._active!.getTexture(name);
    }

    public static CreateSplitTexture(id: string): RenderTexture {
        return this._active!.CreateSplitTexture(id);
    }

    public static WriteSplitColorTexture(id: string): void {
        this._active!.WriteSplitColorTexture(id);
    }
}
