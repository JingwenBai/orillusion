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

    // =========================================================
    // Instance state
    // =========================================================

    public maxNumDirectionShadow: number = 8;
    public maxNumPointShadow: number = 8;

    public directionLightList: Map<Scene3D, ILight[]> = new Map();
    public pointLightList: Map<Scene3D, ILight[]> = new Map();
    public shadowLights: Map<Scene3D, Float32Array> = new Map();

    public createBuffer_instance(view: View3D) {
        if (!this.shadowLights.has(view.scene)) {
            this.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    public getShadowLightList_instance(light: ILight) {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (!list) { list = []; this.directionLightList.set(scene, list); }
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = this.pointLightList.get(scene);
            if (!list) { list = []; this.pointLightList.set(scene, list); }
            return list;
        }
    }

    public getShadowLightWhichScene_instance(scene: Scene3D, type: LightType) {
        if (type == LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (!list) { list = []; this.directionLightList.set(scene, list); }
            return list;
        } else if (type == LightType.PointLight) {
            let list = this.pointLightList.get(scene);
            if (!list) { list = []; this.pointLightList.set(scene, list); }
            return list;
        }
    }

    public getDirectShadowLightWhichScene_instance(scene: Scene3D) {
        let list = this.directionLightList.get(scene);
        if (!list) { list = []; this.directionLightList.set(scene, list); }
        return list;
    }

    public getPointShadowLightWhichScene_instance(scene: Scene3D) {
        let list = this.pointLightList.get(scene);
        if (!list) { list = []; this.pointLightList.set(scene, list); }
        return list;
    }

    public addShadowLight_instance(light: ILight) {
        if (!light.transform.view3D) return null;
        let scene = light.transform.view3D.scene;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (!list) { list = []; this.directionLightList.set(scene, list); }
            if (!light.shadowCamera) {
                light.shadowCamera = CameraUtil.createCamera3DObject(null, 'shadowCamera');
                light.shadowCamera.isShadowCamera = true;
                let shadowBound = -1000;
                light.shadowCamera.orthoOffCenter(shadowBound, -shadowBound, shadowBound, -shadowBound, 1, 10000);
            }
            if (list.indexOf(light) == -1) list.push(light);
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = this.pointLightList.get(scene);
            if (list && list.length >= 8) return list;
            if (!list) { list = []; this.pointLightList.set(scene, list); }
            if (list.indexOf(light) == -1) list.push(light);
            return list;
        }
    }

    public removeShadowLight_instance(light: ILight) {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this.directionLightList.get(light.transform.view3D.scene);
            if (list) {
                let index = list.indexOf(light);
                if (index != -1) list.splice(index, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = this.pointLightList.get(light.transform.view3D.scene);
            if (list) {
                let index = list.indexOf(light);
                if (index != -1) list.splice(index, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        }
    }

    public update_instance(view: View3D) {
        let shadowLights = this.shadowLights.get(view.scene);
        let directionLightList = this.directionLightList.get(view.scene);
        let pointLightList = this.pointLightList.get(view.scene);

        let nDirShadowStart = 0, nDirShadowEnd = 0, nPointShadowStart = 0, nPointShadowEnd = 0;
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

    // =========================================================
    // Static delegation to the currently-active instance
    // =========================================================

    private static _current: ShadowLightsCollect = new ShadowLightsCollect();

    public static setCurrent(instance: ShadowLightsCollect) {
        ShadowLightsCollect._current = instance;
    }

    public static get maxNumDirectionShadow() { return ShadowLightsCollect._current.maxNumDirectionShadow; }
    public static get maxNumPointShadow() { return ShadowLightsCollect._current.maxNumPointShadow; }
    public static get directionLightList() { return ShadowLightsCollect._current.directionLightList; }
    public static get pointLightList() { return ShadowLightsCollect._current.pointLightList; }
    public static get shadowLights() { return ShadowLightsCollect._current.shadowLights; }

    public static init() {
        ShadowLightsCollect._current = new ShadowLightsCollect();
    }

    public static createBuffer(view: View3D) {
        ShadowLightsCollect._current.createBuffer_instance(view);
    }

    public static getShadowLightList(light: ILight) {
        return ShadowLightsCollect._current.getShadowLightList_instance(light);
    }

    public static getShadowLightWhichScene(scene: Scene3D, type: LightType) {
        return ShadowLightsCollect._current.getShadowLightWhichScene_instance(scene, type);
    }

    public static getDirectShadowLightWhichScene(scene: Scene3D) {
        return ShadowLightsCollect._current.getDirectShadowLightWhichScene_instance(scene);
    }

    public static getPointShadowLightWhichScene(scene: Scene3D) {
        return ShadowLightsCollect._current.getPointShadowLightWhichScene_instance(scene);
    }

    public static addShadowLight(light: ILight) {
        return ShadowLightsCollect._current.addShadowLight_instance(light);
    }

    public static removeShadowLight(light: ILight) {
        return ShadowLightsCollect._current.removeShadowLight_instance(light);
    }

    public static update(view: View3D) {
        return ShadowLightsCollect._current.update_instance(view);
    }
}
