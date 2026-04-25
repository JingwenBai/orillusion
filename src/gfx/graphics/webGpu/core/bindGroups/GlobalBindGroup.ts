import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { EngineContext } from "../../../../../EngineContext";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * @internal
 * Per-engine global GPU bind group manager.
 *
 * Each Engine3D instance owns one GlobalBindGroup instance that tracks camera
 * uniform groups and light/reflection entries for the scenes it manages.
 *
 * modelMatrixBindGroup is intentionally kept as a shared static resource
 * because all Engine3D instances share a single GPUDevice and a single WASM
 * matrix pool — there is only one GPU buffer for all transforms on the page.
 *
 * The static methods are backward-compatible facades that delegate to the
 * active engine's instance (EngineContext.current.globalBindGroup).
 *
 * @group GFX
 */
export class GlobalBindGroup {

    // ─── Shared device-level resource (stays static) ─────────────────────────

    /** GPU buffer for all object transforms; shared across all Engine3D instances. */
    public static modelMatrixBindGroup: MatrixBindGroup;

    // ─── Instance data (per Engine3D) ────────────────────────────────────────

    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;

    constructor() {
        this._cameraBindGroups = new Map();
        this._lightEntriesMap = new Map();
        this._reflectionEntriesMap = new Map();
    }

    // ─── Instance methods ─────────────────────────────────────────────────────

    public getAllCameraGroup() {
        return this._cameraBindGroups;
    }

    public getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        let cameraBindGroup = this._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(GlobalBindGroup.modelMatrixBindGroup);
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
            cameraBindGroup = new GlobalUniformGroup(GlobalBindGroup.modelMatrixBindGroup);
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

    // ─── Static backward-compatible facades ──────────────────────────────────

    private static get _inst(): GlobalBindGroup {
        return EngineContext.current?.globalBindGroup;
    }

    public static getAllCameraGroup() {
        return GlobalBindGroup._inst?.getAllCameraGroup();
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        return GlobalBindGroup._inst?.getCameraGroup(camera);
    }

    public static updateCameraGroup(camera: Camera3D) {
        GlobalBindGroup._inst?.updateCameraGroup(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        return GlobalBindGroup._inst?.getLightEntries(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return GlobalBindGroup._inst?.getReflectionEntries(scene);
    }

    /**
     * @deprecated Use Engine3D.init() which creates the shared modelMatrixBindGroup.
     * Kept for backward compatibility only.
     */
    public static init() {
        if (!GlobalBindGroup.modelMatrixBindGroup) {
            GlobalBindGroup.modelMatrixBindGroup = new MatrixBindGroup();
        }
    }
}
