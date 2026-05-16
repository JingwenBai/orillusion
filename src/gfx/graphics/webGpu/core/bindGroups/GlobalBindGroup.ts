import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * @internal
 * Use Global DO Matrix ArrayBuffer Descriptor
 * @group GFX
 */
export class GlobalBindGroup {

    // ── shared across all engine instances (backed by the single WASM matrix pool) ──
    public static modelMatrixBindGroup: MatrixBindGroup;

    // ── static proxy: points to the active engine's instance ──────────────
    /** @internal */
    public static _current: GlobalBindGroup;

    // ── static proxy methods (delegate to _current) ───────────────────────

    public static init() {
        if (!GlobalBindGroup.modelMatrixBindGroup) {
            GlobalBindGroup.modelMatrixBindGroup = new MatrixBindGroup();
        }
    }

    public static getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return GlobalBindGroup._current._cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        return GlobalBindGroup._current.getCameraGroup(camera);
    }

    public static updateCameraGroup(camera: Camera3D) {
        GlobalBindGroup._current.updateCameraGroup(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        return GlobalBindGroup._current.getLightEntries(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return GlobalBindGroup._current.getReflectionEntries(scene);
    }

    // ── per-engine instance state ──────────────────────────────────────────

    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;

    public init() {
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    public getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return this._cameraBindGroups;
    }

    public getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        let cameraBindGroup = this._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(GlobalBindGroup.modelMatrixBindGroup);
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
            cameraBindGroup = new GlobalUniformGroup(GlobalBindGroup.modelMatrixBindGroup);
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
}
