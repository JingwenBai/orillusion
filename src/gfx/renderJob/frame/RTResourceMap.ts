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

    // --- Per-instance state ---
    public _rtTextureMap: Map<string, RenderTexture>;
    public _rtViewQuad: Map<string, ViewQuad>;

    // --- Active instance for static backward-compat delegation ---
    private static _activeInstance: RTResourceMap;

    /**
     * Set the active RTResourceMap instance. Engine3D calls this before rendering each frame.
     * @internal
     */
    public static setActive(instance: RTResourceMap): void {
        RTResourceMap._activeInstance = instance;
    }

    /**
     * Get the currently active RTResourceMap instance.
     * @internal
     */
    public static getActive(): RTResourceMap {
        return RTResourceMap._activeInstance;
    }

    // Legacy static accessors kept for backward compat (read-only view of active instance's maps)
    public static get rtTextureMap(): Map<string, RenderTexture> {
        return RTResourceMap._activeInstance?._rtTextureMap;
    }

    public static get rtViewQuad(): Map<string, ViewQuad> {
        return RTResourceMap._activeInstance?._rtViewQuad;
    }

    /**
     * Initialize this RTResourceMap instance.
     */
    public init(): void {
        this._rtTextureMap = new Map<string, RenderTexture>();
        this._rtViewQuad = new Map<string, ViewQuad>();
        // Set as active on init for the first (default) instance
        if (!RTResourceMap._activeInstance) {
            RTResourceMap._activeInstance = this;
        }
    }

    // --- Instance methods (actual implementation) ---

    public instanceCreateRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        let rt: RenderTexture = this._rtTextureMap.get(name);
        if (!rt) {
            if (name == RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            this._rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public instanceCreateRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        let rt: RenderTexture = this._rtTextureMap.get(name);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            this._rtTextureMap.set(name, rt);
        }
        return rt;
    }

    public instanceCreateViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        let rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        let viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        this._rtViewQuad.set(name, viewQuad);
        return viewQuad;
    }

    public instanceGetTexture(name: string): RenderTexture {
        return this._rtTextureMap.get(name);
    }

    public instanceCreateSplitTexture(id: string): RenderTexture {
        let colorTex = this.instanceGetTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.instanceGetTexture(id + "_split");
        if (!tex) {
            tex = this.instanceCreateRTTexture(id + "_split", colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public instanceWriteSplitColorTexture(id: string): void {
        let colorTex = this.instanceGetTexture(RTResourceConfig.colorBufferTex_NAME);
        let tex = this.instanceGetTexture(id + "_split");
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

    // --- Static backward-compat methods (delegate to active instance) ---

    /** @deprecated Use instance methods via Engine3D.rtResourceMap */
    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return RTResourceMap._activeInstance.instanceCreateRTTexture(name, rtWidth, rtHeight, format, useMipmap, sampleCount);
    }

    /** @deprecated Use instance methods via Engine3D.rtResourceMap */
    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0): RenderTexture {
        return RTResourceMap._activeInstance.instanceCreateRTTextureArray(name, rtWidth, rtHeight, format, length, useMipmap, sampleCount);
    }

    /** @deprecated Use instance methods via Engine3D.rtResourceMap */
    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0): ViewQuad {
        return RTResourceMap._activeInstance.instanceCreateViewQuad(name, shaderVS, shaderFS, outRtTexture, multisample);
    }

    /** @deprecated Use instance methods via Engine3D.rtResourceMap */
    public static getTexture(name: string): RenderTexture {
        return RTResourceMap._activeInstance?.instanceGetTexture(name);
    }

    /** @deprecated Use instance methods via Engine3D.rtResourceMap */
    public static CreateSplitTexture(id: string): RenderTexture {
        return RTResourceMap._activeInstance.instanceCreateSplitTexture(id);
    }

    /** @deprecated Use instance methods via Engine3D.rtResourceMap */
    public static WriteSplitColorTexture(id: string): void {
        RTResourceMap._activeInstance.instanceWriteSplitColorTexture(id);
    }
}
