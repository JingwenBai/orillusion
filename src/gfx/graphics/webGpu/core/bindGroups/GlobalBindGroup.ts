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
    public static modelMatrixBindGroup: MatrixBindGroup;

    public static init() {
        // modelMatrixBindGroup is always (re)created because it's per-engine-instance.
        // Engine3D will call activateModelMatrixBindGroup() to restore its own after init.
        this.modelMatrixBindGroup = new MatrixBindGroup();
        // Camera/light/reflection maps are keyed by Camera3D/Scene3D so they are naturally
        // isolated across engines; only create them once to avoid destroying live data.
        if (!this._cameraBindGroups) {
            this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        }
        if (!this._lightEntriesMap) {
            this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        }
        if (!this._reflectionEntriesMap) {
            this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
        }
    }

    /**
     * @internal
     * Swap the modelMatrixBindGroup to that owned by a specific engine instance.
     * Called by Engine3D before each render frame.
     */
    public static activateModelMatrixBindGroup(bindGroup: MatrixBindGroup): void {
        this.modelMatrixBindGroup = bindGroup;
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
