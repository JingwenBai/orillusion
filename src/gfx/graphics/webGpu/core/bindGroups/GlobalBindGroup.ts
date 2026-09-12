import { Camera3D } from "../../../../../core/Camera3D";
import { getActiveEngine } from "../../../../../core/EngineRegistry";
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

    // ─── Instance fields ───────────────────────────────────────────────────────
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;
    public modelMatrixBindGroup: MatrixBindGroup;

    /** @internal Global singleton for legacy/single-engine code */
    private static _global: GlobalBindGroup = new GlobalBindGroup();

    /** @internal Return the active engine's instance or global fallback */
    private static _get(): GlobalBindGroup {
        return getActiveEngine()?.globalBindGroup ?? GlobalBindGroup._global;
    }

    constructor() {
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    // ─── Instance methods ──────────────────────────────────────────────────────

    public initInstance() {
        this.modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    public getAllCameraGroupInstance() {
        return this._cameraBindGroups;
    }

    public getCameraGroupInstance(camera: Camera3D): GlobalUniformGroup {
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

    public updateCameraGroupInstance(camera: Camera3D) {
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

    public getLightEntriesInstance(scene: Scene3D): LightEntries {
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

    public getReflectionEntriesInstance(scene: Scene3D): ReflectionEntries {
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

    // ─── Static API (backward-compatible) ─────────────────────────────────────

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return GlobalBindGroup._get().modelMatrixBindGroup;
    }

    public static set modelMatrixBindGroup(v: MatrixBindGroup) {
        GlobalBindGroup._get().modelMatrixBindGroup = v;
    }

    public static init() {
        GlobalBindGroup._get().initInstance();
    }

    public static getAllCameraGroup() {
        return GlobalBindGroup._get().getAllCameraGroupInstance();
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        return GlobalBindGroup._get().getCameraGroupInstance(camera);
    }

    public static updateCameraGroup(camera: Camera3D) {
        GlobalBindGroup._get().updateCameraGroupInstance(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        return GlobalBindGroup._get().getLightEntriesInstance(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return GlobalBindGroup._get().getReflectionEntriesInstance(scene);
    }
}
