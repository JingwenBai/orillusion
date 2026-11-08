import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";
import { getCurrentEngine } from "../../../../../util/EngineHolder";

/**
 * @internal
 * Use Global DO Matrix ArrayBuffer Descriptor
 * @group GFX
 */
export class GlobalBindGroup {

    // ─── per-instance state ───────────────────────────────────────────────────

    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;
    public modelMatrixBindGroup: MatrixBindGroup;

    constructor() {
        this.modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    // ─── static facade helpers ────────────────────────────────────────────────

    private static get _current(): GlobalBindGroup {
        const engine = getCurrentEngine();
        return engine?.globalBindGroup ?? GlobalBindGroup._global;
    }

    private static readonly _global: GlobalBindGroup = new GlobalBindGroup();

    // ─── static init (kept for legacy callers) ────────────────────────────────

    /** @deprecated Create a new Engine3D instance instead. */
    public static init() {
        const g = GlobalBindGroup._current;
        g.modelMatrixBindGroup = new MatrixBindGroup();
        g._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        g._lightEntriesMap = new Map<Scene3D, LightEntries>();
        g._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    // ─── static facade API (backward-compatible) ─────────────────────────────

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return GlobalBindGroup._current.modelMatrixBindGroup;
    }

    public static set modelMatrixBindGroup(v: MatrixBindGroup) {
        GlobalBindGroup._current.modelMatrixBindGroup = v;
    }

    public static getAllCameraGroup() {
        return GlobalBindGroup._current._cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        const g = GlobalBindGroup._current;
        let cameraBindGroup = g._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(g.modelMatrixBindGroup);
            g._cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
        return cameraBindGroup;
    }

    public static updateCameraGroup(camera: Camera3D) {
        const g = GlobalBindGroup._current;
        let cameraBindGroup = g._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(g.modelMatrixBindGroup);
            g._cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        if (!scene) console.log(`getLightEntries scene is null`);
        const g = GlobalBindGroup._current;
        let lightEntries = g._lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            g._lightEntriesMap.set(scene, lightEntries);
        }
        return g._lightEntriesMap.get(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) console.log(`getLightEntries scene is null`);
        const g = GlobalBindGroup._current;
        let reflectionEntries = g._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            g._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return g._reflectionEntriesMap.get(scene);
    }
}
