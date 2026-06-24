import { Camera3D } from "../../../../../core/Camera3D";
import { EngineContext } from "../../../../../core/EngineContext";
import { Scene3D } from "../../../../../core/Scene3D";
import { GlobalUniformGroup } from "./GlobalUniformGroup";
import { LightEntries } from "./groups/LightEntries";
import { ReflectionEntries } from "./groups/ReflectionEntries";
import { MatrixBindGroup } from "./MatrixBindGroup";

/**
 * Per-engine bind group state.
 * @internal
 */
export class GlobalBindGroupInstance {
    public modelMatrixBindGroup: MatrixBindGroup;
    private _cameraBindGroups: Map<Camera3D, GlobalUniformGroup>;
    private _lightEntriesMap: Map<Scene3D, LightEntries>;
    private _reflectionEntriesMap: Map<Scene3D, ReflectionEntries>;

    public init() {
        this.modelMatrixBindGroup = new MatrixBindGroup();
        this._cameraBindGroups = new Map();
        this._lightEntriesMap = new Map();
        this._reflectionEntriesMap = new Map();
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
        let lightEntries = this._lightEntriesMap.get(scene);
        if (!lightEntries) {
            lightEntries = new LightEntries();
            this._lightEntriesMap.set(scene, lightEntries);
        }
        return lightEntries;
    }

    public getReflectionEntries(scene: Scene3D): ReflectionEntries {
        let reflectionEntries = this._reflectionEntriesMap.get(scene);
        if (!reflectionEntries) {
            reflectionEntries = new ReflectionEntries();
            this._reflectionEntriesMap.set(scene, reflectionEntries);
        }
        return reflectionEntries;
    }
}

/**
 * Static API for global bind group management.
 * All calls are routed to the active engine's GlobalBindGroupInstance.
 * @internal
 * @group GFX
 */
export class GlobalBindGroup {

    private static _resolveInstance(hint?: Camera3D | Scene3D): GlobalBindGroupInstance | null {
        if (hint) {
            // Camera3D extends ComponentBase → has .transform.view3D
            if ('transform' in hint) {
                const engine = (hint as Camera3D).transform?.view3D?.engine;
                if (engine?._globalBindGroup) return engine._globalBindGroup;
            }
            // Scene3D has .view
            if ('view' in hint) {
                const engine = (hint as Scene3D).view?.engine;
                if (engine?._globalBindGroup) return engine._globalBindGroup;
            }
        }
        // Fall back to active engine
        return EngineContext.current?._globalBindGroup ?? null;
    }

    public static get modelMatrixBindGroup(): MatrixBindGroup {
        return EngineContext.current?._globalBindGroup?.modelMatrixBindGroup;
    }

    public static init() {
        EngineContext.current?._globalBindGroup?.init();
    }

    public static getAllCameraGroup(): Map<Camera3D, GlobalUniformGroup> {
        return EngineContext.current?._globalBindGroup?.getAllCameraGroup();
    }

    public static getCameraGroup(camera: Camera3D): GlobalUniformGroup {
        return this._resolveInstance(camera)?.getCameraGroup(camera);
    }

    public static updateCameraGroup(camera: Camera3D): void {
        this._resolveInstance(camera)?.updateCameraGroup(camera);
    }

    public static getLightEntries(scene: Scene3D): LightEntries {
        return this._resolveInstance(scene)?.getLightEntries(scene);
    }

    public static getReflectionEntries(scene: Scene3D): ReflectionEntries {
        return this._resolveInstance(scene)?.getReflectionEntries(scene);
    }
}
