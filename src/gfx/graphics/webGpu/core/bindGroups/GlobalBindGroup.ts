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

    private static _active: GlobalBindGroup;

    /** Activate a per-engine GlobalBindGroup instance. */
    public static activate(instance: GlobalBindGroup): void {
        this._active = instance;
    }

    // ── Instance state ────────────────────────────────────────────────────────

    public matrixBindGroup: MatrixBindGroup;
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;

    constructor() {
        this.matrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    // ── Static delegates ──────────────────────────────────────────────────────

    public static init(): void {
        this._active = new GlobalBindGroup();
    }

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return this._active.matrixBindGroup;
    }

    public static getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return this._active._cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        let cameraBindGroup = this._active._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(this._active.matrixBindGroup);
            this._active._cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
        return cameraBindGroup;
    }

    public static updateCameraGroup(camera: Camera3D): void {
        let cameraBindGroup = this._active._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(this._active.matrixBindGroup);
            this._active._cameraBindGroups.set(camera, cameraBindGroup);
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
        let lightEntries = this._active._lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            this._active._lightEntriesMap.set(scene, lightEntries);
        }
        return this._active._lightEntriesMap.get(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) {
            console.log(`getLightEntries scene is null`);
        }
        let reflectionEntries = this._active._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._active._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return this._active._reflectionEntriesMap.get(scene);
    }
}
