import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";
import { getCurrentEngine } from "../../../../../engineRegistry";

/**
 * Per-engine GPU bind group manager (camera uniforms, lights, reflections, matrix buffer).
 * Static methods are compatibility shims that delegate to the active engine instance.
 * @internal
 * @group GFX
 */
export class GlobalBindGroup {

    // ── Instance fields ────────────────────────────────────────────────────

    public modelMatrixBindGroup: MatrixBindGroup;
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;

    // ── Instance methods ───────────────────────────────────────────────────

    init() {
        this.modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    getAllCameraGroup() {
        return this._cameraBindGroups;
    }

    getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        let group = this._cameraBindGroups.get(camera);
        if (!group) {
            group = new GlobalUniformGroup(this.modelMatrixBindGroup);
            this._cameraBindGroups.set(camera, group);
        }
        if (camera.isShadowCamera) {
            group.setShadowCamera(camera);
        } else {
            group.setCamera(camera);
        }
        return group;
    }

    updateCameraGroup(camera: Camera3D) {
        let group = this._cameraBindGroups.get(camera);
        if (!group) {
            group = new GlobalUniformGroup(this.modelMatrixBindGroup);
            this._cameraBindGroups.set(camera, group);
        }
        if (camera.isShadowCamera) {
            group.setShadowCamera(camera);
        } else {
            group.setCamera(camera);
        }
    }

    getLightEntries(scene: Scene3D): LightEntries {
        if (!scene) console.log(`getLightEntries scene is null`);
        let entries = this._lightEntriesMap.get(scene);
        if (!entries) {
            entries = new LightEntries();
            this._lightEntriesMap.set(scene, entries);
        }
        return entries;
    }

    getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) console.log(`getReflectionEntries scene is null`);
        let entries = this._reflectionEntriesMap.get(scene);
        if (!entries) {
            entries = new ReflectionEntries();
            this._reflectionEntriesMap.set(scene, entries);
        }
        return entries;
    }

    // ── Static compatibility shims ─────────────────────────────────────────

    /** @internal */
    public static init() {
        GlobalBindGroup._get()?.init();
    }
    /** @internal */
    public static getAllCameraGroup() {
        return GlobalBindGroup._get()?.getAllCameraGroup();
    }
    /** @internal */
    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        return GlobalBindGroup._get()?.getCameraGroup(camera);
    }
    /** @internal */
    public static updateCameraGroup(camera: Camera3D) {
        GlobalBindGroup._get()?.updateCameraGroup(camera);
    }
    /** @internal */
    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return GlobalBindGroup._get()?.modelMatrixBindGroup;
    }
    /** @internal */
    public static getLightEntries(scene: Scene3D): LightEntries {
        return GlobalBindGroup._get()?.getLightEntries(scene);
    }
    /** @internal */
    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return GlobalBindGroup._get()?.getReflectionEntries(scene);
    }

    private static _get(): GlobalBindGroup | null {
        return getCurrentEngine()?.globalBindGroup ?? null;
    }
}
