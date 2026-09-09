import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { getCurrentHandle } from "../../../../EngineContext";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

interface GlobalBindGroupState {
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
    private static _stateMap: Map<object, GlobalBindGroupState> = new Map();

    private static getState(): GlobalBindGroupState {
        return this._stateMap.get(getCurrentHandle()!)!;
    }

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return this.getState()?.modelMatrixBindGroup;
    }

    public static init(): void {
        const handle = getCurrentHandle()!;
        this._stateMap.set(handle, {
            modelMatrixBindGroup: new MatrixBindGroup(),
            cameraBindGroups: new Map(),
            lightEntriesMap: new Map(),
            reflectionEntriesMap: new Map(),
        });
    }

    public static getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return this.getState().cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        const state = this.getState();
        let cameraBindGroup = state.cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(state.modelMatrixBindGroup);
            state.cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
        return cameraBindGroup;
    }

    public static updateCameraGroup(camera: Camera3D): void {
        const state = this.getState();
        let cameraBindGroup = state.cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(state.modelMatrixBindGroup);
            state.cameraBindGroups.set(camera, cameraBindGroup);
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

        const state = this.getState();
        let lightEntries = state.lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            state.lightEntriesMap.set(scene, lightEntries);
        }
        return state.lightEntriesMap.get(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) {
            console.log(`getReflectionEntries scene is null`);
        }

        const state = this.getState();
        let reflectionEntries = state.reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            state.reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return state.reflectionEntriesMap.get(scene);
    }
}
