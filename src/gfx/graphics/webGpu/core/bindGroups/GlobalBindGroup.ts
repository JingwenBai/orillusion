import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * Per-engine GlobalBindGroup state.
 * Each Engine3D instance owns one of these; `GlobalBindGroup` static methods
 * delegate to whichever state is currently active.
 * @internal
 */
export class GlobalBindGroupState {
    public modelMatrixBindGroup: MatrixBindGroup;
    public _cameraBindGroups: Map<Camera3D, GlobalUniformGroup> = new Map();
    public _lightEntriesMap: Map<Scene3D, LightEntries> = new Map();
    public _reflectionEntriesMap: Map<Scene3D, ReflectionEntries> = new Map();

    constructor() {
        this.modelMatrixBindGroup = new MatrixBindGroup();
    }
}

/** @internal */
let _activeState: GlobalBindGroupState | null = null;

/**
 * Set the active GlobalBindGroup state.
 * Called by Engine3D.activate() so that static accessors route to the right engine.
 * @internal
 */
export function setActiveGlobalBindGroupState(state: GlobalBindGroupState): void {
    _activeState = state;
}

function getState(): GlobalBindGroupState {
    if (!_activeState) throw new Error('GlobalBindGroup: no active Engine3D instance. Call Engine3D.init() first.');
    return _activeState;
}

/**
 * @internal
 * Use Global DO Matrix ArrayBuffer Descriptor
 * @group GFX
 */
export class GlobalBindGroup {
    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return getState().modelMatrixBindGroup;
    }

    public static init() {
        // If Engine3D already activated an instance state, leave it in place.
        // This covers the multi-instance path where the state is set before init() is called.
        if (!_activeState) {
            const state = new GlobalBindGroupState();
            setActiveGlobalBindGroupState(state);
        }
    }

    public static getAllCameraGroup() {
        return getState()._cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D) {
        const s = getState();
        let cameraBindGroup = s._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(s.modelMatrixBindGroup);
            s._cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
        return cameraBindGroup;
    }

    public static updateCameraGroup(camera: Camera3D) {
        const s = getState();
        let cameraBindGroup = s._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(s.modelMatrixBindGroup);
            s._cameraBindGroups.set(camera, cameraBindGroup);
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
        const s = getState();
        let lightEntries = s._lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            s._lightEntriesMap.set(scene, lightEntries);
        }
        return s._lightEntriesMap.get(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) {
            console.log(`getReflectionEntries scene is null`);
        }
        const s = getState();
        let reflectionEntries = s._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            s._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return s._reflectionEntriesMap.get(scene);
    }
}
