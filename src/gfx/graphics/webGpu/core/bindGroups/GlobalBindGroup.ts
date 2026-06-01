import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * @internal
 * Per-engine GPU bind-group registry.
 * Instantiated by Engine3D; static methods route to the correct instance.
 * @group GFX
 */
export class GlobalBindGroup {

    // ─── Instance state ───────────────────────────────────────────────────────

    public modelMatrixBindGroup: MatrixBindGroup;
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;

    constructor() {
        this.modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    // ─── Instance methods ─────────────────────────────────────────────────────

    public getAllCameraGroup() {
        return this._cameraBindGroups;
    }

    public getCameraGroup(camera: Camera3D) {
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

    public updateCameraGroup(camera: Camera3D) {
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
        if (!scene) console.log(`getLightEntries scene is null`);
        let lightEntries = this._lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            this._lightEntriesMap.set(scene, lightEntries);
        }
        return lightEntries;
    }

    public getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) console.log(`getReflectionEntries scene is null`);
        let reflectionEntries = this._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return reflectionEntries;
    }

    // ─── Static backward-compat API ───────────────────────────────────────────
    // During the render frame Engine3D sets _currentRenderingInstance.
    // For non-render-time access we fall back to _defaultInstance.

    /** @internal Set by Engine3D before each render frame. */
    public static _currentRenderingInstance: GlobalBindGroup | null = null;

    /** @internal Set by Engine3D on first init. */
    public static _defaultInstance: GlobalBindGroup | null = null;

    /** @deprecated Use engine.globalBindGroup directly. */
    public static init() {
        // No-op: instances are created by Engine3D now.
        // Kept so old call sites don't break at runtime.
    }

    public static getAllCameraGroup() {
        return _get().getAllCameraGroup();
    }

    public static getCameraGroup(camera: Camera3D) {
        return _get().getCameraGroup(camera);
    }

    public static updateCameraGroup(camera: Camera3D) {
        _get().updateCameraGroup(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        return _get().getLightEntries(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return _get().getReflectionEntries(scene);
    }

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return _get().modelMatrixBindGroup;
    }
}

function _get(): GlobalBindGroup {
    const inst = GlobalBindGroup._currentRenderingInstance ?? GlobalBindGroup._defaultInstance;
    if (!inst) throw new Error('GlobalBindGroup: no Engine3D instance initialised');
    return inst;
}
