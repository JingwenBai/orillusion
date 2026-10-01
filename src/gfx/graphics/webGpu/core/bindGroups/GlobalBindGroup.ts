import { Camera3D } from "../../../../../core/Camera3D";
import { EngineContext } from "../../../../../core/EngineContext";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * @internal
 * Per-engine-instance GPU bind-group registry for cameras, lights and reflections.
 *
 * `modelMatrixBindGroup` is process-wide (wraps the shared WASM transform pool)
 * and kept as a public static so callers like DDGIIrradianceComputePass can reach
 * it without a view reference.
 *
 * All other bind-group maps are per-instance.  The static proxy methods route to
 * the correct instance via `EngineContext.getCurrent()`.
 * @group GFX
 */
export class GlobalBindGroup {

    // ------------------------------------------------------------------ //
    //  PROCESS-WIDE shared bind group (wraps the single WASM matrix pool) //
    // ------------------------------------------------------------------ //
    public static modelMatrixBindGroup: MatrixBindGroup;

    // ------------------------------------------------------------------ //
    //  STATIC PROXY methods (backward compat)                             //
    // ------------------------------------------------------------------ //

    public static init() {
        // Initialise the shared matrix bind group once.
        if (!GlobalBindGroup.modelMatrixBindGroup) {
            GlobalBindGroup.modelMatrixBindGroup = new MatrixBindGroup();
        }
        // Initialise per-engine maps on the current engine context.
        EngineContext.getCurrent()?.globalBindGroup._init();
    }

    public static getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return _resolve()?._cameraBindGroups ?? new Map();
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        return _resolveForCamera(camera)?.getCameraGroup(camera);
    }

    public static updateCameraGroup(camera: Camera3D) {
        _resolveForCamera(camera)?.updateCameraGroup(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        return _resolveForScene(scene)?.getLightEntries(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return _resolveForScene(scene)?.getReflectionEntries(scene);
    }

    // ------------------------------------------------------------------ //
    //  INSTANCE DATA (per-engine)                                         //
    // ------------------------------------------------------------------ //
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;

    private _initDone: boolean = false;

    public _init() {
        if (!this._initDone) {
            this._initDone = true;
            this._cameraBindGroups = new Map();
            this._lightEntriesMap = new Map();
            this._reflectionEntriesMap = new Map();
        }
    }

    // ------------------------------------------------------------------ //
    //  INSTANCE METHODS                                                   //
    // ------------------------------------------------------------------ //

    public getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        this._init();
        return this._cameraBindGroups;
    }

    public getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        this._init();
        let group = this._cameraBindGroups.get(camera);
        if (!group) {
            group = new GlobalUniformGroup(GlobalBindGroup.modelMatrixBindGroup);
            this._cameraBindGroups.set(camera, group);
        }
        if (camera.isShadowCamera) {
            group.setShadowCamera(camera);
        } else {
            group.setCamera(camera);
        }
        return group;
    }

    public updateCameraGroup(camera: Camera3D) {
        this._init();
        let group = this._cameraBindGroups.get(camera);
        if (!group) {
            group = new GlobalUniformGroup(GlobalBindGroup.modelMatrixBindGroup);
            this._cameraBindGroups.set(camera, group);
        }
        if (camera.isShadowCamera) {
            group.setShadowCamera(camera);
        } else {
            group.setCamera(camera);
        }
    }

    public getLightEntries(scene: Scene3D): LightEntries {
        this._init();
        if (!scene) console.log(`getLightEntries scene is null`);
        let entries = this._lightEntriesMap.get(scene);
        if (!entries) {
            entries = new LightEntries();
            this._lightEntriesMap.set(scene, entries);
        }
        return entries;
    }

    public getReflectionEntries(scene: Scene3D): ReflectionEntries {
        this._init();
        if (!scene) console.log(`getReflectionEntries scene is null`);
        let entries = this._reflectionEntriesMap.get(scene);
        if (!entries) {
            entries = new ReflectionEntries();
            this._reflectionEntriesMap.set(scene, entries);
        }
        return entries;
    }
}

// ---- routing helpers -------------------------------------------------- //

function _resolve(): GlobalBindGroup | null {
    return EngineContext.getCurrent()?.globalBindGroup ?? null;
}

function _resolveForCamera(camera: Camera3D): GlobalBindGroup | null {
    // Prefer the engine that owns this camera (via scene → view → context).
    const ctx = (camera?.transform?.scene3D?.view as any)?.engineContext as EngineContext | undefined;
    return ctx?.globalBindGroup ?? _resolve();
}

function _resolveForScene(scene: Scene3D): GlobalBindGroup | null {
    const ctx = (scene?.view as any)?.engineContext as EngineContext | undefined;
    return ctx?.globalBindGroup ?? _resolve();
}
