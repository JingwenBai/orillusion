import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';
/**
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    // Per-instance maps (keyed by Scene3D — already per-engine since engines use different scenes)
    public directionLightList: Map<Scene3D, ILight[]> = new Map();
    public pointLightList: Map<Scene3D, ILight[]> = new Map();
    public shadowLights: Map<Scene3D, Float32Array> = new Map();

    private static _active: ShadowLightsCollect;

    public static setActive(instance: ShadowLightsCollect) {
        this._active = instance;
    }

    public static init() {
        if (!this._active) {
            this._active = new ShadowLightsCollect();
        }
        this._active.directionLightList = new Map<Scene3D, ILight[]>();
        this._active.pointLightList = new Map<Scene3D, ILight[]>();
        this._active.shadowLights = new Map<Scene3D, Float32Array>();
    }

    public static createBuffer(view: View3D) {
        if (!this._active.shadowLights.has(view.scene)) {
            let list = new Float32Array(16);
            this._active.shadowLights.set(view.scene, list);
        }
    }

    static getShadowLightList(light: ILight) {
        if (!light.transform.view3D) return null;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this._active.directionLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                this._active.directionLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        } else if (light.lightData.lightType == LightType.PointLight) {
            let list = this._active.pointLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                this._active.pointLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        } else if (light.lightData.lightType == LightType.SpotLight) {
            let list = this._active.pointLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                this._active.pointLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        }
    }

    static getShadowLightWhichScene(scene: Scene3D, type: LightType) {
        if (type == LightType.DirectionLight) {
            let list = this._active.directionLightList.get(scene);
            if (!list) {
                list = [];
                this._active.directionLightList.set(scene, list);
            }
            return list;
        } else if (type == LightType.PointLight) {
            let list = this._active.pointLightList.get(scene);
            if (!list) {
                list = [];
                this._active.pointLightList.set(scene, list);
            }
            return list;
        }
    }

    static getDirectShadowLightWhichScene(scene: Scene3D) {
        let list = this._active.directionLightList.get(scene);
        if (!list) {
            list = [];
            this._active.directionLightList.set(scene, list);
        }
        return list;
    }

    static getPointShadowLightWhichScene(scene: Scene3D) {
        let list = this._active.pointLightList.get(scene);
        if (!list) {
            list = [];
            this._active.pointLightList.set(scene, list);
        }
        return list;
    }

    static addShadowLight(light: ILight) {
        if (!light.transform.view3D) return null;
        let scene = light.transform.view3D.scene;

        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this._active.directionLightList.get(scene);
            if (!list) {
                list = [];
                this._active.directionLightList.set(scene, list);
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
            let list = this._active.pointLightList.get(scene);
            if (list && list.length >= 8) {
                return list;
            }
            if (!list) {
                list = [];
                this._active.pointLightList.set(scene, list);
            }
            if (list.indexOf(light) == -1) {
                list.push(light);
            }
            return list;
        }
    }

    public static removeShadowLight(light: ILight) {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this._active.directionLightList.get(light.transform.view3D.scene);
            if (list) {
                let index = list.indexOf(light);
                if (index != -1) {
                    list.splice(index, 1);
                }
            }
            light.lightData.castShadowIndex = -1;
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = this._active.pointLightList.get(light.transform.view3D.scene);
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

        let shadowLights = this._active.shadowLights.get(view.scene);
        let directionLightList = this._active.directionLightList.get(view.scene);
        let pointLightList = this._active.pointLightList.get(view.scene);

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
