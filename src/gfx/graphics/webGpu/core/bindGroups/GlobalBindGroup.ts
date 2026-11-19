import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";
import { EngineRegistry } from "../../../../../util/EngineRegistry";

/**
 * GlobalBindGroup manages per-camera and per-scene GPU bind groups.
 *
 * In multi-instance mode each Engine3D owns a GlobalBindGroup instance.
 * Static methods route to the correct instance via EngineRegistry so all
 * existing callers (shaders, renderers, post-processing) work unchanged.
 * @internal
 * @group GFX
 */
export class GlobalBindGroup {

    // --- Per-instance state ---
    public cameraBindGroups: Map<Camera3D, GlobalUniformGroup> = new Map();
    public lightEntriesMap: Map<Scene3D, LightEntries> = new Map();
    public reflectionEntriesMap: Map<Scene3D, ReflectionEntries> = new Map();
    public modelMatrixBindGroup: MatrixBindGroup;

    // --- Global fallback for single-instance backward compat ---
    private static _default: GlobalBindGroup = new GlobalBindGroup();

    private static _get(): GlobalBindGroup {
        return EngineRegistry.active?.globalBindGroup ?? GlobalBindGroup._default;
    }

    // --- Static init (called by Engine3D.init) ---
    public static init() {
        const inst = GlobalBindGroup._get();
        inst.modelMatrixBindGroup = new MatrixBindGroup();
        inst.cameraBindGroups = new Map();
        inst.lightEntriesMap = new Map();
        inst.reflectionEntriesMap = new Map();
    }

    public static getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return GlobalBindGroup._get().cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        const inst = GlobalBindGroup._getByCamera(camera);
        let cameraBindGroup = inst.cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(inst.modelMatrixBindGroup);
            inst.cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
        return cameraBindGroup;
    }

    public static updateCameraGroup(camera: Camera3D): void {
        const inst = GlobalBindGroup._getByCamera(camera);
        let cameraBindGroup = inst.cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(inst.modelMatrixBindGroup);
            inst.cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        if (!scene) console.log(`getLightEntries scene is null`);
        const inst = GlobalBindGroup._getByScene(scene);
        let lightEntries = inst.lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            inst.lightEntriesMap.set(scene, lightEntries);
        }
        return inst.lightEntriesMap.get(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) console.log(`getReflectionEntries scene is null`);
        const inst = GlobalBindGroup._getByScene(scene);
        let reflectionEntries = inst.reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            inst.reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return inst.reflectionEntriesMap.get(scene);
    }

    // modelMatrixBindGroup forwarded through the active instance
    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return GlobalBindGroup._get().modelMatrixBindGroup;
    }

    private static _getByCamera(camera: Camera3D): GlobalBindGroup {
        // Find engine from camera's scene via transform chain
        const view = camera?.transform?.scene3D?.view;
        if (view) {
            const ctx = EngineRegistry.getByView(view);
            if (ctx?.globalBindGroup) return ctx.globalBindGroup;
        }
        return GlobalBindGroup._get();
    }

    private static _getByScene(scene: Scene3D): GlobalBindGroup {
        if (scene?.view) {
            const ctx = EngineRegistry.getByView(scene.view);
            if (ctx?.globalBindGroup) return ctx.globalBindGroup;
        }
        return GlobalBindGroup._get();
    }
}
