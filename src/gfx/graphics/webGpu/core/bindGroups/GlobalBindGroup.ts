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

    // ── Per-engine instance state ──────────────────────────────────────────
    /** @internal */
    public readonly cameraBindGroups: Map<Camera3D, GlobalUniformGroup> = new Map();
    /** @internal */
    public readonly lightEntriesMap: Map<Scene3D, LightEntries> = new Map();
    /** @internal */
    public readonly reflectionEntriesMap: Map<Scene3D, ReflectionEntries> = new Map();
    /** @internal */
    public readonly matrixBindGroup: MatrixBindGroup;

    constructor() {
        this.matrixBindGroup = new MatrixBindGroup();
    }

    // ── Static fields (point to the active engine's data) ─────────────────
    private static _cameraBindGroups: Map<Camera3D, GlobalUniformGroup> = new Map();
    private static _lightEntriesMap: Map<Scene3D, LightEntries> = new Map();
    private static _reflectionEntriesMap: Map<Scene3D, ReflectionEntries> = new Map();
    /** @internal */
    public static modelMatrixBindGroup: MatrixBindGroup;

    /**
     * @internal
     * Redirect the static fields to point to the given engine instance's data.
     */
    public static activate(inst: GlobalBindGroup): void {
        GlobalBindGroup._cameraBindGroups = inst.cameraBindGroups;
        GlobalBindGroup._lightEntriesMap = inst.lightEntriesMap;
        GlobalBindGroup._reflectionEntriesMap = inst.reflectionEntriesMap;
        GlobalBindGroup.modelMatrixBindGroup = inst.matrixBindGroup;
    }

    /** @deprecated Use Engine3D.init() instead; kept for compatibility. */
    public static init() {
        // No-op: instance creation and activation is handled by Engine3D.
    }

    // ── Static API (unchanged – zero diff for all callers) ────────────────

    public static getAllCameraGroup() {
        return this._cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D) {
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

    public static updateCameraGroup(camera: Camera3D) {
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

    public static getLightEntries(scene: Scene3D): LightEntries {
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

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) {
            console.log(`getLightEntries scene is null`);
        }

        let reflectionEntries = this._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return this._reflectionEntriesMap.get(scene);
    }
}
