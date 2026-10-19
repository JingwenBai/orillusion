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

    /** Maps each camera to its owning scene so shadow-uniform updates can be scoped per-scene. */
    private static _cameraSceneMap: Map<Camera3D, Scene3D>;

    /** Idempotent — shared GPU resources are only created once. */
    public static init() {
        if (this.modelMatrixBindGroup) return;
        this.modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._cameraSceneMap = new Map<Camera3D, Scene3D>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    public static getAllCameraGroup() {
        return this._cameraBindGroups;
    }

    /**
     * Returns the subset of camera bind-groups whose cameras are associated with
     * the given scene.  Used by ShadowLightsCollect to avoid broadcasting shadow
     * uniforms to cameras from other Engine3D instances.
     */
    public static getCameraGroupsForScene(scene: Scene3D): Map<Camera3D, GlobalUniformGroup> {
        const result = new Map<Camera3D, GlobalUniformGroup>();
        this._cameraBindGroups.forEach((group, camera) => {
            if (this._cameraSceneMap.get(camera) === scene) {
                result.set(camera, group);
            }
        });
        return result;
    }

    public static getCameraGroup(camera: Camera3D, scene?: Scene3D) {
        let cameraBindGroup = this._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(this.modelMatrixBindGroup);
            this._cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (scene) {
            this._cameraSceneMap.set(camera, scene);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
        return cameraBindGroup;
    }

    public static updateCameraGroup(camera: Camera3D, scene?: Scene3D) {
        let cameraBindGroup = this._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(this.modelMatrixBindGroup);
            this._cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (scene) {
            this._cameraSceneMap.set(camera, scene);
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
