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

    // ---- Per-engine "current" instance ----

    private static _current: GlobalBindGroup;

    /**
     * @internal
     * Switch the active GlobalBindGroup to the one owned by the given Engine3D instance.
     */
    public static setCurrent(instance: GlobalBindGroup): void {
        this._current = instance;
    }

    // ---- Static accessors that forward to the current per-engine instance ----

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return this._current._modelMatrixBindGroup;
    }

    // ---- Instance (per-engine) properties ----

    public _modelMatrixBindGroup: MatrixBindGroup;
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;

    constructor() {
        this._modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    // ---- Static methods forward to _current ----

    public static init() {
        if (!this._current) {
            this._current = new GlobalBindGroup();
        }
        // Reinitialize maps so this engine starts with a clean state
        this._current._modelMatrixBindGroup = new MatrixBindGroup();
        this._current._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._current._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._current._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    public static getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return this._current._cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        let cameraBindGroup = this._current._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(this._current._modelMatrixBindGroup);
            this._current._cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
        return cameraBindGroup;
    }

    public static updateCameraGroup(camera: Camera3D): void {
        let cameraBindGroup = this._current._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(this._current._modelMatrixBindGroup);
            this._current._cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        if (!scene) {
            console.log(`getLightEntries scene is null`);
        }

        let lightEntries = this._current._lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            this._current._lightEntriesMap.set(scene, lightEntries);
        }
        return this._current._lightEntriesMap.get(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) {
            console.log(`getLightEntries scene is null`);
        }

        let reflectionEntries = this._current._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._current._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return this._current._reflectionEntriesMap.get(scene);
    }
}
