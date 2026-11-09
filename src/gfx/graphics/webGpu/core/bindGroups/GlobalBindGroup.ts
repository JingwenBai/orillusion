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

    // =========================================================
    // Instance state
    // =========================================================

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

    public getAllCameraGroup_instance() {
        return this._cameraBindGroups;
    }

    public getCameraGroup_instance(camera: Camera3D) {
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

    public updateCameraGroup_instance(camera: Camera3D) {
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

    public getLightEntries_instance(scene: Scene3D): LightEntries {
        if (!scene) console.log(`getLightEntries scene is null`);
        let lightEntries = this._lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            this._lightEntriesMap.set(scene, lightEntries);
        }
        return this._lightEntriesMap.get(scene);
    }

    public getReflectionEntries_instance(scene: Scene3D): ReflectionEntries {
        if (!scene) console.log(`getReflectionEntries scene is null`);
        let reflectionEntries = this._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return this._reflectionEntriesMap.get(scene);
    }

    // =========================================================
    // Static delegation to the currently-active instance
    // =========================================================

    private static _current: GlobalBindGroup = new GlobalBindGroup();

    public static setCurrent(instance: GlobalBindGroup) {
        GlobalBindGroup._current = instance;
    }

    public static get modelMatrixBindGroup() { return GlobalBindGroup._current.modelMatrixBindGroup; }

    public static init() {
        GlobalBindGroup._current = new GlobalBindGroup();
    }

    public static getAllCameraGroup() {
        return GlobalBindGroup._current.getAllCameraGroup_instance();
    }

    public static getCameraGroup(camera: Camera3D) {
        return GlobalBindGroup._current.getCameraGroup_instance(camera);
    }

    public static updateCameraGroup(camera: Camera3D) {
        return GlobalBindGroup._current.updateCameraGroup_instance(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        return GlobalBindGroup._current.getLightEntries_instance(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return GlobalBindGroup._current.getReflectionEntries_instance(scene);
    }
}
