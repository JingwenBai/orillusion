import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/** Active per-engine instance; set by Engine3D before each frame. */
let _active: GlobalBindGroup | null = null;

/**
 * Activate a specific GlobalBindGroup as the current one.
 * Engine3D calls this before rendering a frame.
 * @internal
 */
export function activateGlobalBindGroup(gb: GlobalBindGroup): void {
    _active = gb;
}

/**
 * @internal
 * Use Global DO Matrix ArrayBuffer Descriptor
 * @group GFX
 */
export class GlobalBindGroup {

    // ------------------------------------------------------------------ //
    //  Instance state — one set per Engine3D instance                     //
    // ------------------------------------------------------------------ //

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

    // ------------------------------------------------------------------ //
    //  Instance methods                                                    //
    // ------------------------------------------------------------------ //

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
            console.log(`getReflectionEntries scene is null`);
        }
        let reflectionEntries = this._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return this._reflectionEntriesMap.get(scene);
    }

    // ------------------------------------------------------------------ //
    //  Static delegates — forward to the currently active instance        //
    // ------------------------------------------------------------------ //

    public static init() {
        // No-op: kept for call-site compatibility.
        // Engine3D creates its own GlobalBindGroup instance during init().
    }

    public static getAllCameraGroup() {
        return _active!.getAllCameraGroup();
    }

    public static getCameraGroup(camera: Camera3D) {
        return _active!.getCameraGroup(camera);
    }

    public static updateCameraGroup(camera: Camera3D) {
        _active!.updateCameraGroup(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        return _active!.getLightEntries(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return _active!.getReflectionEntries(scene);
    }

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return _active!.modelMatrixBindGroup;
    }
}
