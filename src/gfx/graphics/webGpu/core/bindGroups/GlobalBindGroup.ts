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
    private static _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private static _lightEntriesMap: Map<Scene3D, LightEntries>;
    private static _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;

    /** The model-matrix bind group for the currently active engine. */
    private static _activeModelMatrix: MatrixBindGroup;

    /** @deprecated Use Engine3D.modelMatrixBindGroup; access via GlobalBindGroup.modelMatrixBindGroup for the active engine. */
    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return GlobalBindGroup._activeModelMatrix;
    }

    /**
     * Switch to the given engine's model-matrix bind group.
     * Called by Engine3D.activateForRender().
     */
    public static activateModelMatrix(mbg: MatrixBindGroup): void {
        GlobalBindGroup._activeModelMatrix = mbg;
    }

    /**
     * Initialize shared per-scene/camera maps (guarded — safe to call multiple times)
     * and create a fresh per-engine MatrixBindGroup.
     * Returns the new MatrixBindGroup so Engine3D can store it.
     */
    public static init(): MatrixBindGroup {
        if (!this._cameraBindGroups) {
            this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
            this._lightEntriesMap = new Map<Scene3D, LightEntries>();
            this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
        }
        const mbg = new MatrixBindGroup();
        GlobalBindGroup._activeModelMatrix = mbg;
        return mbg;
    }

    public static getAllCameraGroup() {
        return this._cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D) {
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

    public static updateCameraGroup(camera: Camera3D) {
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

    public static getLightEntries(scene: Scene3D): LightEntries {
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

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
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
