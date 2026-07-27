import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { engineRef } from "../../../../../EngineRef";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * Per-Engine3D bind-group registry for cameras, lights, and the model-matrix buffer.
 * Each Engine3D instance owns one GlobalBindGroup.  The static accessor methods
 * delegate to the currently active engine's instance for backward compatibility.
 * @internal
 * @group GFX
 */
export class GlobalBindGroup {
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;
    public modelMatrixBindGroup: MatrixBindGroup;

    /** Initialize the per-engine bind-group data. */
    public _init() {
        this.modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    public _getAllCameraGroup() {
        return this._cameraBindGroups;
    }

    public _getCameraGroup(camera: Camera3D): GlobalUniformGroup {
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

    public _updateCameraGroup(camera: Camera3D) {
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

    public _getLightEntries(scene: Scene3D): LightEntries {
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

    public _getReflectionEntries(scene: Scene3D): ReflectionEntries {
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

    // ---- static backward-compat API ----

    private static _get(): GlobalBindGroup {
        return engineRef.active?.globalBindGroup;
    }

    /** @deprecated Use engine.globalBindGroup._init() */
    public static init() {
        this._get()?._init();
    }

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return this._get()?.modelMatrixBindGroup;
    }

    public static getAllCameraGroup() {
        return this._get()?._getAllCameraGroup();
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        return this._get()?._getCameraGroup(camera);
    }

    public static updateCameraGroup(camera: Camera3D) {
        this._get()?._updateCameraGroup(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        return this._get()?._getLightEntries(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return this._get()?._getReflectionEntries(scene);
    }
}
