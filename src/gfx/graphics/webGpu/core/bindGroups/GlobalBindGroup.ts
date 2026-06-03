import { Camera3D } from "../../../../../core/Camera3D";
import { activeEngine } from "../../../../../core/EngineContext";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * Per-Engine3D bind group manager for cameras, lights and reflections.
 * Static methods delegate to the currently active Engine3D instance.
 * @internal
 * @group GFX
 */
export class GlobalBindGroup {
    // ─── Instance state (one per Engine3D) ───────────────────────────────────

    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;
    public modelMatrixBindGroup: MatrixBindGroup;

    constructor() {
        this.modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    public getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return this._cameraBindGroups;
    }

    public getCameraGroup(camera: Camera3D): GlobalUniformGroup {
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

    public updateCameraGroup(camera: Camera3D): void {
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
            console.log(`getReflectionEntries scene is null`);
        }
        let reflectionEntries = this._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return this._reflectionEntriesMap.get(scene);
    }

    // ─── Static delegates → active engine's globalBindGroup ──────────────────

    /** @deprecated Use engine.globalBindGroup directly for multi-instance setups */
    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return activeEngine?.globalBindGroup?.modelMatrixBindGroup;
    }

    /** @deprecated Use engine.globalBindGroup directly for multi-instance setups */
    public static getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return activeEngine?.globalBindGroup?.getAllCameraGroup();
    }

    /** @deprecated Use engine.globalBindGroup directly for multi-instance setups */
    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        return activeEngine?.globalBindGroup?.getCameraGroup(camera);
    }

    /** @deprecated Use engine.globalBindGroup directly for multi-instance setups */
    public static updateCameraGroup(camera: Camera3D): void {
        activeEngine?.globalBindGroup?.updateCameraGroup(camera);
    }

    /** @deprecated Use engine.globalBindGroup directly for multi-instance setups */
    public static getLightEntries(scene: Scene3D): LightEntries {
        return activeEngine?.globalBindGroup?.getLightEntries(scene);
    }

    /** @deprecated Use engine.globalBindGroup directly for multi-instance setups */
    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return activeEngine?.globalBindGroup?.getReflectionEntries(scene);
    }
}
