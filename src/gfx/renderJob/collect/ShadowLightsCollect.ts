import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { EngineContext } from '../../../core/EngineContext';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';

interface ShadowLightsData {
    directionLightList: Map<Scene3D, ILight[]>;
    pointLightList: Map<Scene3D, ILight[]>;
    shadowLights: Map<Scene3D, Float32Array>;
}

/**
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    private static _store = new Map<any, ShadowLightsData>();

    private static get _data(): ShadowLightsData {
        return this._store.get(EngineContext.current);
    }

    public static get directionLightList(): Map<Scene3D, ILight[]> {
        return this._data?.directionLightList;
    }

    public static get pointLightList(): Map<Scene3D, ILight[]> {
        return this._data?.pointLightList;
    }

    public static get shadowLights(): Map<Scene3D, Float32Array> {
        return this._data?.shadowLights;
    }

    public static init() {
        this._store.set(EngineContext.current, {
            directionLightList: new Map<Scene3D, ILight[]>(),
            pointLightList: new Map<Scene3D, ILight[]>(),
            shadowLights: new Map<Scene3D, Float32Array>(),
        });
    }

    public static createBuffer(view: View3D) {
        const data = this._data;
        if (!data) return;
        if (!data.shadowLights.has(view.scene)) {
            let list = new Float32Array(16);
            data.shadowLights.set(view.scene, list);
        }
    }

    static getShadowLightList(light: ILight) {
        const data = this._data;
        if (!data || !light.transform.view3D) return null;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = data.directionLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                data.directionLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        } else if (light.lightData.lightType == LightType.PointLight) {
            let list = data.pointLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                data.pointLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        } else if (light.lightData.lightType == LightType.SpotLight) {
            let list = data.pointLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                data.pointLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        }
    }

    static getShadowLightWhichScene(scene: Scene3D, type: LightType) {
        const data = this._data;
        if (!data) return null;
        if (type == LightType.DirectionLight) {
            let list = data.directionLightList.get(scene);
            if (!list) {
                list = [];
                data.directionLightList.set(scene, list);
            }
            return list;
        } else if (type == LightType.PointLight) {
            let list = data.pointLightList.get(scene);
            if (!list) {
                list = [];
                data.pointLightList.set(scene, list);
            }
            return list;
        }
    }

    static getDirectShadowLightWhichScene(scene: Scene3D) {
        const data = this._data;
        if (!data) return null;
        let list = data.directionLightList.get(scene);
        if (!list) {
            list = [];
            data.directionLightList.set(scene, list);
        }
        return list;
    }

    static getPointShadowLightWhichScene(scene: Scene3D) {
        const data = this._data;
        if (!data) return null;
        let list = data.pointLightList.get(scene);
        if (!list) {
            list = [];
            data.pointLightList.set(scene, list);
        }
        return list;
    }

    static addShadowLight(light: ILight) {
        const data = this._data;
        if (!data || !light.transform.view3D) return null;
        let scene = light.transform.view3D.scene;

        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = data.directionLightList.get(scene);
            if (!list) {
                list = [];
                data.directionLightList.set(scene, list);
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
            let list = data.pointLightList.get(scene);
            if (list && list.length >= 8) {
                return list;
            }
            if (!list) {
                list = [];
                data.pointLightList.set(scene, list);
            }
            if (list.indexOf(light) == -1) {
                list.push(light);
            }
            return list;
        }
    }

    public static removeShadowLight(light: ILight) {
        const data = this._data;
        light.lightData.castShadowIndex = -1;
        if (!data || !light.transform.view3D) return null;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = data.directionLightList.get(light.transform.view3D.scene);
            if (list) {
                let index = list.indexOf(light);
                if (index != -1) {
                    list.splice(index, 1);
                }
            }
            light.lightData.castShadowIndex = -1;
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = data.pointLightList.get(light.transform.view3D.scene);
            if (list) {
                let index = list.indexOf(light);
                if (index != -1) {
                    list.splice(index, 1);
                }
            }
            light.lightData.castShadowIndex = -1;
            return list;
        }
    }


    public static update(view: View3D) {
        const data = this._data;
        if (!data) return;

        let shadowLights = data.shadowLights.get(view.scene);
        let directionLightList = data.directionLightList.get(view.scene);
        let pointLightList = data.pointLightList.get(view.scene);

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
