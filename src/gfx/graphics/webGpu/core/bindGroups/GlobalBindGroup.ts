import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { getCurrentEngineId } from "../../../../../core/EngineContext";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

interface GlobalBindGroupData {
    cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    lightEntriesMap: Map<Scene3D, LightEntries>;
    reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;
}

/**
 * @internal
 * Use Global DO Matrix ArrayBuffer Descriptor
 * @group GFX
 */
export class GlobalBindGroup {
    public static modelMatrixBindGroup: MatrixBindGroup;
    private static _store: Map<number, GlobalBindGroupData> = new Map();

    private static _data(): GlobalBindGroupData {
        const id = getCurrentEngineId();
        let d = GlobalBindGroup._store.get(id);
        if (!d) {
            d = {
                cameraBindGroups: new Map(),
                lightEntriesMap: new Map(),
                reflectionEntriesMap: new Map(),
            };
            GlobalBindGroup._store.set(id, d);
        }
        return d;
    }

    public static init() {
        if (!GlobalBindGroup.modelMatrixBindGroup) {
            GlobalBindGroup.modelMatrixBindGroup = new MatrixBindGroup();
        }
        const id = getCurrentEngineId();
        GlobalBindGroup._store.set(id, {
            cameraBindGroups: new Map(),
            lightEntriesMap: new Map(),
            reflectionEntriesMap: new Map(),
        });
    }

    public static getAllCameraGroup() {
        return GlobalBindGroup._data().cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D) {
        let d = GlobalBindGroup._data();
        let cameraBindGroup = d.cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(GlobalBindGroup.modelMatrixBindGroup);
            d.cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
        return cameraBindGroup;
    }

    public static updateCameraGroup(camera: Camera3D) {
        let d = GlobalBindGroup._data();
        let cameraBindGroup = d.cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(GlobalBindGroup.modelMatrixBindGroup);
            d.cameraBindGroups.set(camera, cameraBindGroup);
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

        let d = GlobalBindGroup._data();
        let lightEntries = d.lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            d.lightEntriesMap.set(scene, lightEntries);
        }
        return d.lightEntriesMap.get(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) {
            console.log(`getLightEntries scene is null`);
        }

        let d = GlobalBindGroup._data();
        let reflectionEntries = d.reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            d.reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return d.reflectionEntriesMap.get(scene);
    }
}
