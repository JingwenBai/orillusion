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
    public modelMatrixBindGroup: MatrixBindGroup;
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;

    constructor() {
        this._cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    private static _active: GlobalBindGroup = new GlobalBindGroup();

    public static activate(instance: GlobalBindGroup): void {
        GlobalBindGroup._active = instance;
    }

    /** @deprecated Use activate() for multi-instance; kept for single-instance backward compat */
    public static init(): void {
        const inst = new GlobalBindGroup();
        inst.modelMatrixBindGroup = new MatrixBindGroup();
        GlobalBindGroup._active = inst;
    }

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return GlobalBindGroup._active.modelMatrixBindGroup;
    }

    public static getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return GlobalBindGroup._active._cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        const inst = GlobalBindGroup._active;
        let cameraBindGroup = inst._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(inst.modelMatrixBindGroup);
            inst._cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
        return cameraBindGroup;
    }

    public static updateCameraGroup(camera: Camera3D): void {
        const inst = GlobalBindGroup._active;
        let cameraBindGroup = inst._cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(inst.modelMatrixBindGroup);
            inst._cameraBindGroups.set(camera, cameraBindGroup);
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
        const inst = GlobalBindGroup._active;
        let lightEntries = inst._lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            inst._lightEntriesMap.set(scene, lightEntries);
        }
        return inst._lightEntriesMap.get(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) {
            console.log(`getReflectionEntries scene is null`);
        }
        const inst = GlobalBindGroup._active;
        let reflectionEntries = inst._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            inst._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return inst._reflectionEntriesMap.get(scene);
    }
}
