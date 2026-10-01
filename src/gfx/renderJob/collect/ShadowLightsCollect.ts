import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { EngineContext } from '../../../core/EngineContext';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';

/**
 * @internal
 * Per-engine shadow-light registry.
 *
 * Static constants (maxNum*) are process-wide.
 * All Map-based state is per-engine instance; static proxy methods
 * route to `EngineContext.getCurrent()?.shadowLightsCollect`.
 * @group Lights
 */
export class ShadowLightsCollect {

    // ---- process-wide constants ---- //
    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    // ---- static proxy init (called from Engine3D.init) ---- //
    public static init() {
        EngineContext.getCurrent()?.shadowLightsCollect._init();
    }

    // ---- static proxy methods ---- //
    public static createBuffer(view: View3D) {
        _resolveForView(view)?.createBuffer(view);
    }

    public static getShadowLightList(light: ILight): ILight[] | null {
        return _resolveForLight(light)?.getShadowLightList(light) ?? null;
    }

    public static getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        return _resolveForScene(scene)?.getShadowLightWhichScene(scene, type) ?? [];
    }

    public static getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return _resolveForScene(scene)?.getDirectShadowLightWhichScene(scene) ?? [];
    }

    public static getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return _resolveForScene(scene)?.getPointShadowLightWhichScene(scene) ?? [];
    }

    public static addShadowLight(light: ILight): ILight[] | null {
        return _resolveForLight(light)?.addShadowLight(light) ?? null;
    }

    public static removeShadowLight(light: ILight): ILight[] | null {
        return _resolveForLight(light)?.removeShadowLight(light) ?? null;
    }

    public static update(view: View3D) {
        _resolveForView(view)?.update(view);
    }

    // ---- instance data ---- //
    public directionLightList: Map<Scene3D, ILight[]>;
    public pointLightList: Map<Scene3D, ILight[]>;
    public shadowLights: Map<Scene3D, Float32Array>;

    private _initDone: boolean = false;

    public _init() {
        if (!this._initDone) {
            this._initDone = true;
            this.directionLightList = new Map();
            this.pointLightList = new Map();
            this.shadowLights = new Map();
        }
    }

    // ---- instance methods ---- //

    public createBuffer(view: View3D) {
        this._init();
        if (!this.shadowLights.has(view.scene)) {
            this.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    public getShadowLightList(light: ILight): ILight[] | null {
        this._init();
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        if (light.lightData.lightType === LightType.DirectionLight) {
            return this._ensureList(this.directionLightList, scene);
        } else {
            return this._ensureList(this.pointLightList, scene);
        }
    }

    public getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        this._init();
        if (type === LightType.DirectionLight) return this._ensureList(this.directionLightList, scene);
        return this._ensureList(this.pointLightList, scene);
    }

    public getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        this._init();
        return this._ensureList(this.directionLightList, scene);
    }

    public getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        this._init();
        return this._ensureList(this.pointLightList, scene);
    }

    public addShadowLight(light: ILight): ILight[] | null {
        this._init();
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;

        if (light.lightData.lightType === LightType.DirectionLight) {
            const list = this._ensureList(this.directionLightList, scene);
            if (!light.shadowCamera) {
                light.shadowCamera = CameraUtil.createCamera3DObject(null, 'shadowCamera');
                light.shadowCamera.isShadowCamera = true;
                const b = -1000;
                light.shadowCamera.orthoOffCenter(b, -b, b, -b, 1, 10000);
            }
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        } else if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            const list = this._ensureList(this.pointLightList, scene);
            if (list.length >= 8) return list;
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        }
        return null;
    }

    public removeShadowLight(light: ILight): ILight[] | null {
        this._init();
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;

        if (light.lightData.lightType === LightType.DirectionLight) {
            const list = this.directionLightList.get(scene);
            if (list) {
                const i = list.indexOf(light);
                if (i !== -1) list.splice(i, 1);
                light.lightData.castShadowIndex = -1;
                return list;
            }
        } else if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            const list = this.pointLightList.get(scene);
            if (list) {
                const i = list.indexOf(light);
                if (i !== -1) list.splice(i, 1);
                light.lightData.castShadowIndex = -1;
                return list;
            }
        }
        return null;
    }

    public update(view: View3D) {
        this._init();
        const shadowLights = this.shadowLights.get(view.scene);
        if (!shadowLights) return;

        const directionLightList = this.directionLightList.get(view.scene);
        const pointLightList = this.pointLightList.get(view.scene);

        let nDirShadowStart = 0;
        let nDirShadowEnd = 0;
        let nPointShadowStart = 0;
        let nPointShadowEnd = 0;
        shadowLights.fill(0);

        if (directionLightList) {
            let j = 0;
            for (let i = 0; i < directionLightList.length; i++) {
                const light = directionLightList[i];
                shadowLights[i] = light.lightData.index;
                light.lightData.castShadowIndex = j++;
            }
            nDirShadowEnd = directionLightList.length;
        }

        if (pointLightList) {
            nPointShadowStart = nDirShadowEnd;
            let j = 0;
            for (let i = nPointShadowStart; i < pointLightList.length; i++) {
                const light = pointLightList[i];
                shadowLights[i] = light.lightData.index;
                light.lightData.castShadowIndex = j++;
            }
            nPointShadowEnd = nPointShadowStart + pointLightList.length;
        }

        // Update only THIS engine's camera groups.
        const ctx = (view as any).engineContext as EngineContext | undefined;
        const cameraGroup = ctx?.globalBindGroup?.getAllCameraGroup()
            ?? GlobalBindGroup.getAllCameraGroup();

        cameraGroup.forEach((group: GlobalUniformGroup) => {
            group.dirShadowStart = nDirShadowStart;
            group.dirShadowEnd = nDirShadowEnd;
            group.pointShadowStart = nPointShadowStart;
            group.pointShadowEnd = nPointShadowEnd;
            group.shadowLights = shadowLights;
        });
    }

    private _ensureList(map: Map<Scene3D, ILight[]>, scene: Scene3D): ILight[] {
        let list = map.get(scene);
        if (!list) {
            list = [];
            map.set(scene, list);
        }
        return list;
    }
}

// ---- routing helpers ---- //
function _resolveForView(view: View3D): ShadowLightsCollect | null {
    return (view as any)?.engineContext?.shadowLightsCollect
        ?? EngineContext.getCurrent()?.shadowLightsCollect
        ?? null;
}
function _resolveForLight(light: ILight): ShadowLightsCollect | null {
    return _resolveForView(light?.transform?.view3D);
}
function _resolveForScene(scene: Scene3D): ShadowLightsCollect | null {
    return _resolveForView((scene?.view as any));
}
