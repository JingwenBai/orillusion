import { ViewQuad } from '../../../core/ViewQuad';
import { RTDescriptor } from '../../graphics/webGpu/descriptor/RTDescriptor';
import { GPUContext } from '../GPUContext';
import { RTFrame } from './RTFrame';
import { RTResourceConfig } from '../config/RTResourceConfig';
import { RenderTexture } from '../../../textures/RenderTexture';

/**
 * Render-texture and ViewQuad cache.
 *
 * All map keys are automatically prefixed with the current Engine3D instance id
 * (via `RTResourceMap._enginePrefix()`) so multiple Engine3D instances never
 * share or overwrite each other's textures.
 * @internal
 * @group Post
 */
export class RTResourceMap {

    public static rtTextureMap: Map<string, RenderTexture> = new Map();
    public static rtViewQuad: Map<string, ViewQuad> = new Map();

    /** Initialise maps (idempotent – safe to call from multiple Engine3D.init()). */
    public static init() {
        // Maps persist across Engine3D instances; keys are scoped by engine id.
    }

    // ── internal key scoping ─────────────────────────────────────────────────

    /**
     * Return the current engine id prefix.  Resolved lazily through the Engine3D
     * module import so there is no circular-dependency at module load time.
     */
    private static _enginePrefix(): string {
        // Imported lazily to avoid circular dependencies at module load time.
        const Engine3D: any = RTResourceMap._getEngine3D();
        const id = Engine3D?._currentEngine?._id ?? 0;
        return `e${id}_`;
    }

    private static _engine3DModule: any = null;
    private static _getEngine3D(): any {
        if (!RTResourceMap._engine3DModule) {
            RTResourceMap._engine3DModule = require('../../../Engine3D').Engine3D;
        }
        return RTResourceMap._engine3DModule;
    }

    private static _key(name: string): string {
        return RTResourceMap._enginePrefix() + name;
    }

    // ── public API (delegates to scoped keys) ─────────────────────────────────

    public static createRTTexture(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, useMipmap: boolean = false, sampleCount: number = 0) {
        const key = RTResourceMap._key(name);
        let rt: RenderTexture = RTResourceMap.rtTextureMap.get(key);
        if (!rt) {
            if (name === RTResourceConfig.colorBufferTex_NAME) {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, false);
            } else {
                rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, 1, sampleCount, true);
            }
            rt.name = name;
            RTResourceMap.rtTextureMap.set(key, rt);
        }
        return rt;
    }

    public static createRTTextureArray(name: string, rtWidth: number, rtHeight: number, format: GPUTextureFormat, length: number = 1, useMipmap: boolean = false, sampleCount: number = 0) {
        const key = RTResourceMap._key(name);
        let rt: RenderTexture = RTResourceMap.rtTextureMap.get(key);
        if (!rt) {
            rt = new RenderTexture(rtWidth, rtHeight, format, useMipmap, undefined, length, sampleCount);
            rt.name = name;
            RTResourceMap.rtTextureMap.set(key, rt);
        }
        return rt;
    }

    public static createViewQuad(name: string, shaderVS: string, shaderFS: string, outRtTexture: RenderTexture, multisample: number = 0) {
        const key = RTResourceMap._key(name);
        const rtFrame = new RTFrame([outRtTexture], [new RTDescriptor()]);
        const viewQuad = new ViewQuad(shaderVS, shaderFS, rtFrame, multisample);
        RTResourceMap.rtViewQuad.set(key, viewQuad);
        return viewQuad;
    }

    public static getTexture(name: string): RenderTexture {
        return RTResourceMap.rtTextureMap.get(RTResourceMap._key(name));
    }

    public static CreateSplitTexture(id: string) {
        const colorTex = RTResourceMap.getTexture(RTResourceConfig.colorBufferTex_NAME);
        const splitName = id + "_split";
        let tex = RTResourceMap.getTexture(splitName);
        if (!tex) {
            tex = RTResourceMap.createRTTexture(splitName, colorTex.width, colorTex.height, colorTex.format, false);
        }
        return tex;
    }

    public static WriteSplitColorTexture(id: string) {
        const colorTex = RTResourceMap.getTexture(RTResourceConfig.colorBufferTex_NAME);
        const tex = RTResourceMap.getTexture(id + "_split");
        const commandEncoder = GPUContext.beginCommandEncoder();
        commandEncoder.copyTextureToTexture(
            { texture: colorTex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { texture: tex.getGPUTexture(), mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
            { width: tex.width, height: tex.height, depthOrArrayLayers: 1 },
        );
        GPUContext.endCommandEncoder(commandEncoder);
    }
}
