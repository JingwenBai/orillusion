import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

// Module-level "current active" instance – set by Engine3D before each frame
let _activeInstance: GlobalBindGroup | null = null;
let _defaultInstance: GlobalBindGroup | null = null;

/** @internal Called by Engine3D to set the active GlobalBindGroup for the current render frame */
export function setActiveGlobalBindGroup(gbg: GlobalBindGroup): void {
    _activeInstance = gbg;
}

function _getCurrent(): GlobalBindGroup {
    if (_activeInstance) return _activeInstance;
    if (!_defaultInstance) {
        _defaultInstance = new GlobalBindGroup();
        _defaultInstance.init();
    }
    return _defaultInstance;
}

/**
 * @internal
 * Use Global DO Matrix ArrayBuffer Descriptor
 * @group GFX
 */
export class GlobalBindGroup {
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;
    public modelMatrixBindGroup: MatrixBindGroup;

    public init() {
        this.modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

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
            console.log(`getLightEntries scene is null`);
        }
        let reflectionEntries = this._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return this._reflectionEntriesMap.get(scene);
    }

    // ----------------------------------------------------------------
    // Static shims for backwards compatibility (delegate to active instance)
    // ----------------------------------------------------------------

    public static init() { _getCurrent().init(); }

    public static getAllCameraGroup() { return _getCurrent().getAllCameraGroup(); }

    public static getCameraGroup(camera: Camera3D) { return _getCurrent().getCameraGroup(camera); }

    public static updateCameraGroup(camera: Camera3D) { _getCurrent().updateCameraGroup(camera); }

    public static getLightEntries(scene: Scene3D): LightEntries { return _getCurrent().getLightEntries(scene); }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries { return _getCurrent().getReflectionEntries(scene); }

    public static get modelMatrixBindGroup(): MatrixBindGroup { return _getCurrent().modelMatrixBindGroup; }
}
