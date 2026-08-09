import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { getActiveEngineContext } from "../../../../../EngineRegistry";
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
    private static get _cameraBindGroups(): Map<Camera3D, GlobalUniformGroup> {
        return getActiveEngineContext().cameraBindGroups;
    }

    private static get _lightEntriesMap(): Map<Scene3D, LightEntries> {
        return getActiveEngineContext().lightEntriesMap;
    }

    private static get _reflectionEntriesMap(): Map<Scene3D, ReflectionEntries> {
        return getActiveEngineContext().reflectionEntriesMap;
    }

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return getActiveEngineContext().modelMatrixBindGroup;
    }

    public static set modelMatrixBindGroup(v: MatrixBindGroup) {
        getActiveEngineContext().modelMatrixBindGroup = v;
    }

    public static init() {
        const ctx = getActiveEngineContext();
        ctx.modelMatrixBindGroup = new MatrixBindGroup();
        ctx.cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        ctx.lightEntriesMap = new Map<Scene3D, LightEntries>();
        ctx.reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    public static getAllCameraGroup() {
        return this._cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D) {
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

    public static updateCameraGroup(camera: Camera3D) {
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

    public static getLightEntries(scene: Scene3D): LightEntries {
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

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) {
            console.log(`getLightEntries scene is null`);
        }

        let reflectionEntries = this._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return this._reflectionEntriesMap.get(scene);
    }
}
