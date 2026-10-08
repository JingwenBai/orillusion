import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * @internal
 * Use Global DO Matrix ArrayBuffer Descriptor
 * @group GFX
 */
export class GlobalBindGroup {
    // ---- per-engine instance state ----
    public modelMatrixBindGroup: MatrixBindGroup;
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup> = new Map();
    private _lightEntriesMap: Map<Scene3D, LightEntries> = new Map();
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries> = new Map();

    // ---- active instance (set by Engine3D before each frame) ----
    private static _current: GlobalBindGroup | null = null;

    /**
     * Activate an engine's GlobalBindGroup as the current context.
     * @internal
     */
    public static activate(instance: GlobalBindGroup): void {
        this._current = instance;
    }

    // ---- static delegation API (backward compatible) ----

    public static init() {
        // init is now handled per-engine in the constructor; kept for compatibility
        if (!this._current) return;
        this._current.initInstance();
    }

    public static getAllCameraGroup() {
        return this._current?._cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D) {
        return this._current?.getCameraGroupImpl(camera);
    }

    public static updateCameraGroup(camera: Camera3D) {
        this._current?.updateCameraGroupImpl(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        return this._current?.getLightEntriesImpl(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return this._current?.getReflectionEntriesImpl(scene);
    }

    // Static accessor for the model matrix bind group (shared across all views in one engine)
    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return this._current?.modelMatrixBindGroup;
    }

    // ---- constructor ----
    constructor() {
        // initInstance() must be called explicitly after the GPU device is ready
    }

    // ---- instance methods ----

    public initInstance(): void {
        this.modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    public getAllCameraGroupInstance() {
        return this._cameraBindGroups;
    }

    public getCameraGroupImpl(camera: Camera3D): GlobalUniformGroup {
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

    public updateCameraGroupImpl(camera: Camera3D): void {
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

    public getLightEntriesImpl(scene: Scene3D): LightEntries {
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

    public getReflectionEntriesImpl(scene: Scene3D): ReflectionEntries {
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
