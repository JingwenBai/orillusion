import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * Per-engine global bind-group state (camera groups, light entries, matrix
 * buffer). Each Engine3D instance owns one of these; the static accessors
 * always delegate to the currently active instance so existing code that
 * calls `GlobalBindGroup.getCameraGroup(...)` etc. continues to work.
 *
 * @internal
 * @group GFX
 */
export class GlobalBindGroup {

    // --- INSTANCE DATA ---

    public modelMatrixBindGroup: MatrixBindGroup;
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;

    /**
     * Initialise GPU resources. Must be called after the WebGPU device is
     * ready (i.e. after Context3D.init() completes and setActiveGPUContext()
     * has been called).
     */
    constructor() {
        this.modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    // --- ACTIVE INSTANCE TRACKING ---

    private static _active: GlobalBindGroup | null = null;

    /** Switch the active per-engine instance. Called by Engine3D._activate(). */
    public static setActive(gbg: GlobalBindGroup): void {
        GlobalBindGroup._active = gbg;
    }

    // --- STATIC ACCESSORS / METHODS (delegate to active instance) ---

    /** @internal */
    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return GlobalBindGroup._active!.modelMatrixBindGroup;
    }
    public static set modelMatrixBindGroup(v: MatrixBindGroup) {
        GlobalBindGroup._active!.modelMatrixBindGroup = v;
    }

    /** @internal */
    public static getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return GlobalBindGroup._active!._cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        const active = GlobalBindGroup._active!;
        let cameraBindGroup = active._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(active.modelMatrixBindGroup);
            active._cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
        return cameraBindGroup;
    }

    public static updateCameraGroup(camera: Camera3D): void {
        const active = GlobalBindGroup._active!;
        let cameraBindGroup = active._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(active.modelMatrixBindGroup);
            active._cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        if (!scene) {
            console.log(`getLightEntries scene is null`);
        }
        const active = GlobalBindGroup._active!;
        let lightEntries = active._lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            active._lightEntriesMap.set(scene, lightEntries);
        }
        return active._lightEntriesMap.get(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) {
            console.log(`getReflectionEntries scene is null`);
        }
        const active = GlobalBindGroup._active!;
        let reflectionEntries = active._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            active._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return active._reflectionEntriesMap.get(scene);
    }

    /** @deprecated Use the instance constructor instead. Kept for compatibility. */
    public static init(): void {
        // No-op: resources are initialised in the constructor.
        // Engine3D calls new GlobalBindGroup() after the GPU context is ready.
    }
}
