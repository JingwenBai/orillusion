import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";
import { getActiveEngine } from "../../../../EngineContext";

/**
 * Per-engine instance that manages GPU bind groups for cameras, lights and
 * reflections.  Each Engine3D creates exactly one GlobalBindGroup.
 *
 * `modelMatrixBindGroup` is the only member that is intentionally shared across
 * all engines on the same GPU device: every engine's object transforms live in
 * the same WASM matrix pool and the same GPU storage buffer, so they only need
 * to be uploaded once per frame.
 *
 * All camera / light / reflection bind groups are per-engine because cameras and
 * scenes belong to a single engine instance.
 *
 * The static methods keep the original API intact and route to whichever engine
 * is currently executing a render frame (set via setActiveEngine in Engine3D).
 *
 * @internal
 * @group GFX
 */
export class GlobalBindGroup {

    // ------------------------------------------------------------------ //
    // Shared across all engines (one per GPU device)                       //
    // ------------------------------------------------------------------ //

    /** Shared GPU buffer for all object world-transform matrices. */
    public static modelMatrixBindGroup: MatrixBindGroup;

    // ------------------------------------------------------------------ //
    // Per-engine instance state                                             //
    // ------------------------------------------------------------------ //

    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup> = new Map();
    private _lightEntriesMap: Map<Scene3D, LightEntries> = new Map();
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries> = new Map();

    /** Initialise the shared matrix bind group (called once per process). */
    public static initMatrixBindGroup() {
        if (!this.modelMatrixBindGroup) {
            this.modelMatrixBindGroup = new MatrixBindGroup();
        }
    }

    public getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return this._cameraBindGroups;
    }

    public getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        let cameraBindGroup = this._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(GlobalBindGroup.modelMatrixBindGroup);
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
            cameraBindGroup = new GlobalUniformGroup(GlobalBindGroup.modelMatrixBindGroup);
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
        return lightEntries;
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
        return reflectionEntries;
    }

    // ------------------------------------------------------------------ //
    // Convenience: return the current engine's instance                    //
    // ------------------------------------------------------------------ //

    public static getCurrent(): GlobalBindGroup {
        const engine = getActiveEngine();
        return engine?.globalBindGroup ?? GlobalBindGroup._default;
    }

    private static _default: GlobalBindGroup = new GlobalBindGroup();

    // ------------------------------------------------------------------ //
    // Static routing API — backward compat                                 //
    // ------------------------------------------------------------------ //

    /** @deprecated Use engine.globalBindGroup.getAllCameraGroup() */
    public static getAllCameraGroup() { return this.getCurrent().getAllCameraGroup(); }

    /** @deprecated Use engine.globalBindGroup.getCameraGroup(camera) */
    public static getCameraGroup(camera: Camera3D) { return this.getCurrent().getCameraGroup(camera); }

    /** @deprecated Use engine.globalBindGroup.updateCameraGroup(camera) */
    public static updateCameraGroup(camera: Camera3D) { this.getCurrent().updateCameraGroup(camera); }

    /** @deprecated Use engine.globalBindGroup.getLightEntries(scene) */
    public static getLightEntries(scene: Scene3D): LightEntries { return this.getCurrent().getLightEntries(scene); }

    /** @deprecated Use engine.globalBindGroup.getReflectionEntries(scene) */
    public static getReflectionEntries(scene: Scene3D): ReflectionEntries { return this.getCurrent().getReflectionEntries(scene); }

    /** @deprecated — legacy init(), now initialises only the shared matrix bind group */
    public static init() {
        this.initMatrixBindGroup();
    }
}
