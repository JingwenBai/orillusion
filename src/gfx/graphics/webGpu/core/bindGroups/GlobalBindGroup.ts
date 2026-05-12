import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * Active GlobalBindGroup instance for the currently-rendering Engine3D.
 * Set automatically by Engine3D before each render frame.
 * @internal
 */
let _active: GlobalBindGroup | null = null;

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

    constructor() {
        this.modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    // ── Instance API ────────────────────────────────────────────────────────

    public getAllCameraGroupInstance() {
        return this._cameraBindGroups;
    }

    public getCameraGroupInstance(camera: Camera3D) {
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

    // ── Static API (delegates to active instance — backward compatible) ─────

    /** @internal Set the active GlobalBindGroup for the currently-rendering engine. */
    public static setActive(bg: GlobalBindGroup) {
        _active = bg;
    }

    /** @deprecated Initialization is now handled by Engine3D constructor. */
    public static init() {
        // no-op: each Engine3D creates its own GlobalBindGroup instance
    }

    public static getAllCameraGroup() {
        return _active!.getAllCameraGroupInstance();
    }

    public static getCameraGroup(camera: Camera3D) {
        return _active!.getCameraGroupInstance(camera);
    }

    public static updateCameraGroup(camera: Camera3D) {
        return _active!.updateCameraGroupInstance(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        return _active!.getLightEntriesInstance(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return _active!.getReflectionEntriesInstance(scene);
    }

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return _active!.modelMatrixBindGroup;
    }
}
