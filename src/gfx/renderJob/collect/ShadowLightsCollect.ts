import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';

/**
 * @internal
 * Per-engine shadow light collection.
 * @group Lights
 */
export class ShadowLightsCollect {

    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    public directionLightList: Map<Scene3D, ILight[]>;
    public pointLightList: Map<Scene3D, ILight[]>;
    public shadowLights: Map<Scene3D, Float32Array>;

    private _globalBindGroup: GlobalBindGroup;

    constructor(globalBindGroup: GlobalBindGroup) {
        this._globalBindGroup = globalBindGroup;
        this.directionLightList = new Map<Scene3D, ILight[]>();
        this.pointLightList = new Map<Scene3D, ILight[]>();
        this.shadowLights = new Map<Scene3D, Float32Array>();
    }

    /** @internal @deprecated Use new ShadowLightsCollect(globalBindGroup) */
    public static init() {
        /* no-op: EngineInstance creates its own ShadowLightsCollect instance */
    }

    // ===== INSTANCE METHODS =====

    public createBufferInternal(view: View3D) {
        if (!this.shadowLights.has(view.scene)) {
            this.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    public getShadowLightListInternal(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        return this._getOrCreateList(light.lightData.lightType, scene);
    }

    public getShadowLightWhichSceneInternal(scene: Scene3D, type: LightType): ILight[] {
        return this._getOrCreateList(type, scene);
    }

    public getDirectShadowLightWhichSceneInternal(scene: Scene3D): ILight[] {
        return this._getOrCreateList(LightType.DirectionLight, scene);
    }

    public getPointShadowLightWhichSceneInternal(scene: Scene3D): ILight[] {
        return this._getOrCreateList(LightType.PointLight, scene);
    }

    public addShadowLightInternal(light: ILight, engine?: any): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;

        if (light.lightData.lightType === LightType.DirectionLight) {
            let list = this._getOrCreateList(LightType.DirectionLight, scene);
            if (!light.shadowCamera) {
                light.shadowCamera = CameraUtil.createCamera3DObject(null, 'shadowCamera');
                light.shadowCamera.isShadowCamera = true;
                if (engine) (light.shadowCamera as any).engine = engine;
                const shadowBound = -1000;
                light.shadowCamera.orthoOffCenter(shadowBound, -shadowBound, shadowBound, -shadowBound, 1, 10000);
            }
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        } else if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            let list = this._getOrCreateList(LightType.PointLight, scene);
            if (list && list.length >= 8) return list;
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        }
        return null;
    }

    public removeShadowLightInternal(light: ILight): ILight[] | null {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;

        if (light.lightData.lightType === LightType.DirectionLight) {
            const list = this.directionLightList.get(scene);
            if (list) {
                const idx = list.indexOf(light);
                if (idx !== -1) list.splice(idx, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list ?? null;
        } else if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            const list = this.pointLightList.get(scene);
            if (list) {
                const idx = list.indexOf(light);
                if (idx !== -1) list.splice(idx, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list ?? null;
        }
        return null;
    }

    public updateInternal(view: View3D) {
        if (!this.shadowLights.has(view.scene)) {
            this.shadowLights.set(view.scene, new Float32Array(16));
        }
        let shadowLights = this.shadowLights.get(view.scene);
        let directionLightList = this.directionLightList.get(view.scene);
        let pointLightList = this.pointLightList.get(view.scene);

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

        const cameraGroup = this._globalBindGroup.getAllCameraGroupInternal();
        cameraGroup.forEach((group: GlobalUniformGroup) => {
            group.dirShadowStart = nDirShadowStart;
            group.dirShadowEnd = nDirShadowEnd;
            group.pointShadowStart = nPointShadowStart;
            group.pointShadowEnd = nPointShadowEnd;
            group.shadowLights = shadowLights as any;
        });
    }

    private _getOrCreateList(type: LightType, scene: Scene3D): ILight[] {
        const map = (type === LightType.DirectionLight) ? this.directionLightList : this.pointLightList;
        let list = map.get(scene);
        if (!list) {
            list = [];
            map.set(scene, list);
        }
        return list;
    }

    // ===== STATIC SHIMS (backward compat, route through view/light engine reference) =====

    public static createBuffer(view: View3D) {
        _collectFromView(view)?.createBufferInternal(view);
    }

    static getShadowLightList(light: ILight): ILight[] | null {
        return _collectFromLight(light)?.getShadowLightListInternal(light) ?? null;
    }

    static getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        return _collectFromScene(scene)?.getShadowLightWhichSceneInternal(scene, type) ?? [];
    }

    static getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return _collectFromScene(scene)?.getDirectShadowLightWhichSceneInternal(scene) ?? [];
    }

    static getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return _collectFromScene(scene)?.getPointShadowLightWhichSceneInternal(scene) ?? [];
    }

    static addShadowLight(light: ILight): ILight[] | null {
        const engine: any = (light.transform.view3D as any)?.engine;
        return _collectFromLight(light)?.addShadowLightInternal(light, engine) ?? null;
    }

    public static removeShadowLight(light: ILight): ILight[] | null {
        return _collectFromLight(light)?.removeShadowLightInternal(light) ?? null;
    }

    public static update(view: View3D) {
        _collectFromView(view)?.updateInternal(view);
    }
}

function _collectFromView(view: View3D): ShadowLightsCollect | null {
    return (view as any)?.engine?.shadowLightsCollect ?? null;
}

function _collectFromScene(scene: Scene3D): ShadowLightsCollect | null {
    return (scene?.view as any)?.engine?.shadowLightsCollect ?? null;
}

function _collectFromLight(light: ILight): ShadowLightsCollect | null {
    return _collectFromView(light.transform.view3D);
}
