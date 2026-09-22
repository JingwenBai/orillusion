import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * @internal
 * Per-engine state held by GlobalBindGroup.
 */
export class GlobalBindGroupState {
    public cameraBindGroups: Map<Camera3D, GlobalUniformGroup> = new Map();
    public lightEntriesMap: Map<Scene3D, LightEntries> = new Map();
    public reflectionEntriesMap: Map<Scene3D, ReflectionEntries> = new Map();
    public modelMatrixBindGroup: MatrixBindGroup;
}

/**
 * @internal
 * Use Global DO Matrix ArrayBuffer Descriptor
 * @group GFX
 */
export class GlobalBindGroup {
    private static _state: GlobalBindGroupState = new GlobalBindGroupState();

    /** Create a fresh state object for a new Engine3D instance. */
    public static createState(): GlobalBindGroupState {
        const s = new GlobalBindGroupState();
        s.modelMatrixBindGroup = new MatrixBindGroup();
        return s;
    }

    /** Activate the given state as the current context (called by Engine3D). */
    public static activateState(state: GlobalBindGroupState): void {
        GlobalBindGroup._state = state;
    }

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return this._state.modelMatrixBindGroup;
    }

    public static init() {
        this._state = this.createState();
    }

    public static getAllCameraGroup() {
        return this._state.cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D) {
        let cameraBindGroup = this._state.cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(this._state.modelMatrixBindGroup);
            this._state.cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
        return cameraBindGroup;
    }

    public static updateCameraGroup(camera: Camera3D) {
        let cameraBindGroup = this._state.cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(this._state.modelMatrixBindGroup);
            this._state.cameraBindGroups.set(camera, cameraBindGroup);
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

        let lightEntries = this._state.lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            this._state.lightEntriesMap.set(scene, lightEntries);
        }
        return this._state.lightEntriesMap.get(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) {
            console.log(`getLightEntries scene is null`);
        }

        let reflectionEntries = this._state.reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._state.reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return this._state.reflectionEntriesMap.get(scene);
    }
}
