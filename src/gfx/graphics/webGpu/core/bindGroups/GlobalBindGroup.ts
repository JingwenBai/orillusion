import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/** @internal Per-engine bind group state */
export class GlobalBindGroupState {
    cameraBindGroups: Map<Camera3D, GlobalUniformGroup> = new Map();
    lightEntriesMap: Map<Scene3D, LightEntries> = new Map();
    reflectionEntriesMap: Map<Scene3D, ReflectionEntries> = new Map();
    modelMatrixBindGroup: MatrixBindGroup = null;
}

let _state: GlobalBindGroupState = new GlobalBindGroupState();

/** @internal */
export function _createGlobalBindGroupState(): GlobalBindGroupState { return new GlobalBindGroupState(); }
/** @internal */
export function _setActiveGlobalBindGroup(s: GlobalBindGroupState): void { _state = s; }

/**
 * @internal
 * Use Global DO Matrix ArrayBuffer Descriptor
 * @group GFX
 */
export class GlobalBindGroup {
    public static get modelMatrixBindGroup(): MatrixBindGroup { return _state.modelMatrixBindGroup; }
    public static set modelMatrixBindGroup(v: MatrixBindGroup) { _state.modelMatrixBindGroup = v; }

    public static init() {
        _state.modelMatrixBindGroup = new MatrixBindGroup();
        _state.cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        _state.lightEntriesMap = new Map<Scene3D, LightEntries>();
        _state.reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    public static getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return _state.cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        let cameraBindGroup = _state.cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(_state.modelMatrixBindGroup);
            _state.cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
        return cameraBindGroup;
    }

    public static updateCameraGroup(camera: Camera3D): void {
        let cameraBindGroup = _state.cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(_state.modelMatrixBindGroup);
            _state.cameraBindGroups.set(camera, cameraBindGroup);
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

        let lightEntries = _state.lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            _state.lightEntriesMap.set(scene, lightEntries);
        }
        return _state.lightEntriesMap.get(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) {
            console.log(`getLightEntries scene is null`);
        }

        let reflectionEntries = _state.reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            _state.reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return _state.reflectionEntriesMap.get(scene);
    }
}
