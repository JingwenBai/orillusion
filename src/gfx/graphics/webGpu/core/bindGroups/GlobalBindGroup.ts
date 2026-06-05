import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * @internal
 * Per-engine instance that manages camera, light and reflection bind groups.
 * The static methods delegate to the currently active instance set by Engine3D.
 * @group GFX
 */
export class GlobalBindGroup {
    private static _active: GlobalBindGroup = null;

    /**
     * Switch the active GlobalBindGroup instance (called by Engine3D before each render frame).
     * @internal
     */
    public static setActive(bg: GlobalBindGroup) {
        GlobalBindGroup._active = bg;
    }

    // Static facade: init creates a new instance and activates it
    public static init(): GlobalBindGroup {
        const bg = new GlobalBindGroup();
        GlobalBindGroup._active = bg;
        return bg;
    }

    // Static facade properties delegating to the active instance
    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return GlobalBindGroup._active?._modelMatrixBindGroup;
    }
    public static set modelMatrixBindGroup(v: MatrixBindGroup) {
        if (GlobalBindGroup._active) GlobalBindGroup._active._modelMatrixBindGroup = v;
    }

    // Static facade methods delegating to the active instance
    public static getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return GlobalBindGroup._active?._cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        return GlobalBindGroup._active?._getCameraGroup(camera);
    }

    public static updateCameraGroup(camera: Camera3D) {
        GlobalBindGroup._active?._updateCameraGroup(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        if (!scene) {
            console.log(`getLightEntries scene is null`);
        }
        return GlobalBindGroup._active?._getLightEntries(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) {
            console.log(`getReflectionEntries scene is null`);
        }
        return GlobalBindGroup._active?._getReflectionEntries(scene);
    }

    // ── Instance state ──────────────────────────────────────────────────────
    private _modelMatrixBindGroup: MatrixBindGroup;
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;

    constructor() {
        this._modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    private _getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        let cameraBindGroup = this._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(this._modelMatrixBindGroup);
            this._cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
        return cameraBindGroup;
    }

    private _updateCameraGroup(camera: Camera3D) {
        let cameraBindGroup = this._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(this._modelMatrixBindGroup);
            this._cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
    }

    private _getLightEntries(scene: Scene3D): LightEntries {
        let lightEntries = this._lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            this._lightEntriesMap.set(scene, lightEntries);
        }
        return this._lightEntriesMap.get(scene);
    }

    private _getReflectionEntries(scene: Scene3D): ReflectionEntries {
        let reflectionEntries = this._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return this._reflectionEntriesMap.get(scene);
    }
}
