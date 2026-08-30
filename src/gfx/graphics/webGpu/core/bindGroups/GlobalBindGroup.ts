import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * Per-engine global bind group — holds the model matrix buffer, camera groups,
 * light entries and reflection entries for one Engine3D instance.
 *
 * The static methods delegate to the currently active instance so that
 * existing call-sites (pass renderers, post effects, etc.) continue to work
 * without modification when only a single engine is running.
 *
 * For multi-instance use, Engine3D calls {@link GlobalBindGroup.setCurrent}
 * at the start of each frame so that all synchronous render-path code
 * automatically uses the correct per-engine resources.
 *
 * @internal
 * @group GFX
 */
export class GlobalBindGroup {

    // ── Active-instance registry ─────────────────────────────────────────────
    private static _current: GlobalBindGroup;

    /** Set the active instance used by all static proxy methods. */
    public static setCurrent(g: GlobalBindGroup): void {
        this._current = g;
    }

    /** The currently active GlobalBindGroup instance. */
    public static get current(): GlobalBindGroup {
        return this._current;
    }

    // ── Static backward-compat proxies ───────────────────────────────────────

    /** @deprecated Use engine.globalBindGroup.modelMatrixBindGroup instead. */
    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return this._current?.modelMatrixBindGroup;
    }

    /**
     * Initialise a new default instance and set it as current.
     * Safe to call once; subsequent calls are no-ops.
     * @deprecated Use Engine3D to manage GlobalBindGroup lifecycle.
     */
    public static init(): void {
        if (!this._current) {
            this._current = new GlobalBindGroup();
        }
        this._current.init();
    }

    public static getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return this._current?.getAllCameraGroup();
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        return this._current?.getCameraGroup(camera);
    }

    public static updateCameraGroup(camera: Camera3D): void {
        this._current?.updateCameraGroup(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        return this._current?.getLightEntries(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return this._current?.getReflectionEntries(scene);
    }

    // ── Per-instance state ───────────────────────────────────────────────────

    public modelMatrixBindGroup: MatrixBindGroup;
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;

    // ── Instance methods ─────────────────────────────────────────────────────

    public init(): void {
        this.modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    public getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
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

    public updateCameraGroup(camera: Camera3D): void {
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
}
