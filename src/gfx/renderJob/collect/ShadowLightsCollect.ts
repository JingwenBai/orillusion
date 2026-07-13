import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';

/** @internal Per-engine shadow light tracking state */
export class ShadowLightsCollectState {
    directionLightList: Map<Scene3D, ILight[]> = new Map();
    pointLightList: Map<Scene3D, ILight[]> = new Map();
    shadowLights: Map<Scene3D, Float32Array> = new Map();
}

let _state: ShadowLightsCollectState = new ShadowLightsCollectState();

/** @internal */
export function _createShadowLightsCollectState(): ShadowLightsCollectState { return new ShadowLightsCollectState(); }
/** @internal */
export function _setActiveShadowLightsCollect(s: ShadowLightsCollectState): void { _state = s; }

/**
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    public static get directionLightList(): Map<Scene3D, ILight[]> { return _state.directionLightList; }
    public static get pointLightList(): Map<Scene3D, ILight[]> { return _state.pointLightList; }
    public static get shadowLights(): Map<Scene3D, Float32Array> { return _state.shadowLights; }

    public static init() {
        _state.directionLightList = new Map<Scene3D, ILight[]>();
        _state.pointLightList = new Map<Scene3D, ILight[]>();
        _state.shadowLights = new Map<Scene3D, Float32Array>();
    }

    public static createBuffer(view: View3D) {
        if (!_state.shadowLights.has(view.scene)) {
            let list = new Float32Array(16);
            _state.shadowLights.set(view.scene, list);
        }
    }

    static getShadowLightList(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = _state.directionLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                _state.directionLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        } else if (light.lightData.lightType == LightType.PointLight) {
            let list = _state.pointLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                _state.pointLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        } else if (light.lightData.lightType == LightType.SpotLight) {
            let list = _state.pointLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                _state.pointLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        }
        return null;
    }

    static getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        if (type == LightType.DirectionLight) {
            let list = _state.directionLightList.get(scene);
            if (!list) {
                list = [];
                _state.directionLightList.set(scene, list);
            }
            return list;
        } else if (type == LightType.PointLight) {
            let list = _state.pointLightList.get(scene);
            if (!list) {
                list = [];
                _state.pointLightList.set(scene, list);
            }
            return list;
        }
        return null;
    }

    static getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        let list = _state.directionLightList.get(scene);
        if (!list) {
            list = [];
            _state.directionLightList.set(scene, list);
        }
        return list;
    }

    static getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        let list = _state.pointLightList.get(scene);
        if (!list) {
            list = [];
            _state.pointLightList.set(scene, list);
        }
        return list;
    }

    static addShadowLight(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        let scene = light.transform.view3D.scene;

        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = _state.directionLightList.get(scene);
            if (!list) {
                list = [];
                _state.directionLightList.set(scene, list);
            }
            if (!light.shadowCamera) {
                light.shadowCamera = CameraUtil.createCamera3DObject(null, 'shadowCamera');
                light.shadowCamera.isShadowCamera = true;
                let shadowBound = -1000;
                light.shadowCamera.orthoOffCenter(shadowBound, -shadowBound, shadowBound, -shadowBound, 1, 10000);
            }
            if (list.indexOf(light) == -1) {
                list.push(light);
            }
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = _state.pointLightList.get(scene);
            if (list && list.length >= 8) {
                return list;
            }
            if (!list) {
                list = [];
                _state.pointLightList.set(scene, list);
            }
            if (list.indexOf(light) == -1) {
                list.push(light);
            }
            return list;
        }
        return null;
    }

    public static removeShadowLight(light: ILight): ILight[] | null {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = _state.directionLightList.get(light.transform.view3D.scene);
            if (list) {
                let index = list.indexOf(light);
                if (index != -1) {
                    list.splice(index, 1);
                }
            }
            light.lightData.castShadowIndex = -1;
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = _state.pointLightList.get(light.transform.view3D.scene);
            if (list) {
                let index = list.indexOf(light);
                if (index != -1) {
                    list.splice(index, 1);
                }
            }
            light.lightData.castShadowIndex = -1;
            return list;
        }
        return null;
    }


    public static update(view: View3D) {
        let shadowLights = _state.shadowLights.get(view.scene);
        let directionLightList = _state.directionLightList.get(view.scene);
        let pointLightList = _state.pointLightList.get(view.scene);

        let nDirShadowStart: number = 0;
        let nDirShadowEnd: number = 0;
        let nPointShadowStart: number = 0;
        let nPointShadowEnd: number = 0;
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

        let cameraGroup = GlobalBindGroup.getAllCameraGroup();
        cameraGroup.forEach((group: GlobalUniformGroup) => {
            group.dirShadowStart = nDirShadowStart;
            group.dirShadowEnd = nDirShadowEnd;
            group.pointShadowStart = nPointShadowStart;
            group.pointShadowEnd = nPointShadowEnd;
            group.shadowLights = shadowLights;
        });
    }
}
