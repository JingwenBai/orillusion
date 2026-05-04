import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * @internal
 * Module-level reference to the active GlobalBindGroup instance.
 * Engine3D sets this before each frame so all static callers use the
 * correct per-engine bind group state.
 */
let _active: GlobalBindGroup | null = null;

/**
 * @internal
 * Activate a specific GlobalBindGroup instance. Called by Engine3D during init
 * and at the start of every frame to support multiple Engine3D instances.
 */
export function setActiveGlobalBindGroup(g: GlobalBindGroup): void {
    _active = g;
}

/**
 * @internal
 * Use Global DO Matrix ArrayBuffer Descriptor
 * @group GFX
 */
export class GlobalBindGroup {

    // ── Instance state ──────────────────────────────────────────────────────
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;
    modelMatrixBindGroup: MatrixBindGroup;

    // ── Instance methods ─────────────────────────────────────────────────────
    init(): void {
        this.modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return this._cameraBindGroups;
    }

    getCameraGroup(camera: Camera3D): GlobalUniformGroup {
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

    updateCameraGroup(camera: Camera3D): void {
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

    getLightEntries(scene: Scene3D): LightEntries {
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

    getReflectionEntries(scene: Scene3D): ReflectionEntries {
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

    // ── Static proxy API (backward compat) ──────────────────────────────────

    public static init(): void {
        if (!_active) _active = new GlobalBindGroup();
        _active.init();
    }

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return _active!.modelMatrixBindGroup;
    }

    public static getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return _active!.getAllCameraGroup();
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        return _active!.getCameraGroup(camera);
    }

    public static updateCameraGroup(camera: Camera3D): void {
        _active!.updateCameraGroup(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        return _active!.getLightEntries(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return _active!.getReflectionEntries(scene);
    }
}
