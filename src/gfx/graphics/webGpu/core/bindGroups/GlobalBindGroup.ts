import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { getActiveEngine } from "../../../../../_activeEngine";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * @internal
 * Per-engine GPU bind group state.
 * Static methods delegate to the active Engine3D's instance via getActiveEngine().
 * @group GFX
 */
export class GlobalBindGroup {
    // ── instance state ────────────────────────────────────────────────────────
    public modelMatrixBindGroup: MatrixBindGroup;
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;

    constructor() {
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    public setup() {
        this.modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    public getAllCameraGroup() {
        return this._cameraBindGroups;
    }

    public getCameraGroup(camera: Camera3D): GlobalUniformGroup {
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
        return this._lightEntriesMap.get(scene);
    }

    public getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) console.log(`getReflectionEntries scene is null`);
        let reflectionEntries = this._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return this._reflectionEntriesMap.get(scene);
    }

    // ── static shims (delegate to active engine's instance) ──────────────────
    private static _gb(): GlobalBindGroup { return getActiveEngine()?._globalBindGroup; }

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return GlobalBindGroup._gb()?.modelMatrixBindGroup;
    }

    public static init() {
        const e = getActiveEngine();
        if (!e._globalBindGroup) e._globalBindGroup = new GlobalBindGroup();
        e._globalBindGroup.setup();
    }

    public static getAllCameraGroup() {
        return GlobalBindGroup._gb()?.getAllCameraGroup();
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        return GlobalBindGroup._gb()?.getCameraGroup(camera);
    }

    public static updateCameraGroup(camera: Camera3D) {
        GlobalBindGroup._gb()?.updateCameraGroup(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        return GlobalBindGroup._gb()?.getLightEntries(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return GlobalBindGroup._gb()?.getReflectionEntries(scene);
    }
}
