import { Camera3D } from "../../../../../core/Camera3D";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * @internal
 * Per-engine instance data for GlobalBindGroup
 */
export class GlobalBindGroupContext {
    cameraBindGroups: Map<Camera3D, GlobalUniformGroup> = new Map();
    lightEntriesMap: Map<Scene3D, LightEntries> = new Map();
    reflectionEntriesMap: Map<Scene3D, ReflectionEntries> = new Map();
    modelMatrixBindGroup: MatrixBindGroup = null;
}

/**
 * @internal
 * Use Global DO Matrix ArrayBuffer Descriptor
 * @group GFX
 */
export class GlobalBindGroup {
    private static _ctx: GlobalBindGroupContext = new GlobalBindGroupContext();

    /**
     * @internal
     * Switch to a different engine instance's context
     */
    public static setContext(ctx: GlobalBindGroupContext) {
        GlobalBindGroup._ctx = ctx;
    }

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return GlobalBindGroup._ctx.modelMatrixBindGroup;
    }

    public static set modelMatrixBindGroup(v: MatrixBindGroup) {
        GlobalBindGroup._ctx.modelMatrixBindGroup = v;
    }

    public static init() {
        this._ctx.modelMatrixBindGroup = new MatrixBindGroup();
        this._ctx.cameraBindGroups = new Map<Camera3D, GlobalUniformGroup>();
        this._ctx.lightEntriesMap = new Map<Scene3D, LightEntries>();
        this._ctx.reflectionEntriesMap = new Map<Scene3D, ReflectionEntries>();
    }

    public static getAllCameraGroup() {
        return this._ctx.cameraBindGroups;
    }

    public static getCameraGroup(camera: Camera3D) {
        let cameraBindGroup = this._ctx.cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(this._ctx.modelMatrixBindGroup);
            this._ctx.cameraBindGroups.set(camera, cameraBindGroup);
        }
        if (camera.isShadowCamera) {
            cameraBindGroup.setShadowCamera(camera);
        } else {
            cameraBindGroup.setCamera(camera);
        }
        return cameraBindGroup;
    }

    public static updateCameraGroup(camera: Camera3D) {
        let cameraBindGroup = this._ctx.cameraBindGroups.get(camera);
        if (!cameraBindGroup) {
            cameraBindGroup = new GlobalUniformGroup(this._ctx.modelMatrixBindGroup);
            this._ctx.cameraBindGroups.set(camera, cameraBindGroup);
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

        let lightEntries = this._ctx.lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            this._ctx.lightEntriesMap.set(scene, lightEntries);
        }
        return this._ctx.lightEntriesMap.get(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        if (!scene) {
            console.log(`getLightEntries scene is null`);
        }

        let reflectionEntries = this._ctx.reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._ctx.reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return this._ctx.reflectionEntriesMap.get(scene);
    }
}
