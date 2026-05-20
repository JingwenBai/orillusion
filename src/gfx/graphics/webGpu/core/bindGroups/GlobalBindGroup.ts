import { Camera3D } from "../../../../../core/Camera3D";
import { EngineContext } from "../../../../../core/EngineContext";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

interface GlobalBindGroupData {
    modelMatrixBindGroup: MatrixBindGroup;
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
    private static _store = new Map<any, GlobalBindGroupData>();

    private static get _data(): GlobalBindGroupData {
        return this._store.get(EngineContext.current);
    }

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return this._data?.modelMatrixBindGroup;
    }

    public static init() {
        const data: GlobalBindGroupData = {
            modelMatrixBindGroup: new MatrixBindGroup(),
            cameraBindGroups: new Map<Camera3D, GlobalUniformGroup>(),
            lightEntriesMap: new Map<Scene3D, LightEntries>(),
            reflectionEntriesMap: new Map<Scene3D, ReflectionEntries>(),
        };
        this._store.set(EngineContext.current, data);
    }

    public static getAllCameraGroup() {
        return this._data?.cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D) {
        const data = this._data;
        if (!data) return null;
        let cameraBindGroup = data.cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(data.modelMatrixBindGroup);
            data.cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
        return cameraBindGroup;
    }

    public static updateCameraGroup(camera: Camera3D) {
        let cameraBindGroup = this.getCameraGroup(camera);
        if (camera.isShadowCamera) {
            cameraBindGroup?.setShadowCamera(camera);
        } else {
            cameraBindGroup?.setCamera(camera);
        }
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        const data = this._data;
        if (!data) return null;
        if (!scene) {
            console.log(`getLightEntries scene is null`);
        }
        let lightEntries = data.lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            data.lightEntriesMap.set(scene, lightEntries);
        }
        return data.lightEntriesMap.get(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        const data = this._data;
        if (!data) return null;
        if (!scene) {
            console.log(`getReflectionEntries scene is null`);
        }
        let reflectionEntries = data.reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            data.reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return data.reflectionEntriesMap.get(scene);
    }
}
