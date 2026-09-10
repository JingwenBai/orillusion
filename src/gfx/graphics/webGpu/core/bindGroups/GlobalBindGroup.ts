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

    private static _current: GlobalBindGroup;

    /**
     * @internal
     * Set the active GlobalBindGroup instance used by the currently rendering engine.
     */
    public static setCurrentInstance(instance: GlobalBindGroup) {
        this._current = instance;
    }

    // --------------- Static proxy methods (delegate to active instance) ---------------

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return this._current?.modelMatrixBindGroup;
    }

    public static init() {
        this._current?.init();
    }

    public static getAllCameraGroup() {
        return this._current?.getAllCameraGroup();
    }

    public static getCameraGroup(camera: Camera3D) {
        return this._current?.getCameraGroup(camera);
    }

    public static updateCameraGroup(camera: Camera3D) {
        return this._current?.updateCameraGroup(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        return this._current?.getLightEntries(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return this._current?.getReflectionEntries(scene);
    }

    // --------------- Instance members ---------------

    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;
    public modelMatrixBindGroup: MatrixBindGroup;

    public init() {
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
            console.log(`getLightEntries scene is null`);
        }

        let reflectionEntries = this._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return this._reflectionEntriesMap.get(scene);
    }
}
