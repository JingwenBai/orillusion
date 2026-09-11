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

    // ──────────────────────────────────────────────────────────────
    // Per-engine instance data
    // ──────────────────────────────────────────────────────────────

    public directionLightList: Map<Scene3D, ILight[]> = new Map();
    public pointLightList: Map<Scene3D, ILight[]> = new Map();
    public shadowLights: Map<Scene3D, Float32Array> = new Map();

    // ──────────────────────────────────────────────────────────────
    // Active-instance management (set by Engine3D)
    // ──────────────────────────────────────────────────────────────

    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    /** @internal – currently active per-engine collect; set by Engine3D */
    public static _active: ShadowLightsCollect = new ShadowLightsCollect();

    // ──────────────────────────────────────────────────────────────
    // Static property accessors (backward-compat: delegate to _active)
    // ──────────────────────────────────────────────────────────────

    /** @internal */
    public static get directionLightList() { return ShadowLightsCollect._active.directionLightList; }
    /** @internal */
    public static get pointLightList() { return ShadowLightsCollect._active.pointLightList; }
    /** @internal */
    public static get shadowLights() { return ShadowLightsCollect._active.shadowLights; }

    // ──────────────────────────────────────────────────────────────
    // Static API (backward-compat)
    // ──────────────────────────────────────────────────────────────

    public static init() {
        ShadowLightsCollect._active = new ShadowLightsCollect();
    }

    public static createBuffer(view: View3D) {
        ShadowLightsCollect._active.createBuffer(view);
    }

    static getShadowLightList(light: ILight) {
        return ShadowLightsCollect._active.getShadowLightList(light);
    }

    static getShadowLightWhichScene(scene: Scene3D, type: LightType) {
        return ShadowLightsCollect._active.getShadowLightWhichScene(scene, type);
    }

    static getDirectShadowLightWhichScene(scene: Scene3D) {
        return ShadowLightsCollect._active.getDirectShadowLightWhichScene(scene);
    }

    static getPointShadowLightWhichScene(scene: Scene3D) {
        return ShadowLightsCollect._active.getPointShadowLightWhichScene(scene);
    }

    static addShadowLight(light: ILight) {
        return ShadowLightsCollect._active.addShadowLight(light);
    }

    public static removeShadowLight(light: ILight) {
        return ShadowLightsCollect._active.removeShadowLight(light);
    }

    public static update(view: View3D) {
        ShadowLightsCollect._active.update(view);
    }

    // ──────────────────────────────────────────────────────────────
    // Instance methods (the real implementation)
    // ──────────────────────────────────────────────────────────────

    public createBuffer(view: View3D) {
        if (!this.shadowLights.has(view.scene)) {
            let list = new Float32Array(16);
            this.shadowLights.set(view.scene, list);
        }
    }

    public getShadowLightList(light: ILight) {
        if (!light.transform.view3D) return null;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this.directionLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                this.directionLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        } else if (light.lightData.lightType == LightType.PointLight) {
            let list = this.pointLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                this.pointLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        } else if (light.lightData.lightType == LightType.SpotLight) {
            let list = this.pointLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                this.pointLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        }
    }

    public getShadowLightWhichScene(scene: Scene3D, type: LightType) {
        if (type == LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (!list) {
                list = [];
                this.directionLightList.set(scene, list);
            }
            return list;
        } else if (type == LightType.PointLight) {
            let list = this.pointLightList.get(scene);
            if (!list) {
                list = [];
                this.pointLightList.set(scene, list);
            }
            return list;
        }
    }

    public getDirectShadowLightWhichScene(scene: Scene3D) {
        let list = this.directionLightList.get(scene);
        if (!list) {
            list = [];
            this.directionLightList.set(scene, list);
        }
        return list;
    }

    public getPointShadowLightWhichScene(scene: Scene3D) {
        let list = this.pointLightList.get(scene);
        if (!list) {
            list = [];
            this.pointLightList.set(scene, list);
        }
        return list;
    }

    public addShadowLight(light: ILight) {
        if (!light.transform.view3D) return null;
        let scene = light.transform.view3D.scene;

        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (!list) {
                list = [];
                this.directionLightList.set(scene, list);
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
            let list = this.pointLightList.get(scene);
            if (list && list.length >= 8) {
                return list;
            }
            if (!list) {
                list = [];
                this.pointLightList.set(scene, list);
            }
            if (list.indexOf(light) == -1) {
                list.push(light);
            }
            return list;
        }
    }

    public removeShadowLight(light: ILight) {
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

    public update(view: View3D) {
        let shadowLights = this.shadowLights.get(view.scene);
        let directionLightList = this.directionLightList.get(view.scene);
        let pointLightList = this.pointLightList.get(view.scene);

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
