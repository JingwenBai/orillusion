import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * @internal
 * Per-engine GPU bind group manager.
 * @group GFX
 */
export class GlobalBindGroup {
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

    /** @internal @deprecated Use new GlobalBindGroup() per engine */
    public static init() {
        /* no-op: EngineInstance creates its own GlobalBindGroup instance */
    }

    public getAllCameraGroupInternal(): Map<Camera3D, GlobalUniformGroup> {
        return this._cameraBindGroups;
    }

    public getCameraGroupInternal(camera: Camera3D): GlobalUniformGroup {
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

    public updateCameraGroupInternal(camera: Camera3D) {
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

    public getLightEntriesInternal(scene: Scene3D): LightEntries {
        if (!scene) console.log(`getLightEntries scene is null`);
        let lightEntries = this._lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            this._lightEntriesMap.set(scene, lightEntries);
        }
        return this._lightEntriesMap.get(scene);
    }

    public getReflectionEntriesInternal(scene: Scene3D): ReflectionEntries {
        if (!scene) console.log(`getReflectionEntries scene is null`);
        let reflectionEntries = this._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return this._reflectionEntriesMap.get(scene);
    }

    // ===== STATIC SHIMS (backward compat, route through camera/scene → engine reference) =====

    /** @internal Only used by ShadowLightsCollect. Prefer instance method. */
    public static getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return _activeGlobalBindGroup?.getAllCameraGroupInternal();
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        const bg = _bindGroupFromCamera(camera);
        return bg?.getCameraGroupInternal(camera);
    }

    public static updateCameraGroup(camera: Camera3D) {
        const bg = _bindGroupFromCamera(camera);
        bg?.updateCameraGroupInternal(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        const bg = _bindGroupFromScene(scene);
        return bg?.getLightEntriesInternal(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        const bg = _bindGroupFromScene(scene);
        return bg?.getReflectionEntriesInternal(scene);
    }

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return _activeGlobalBindGroup?.modelMatrixBindGroup;
    }
}

/**
 * @internal
 * Active GlobalBindGroup for the currently rendering engine.
 * Set by EngineInstance before each frame.
 */
export let _activeGlobalBindGroup: GlobalBindGroup = null;

/**
 * @internal
 */
export function setActiveGlobalBindGroup(bg: GlobalBindGroup): void {
    _activeGlobalBindGroup = bg;
}

function _bindGroupFromCamera(camera: Camera3D): GlobalBindGroup | null {
    const engine: any = (camera as any).engine;
    if (engine?.globalBindGroup) return engine.globalBindGroup;
    return _activeGlobalBindGroup;
}

function _bindGroupFromScene(scene: Scene3D): GlobalBindGroup | null {
    const engine: any = (scene?.view as any)?.engine;
    if (engine?.globalBindGroup) return engine.globalBindGroup;
    return _activeGlobalBindGroup;
}
