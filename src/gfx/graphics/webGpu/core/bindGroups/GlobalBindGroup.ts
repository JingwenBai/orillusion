import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * @internal
 * Per-engine global GPU bind-group management.
 *
 * Instance methods are used internally by the engine.
 * Static methods are backward-compatible facades that delegate to the
 * currently active GlobalBindGroup instance (set by Engine3D).
 * @group GFX
 */
export class GlobalBindGroup {

    // ── Active-instance pointer (set by Engine3D) ─────────────────────────────
    /** @internal */
    public static _current: GlobalBindGroup | null = null;

    // ── Instance state ────────────────────────────────────────────────────────
    public modelMatrixBindGroup: MatrixBindGroup;
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;

    constructor() {
        this.modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    public getAllCameraGroup() {
        return this._cameraBindGroups;
    }

    public getCameraGroup(camera: Camera3D) {
        let cameraBindGroup = this._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(this.modelMatrixBindGroup);
            this._cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
        return cameraBindGroup;
    }

    public updateCameraGroup(camera: Camera3D) {
        let cameraBindGroup = this._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(this.modelMatrixBindGroup);
            this._cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
    }

    public getLightEntries(scene: Scene3D): LightEntries {
        if (!scene) {
            console.log(`getLightEntries scene is null`);
        }
        let lightEntries = this._lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            this._lightEntriesMap.set(scene, lightEntries);
        }
        return this._lightEntriesMap.get(scene);
    }

    public getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) {
            console.log(`getReflectionEntries scene is null`);
        }
        let reflectionEntries = this._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return this._reflectionEntriesMap.get(scene);
    }

    // ── Static facades ────────────────────────────────────────────────────────

    /** @deprecated Use instance method via engine.globalBindGroup */
    public static init() {
        // No-op: instantiation is handled by Engine3D constructor.
        // Kept for any legacy call sites.
    }

    public static getAllCameraGroup() {
        return GlobalBindGroup._current?.getAllCameraGroup();
    }

    public static getCameraGroup(camera: Camera3D) {
        return GlobalBindGroup._current?.getCameraGroup(camera);
    }

    public static updateCameraGroup(camera: Camera3D) {
        GlobalBindGroup._current?.updateCameraGroup(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        return GlobalBindGroup._current?.getLightEntries(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return GlobalBindGroup._current?.getReflectionEntries(scene);
    }

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return GlobalBindGroup._current?.modelMatrixBindGroup;
    }
}
