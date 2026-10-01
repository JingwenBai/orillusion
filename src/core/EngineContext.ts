import { ComponentCollect } from '../gfx/renderJob/collect/ComponentCollect';
import { EntityCollect } from '../gfx/renderJob/collect/EntityCollect';
import { GlobalBindGroup } from '../gfx/graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { RTResourceMap } from '../gfx/renderJob/frame/RTResourceMap';
import { ShadowLightsCollect } from '../gfx/renderJob/collect/ShadowLightsCollect';
import type { GBufferFrame } from '../gfx/renderJob/frame/GBufferFrame';
import type { Context3D } from '../gfx/graphics/webGpu/Context3D';
import type { EngineSetting } from '../setting/EngineSetting';
import type { Res } from '../assets/Res';

/**
 * Per-engine-instance context — bundles all state that must be isolated
 * when multiple Engine3D instances run side-by-side.
 *
 * Access the currently-rendering engine's context via the static helpers
 * `EngineContext.getCurrent()` / `EngineContext.setCurrent()`.
 * The `Engine3D` instance writes `setCurrent(this._context)` at the top of
 * each frame so any subsystem without an explicit `view` reference can still
 * look up the correct context via `getCurrent()`.
 *
 * @group engine3D
 */
export class EngineContext {
    // ---- static "current-engine" slot (set at frame start by Engine3D) ----
    private static _current: EngineContext | null = null;

    public static setCurrent(ctx: EngineContext | null): void {
        EngineContext._current = ctx;
    }

    public static getCurrent(): EngineContext | null {
        return EngineContext._current;
    }

    // ---- per-instance fields ----

    /**
     * WebGPU canvas context for this engine instance.
     * All engines share the same GPUDevice; each gets its own GPUCanvasContext.
     */
    public webGPUContext: Context3D;

    /** Per-engine component lifecycle registry */
    public componentCollect: ComponentCollect;

    /** Per-engine renderable-node / light registry */
    public entityCollect: EntityCollect;

    /** Per-engine GPU camera-/light-/reflection-bind-group registry */
    public globalBindGroup: GlobalBindGroup;

    /** Per-engine render-texture registry */
    public rtResourceMap: RTResourceMap;

    /** Per-engine shadow-light registry */
    public shadowLightsCollect: ShadowLightsCollect;

    /** Per-engine GBuffer frame-object registry (keyed by string name) */
    public gBufferFrameMap: Map<string, GBufferFrame>;

    /** This engine instance's configuration */
    public setting: EngineSetting;

    /** This engine instance's resource / asset manager */
    public res: Res;

    constructor() {
        this.componentCollect = new ComponentCollect();
        this.entityCollect = new EntityCollect();
        this.globalBindGroup = new GlobalBindGroup();
        this.rtResourceMap = new RTResourceMap();
        this.shadowLightsCollect = new ShadowLightsCollect();
        this.gBufferFrameMap = new Map();
    }
}
