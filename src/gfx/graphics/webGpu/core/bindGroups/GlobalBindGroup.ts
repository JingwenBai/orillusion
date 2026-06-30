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
    // ---- Instance state (per-engine) ----
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

    // ---- Static backward-compat API (delegates to primary engine's globalBindGroup) ----

    /**
     * @deprecated Use view.engine.globalBindGroup instead.
     * @internal
     */
    private static _primary: GlobalBindGroup | null = null;

    /**
     * @internal
     * Called by Engine3D.init() to register the primary engine's globalBindGroup for
     * backward-compat static access.
     */
    public static _setPrimary(instance: GlobalBindGroup) {
        GlobalBindGroup._primary = instance;
    }

    /** @deprecated Use view.engine.globalBindGroup.modelMatrixBindGroup */
    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return GlobalBindGroup._primary?.modelMatrixBindGroup;
    }

    /** @deprecated Use view.engine.globalBindGroup.getAllCameraGroup() */
    public static getAllCameraGroup() {
        return GlobalBindGroup._primary?.getAllCameraGroup();
    }

    /** @deprecated Use view.engine.globalBindGroup.getCameraGroup(camera) */
    public static getCameraGroup(camera: Camera3D) {
        return GlobalBindGroup._primary?.getCameraGroup(camera);
    }

    /** @deprecated Use view.engine.globalBindGroup.updateCameraGroup(camera) */
    public static updateCameraGroup(camera: Camera3D) {
        return GlobalBindGroup._primary?.updateCameraGroup(camera);
    }

    /** @deprecated Use view.engine.globalBindGroup.getLightEntries(scene) */
    public static getLightEntries(scene: Scene3D): LightEntries {
        return GlobalBindGroup._primary?.getLightEntries(scene);
    }

    /** @deprecated Use view.engine.globalBindGroup.getReflectionEntries(scene) */
    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return GlobalBindGroup._primary?.getReflectionEntries(scene);
    }
}
