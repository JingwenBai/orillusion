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

    // ---- Instance state (per-engine) ----
    public directionLightList: Map<Scene3D, ILight[]>;
    public pointLightList: Map<Scene3D, ILight[]>;
    public shadowLights: Map<Scene3D, Float32Array>;

    public init() {
        this.directionLightList = new Map<Scene3D, ILight[]>();
        this.pointLightList = new Map<Scene3D, ILight[]>();
        this.shadowLights = new Map<Scene3D, Float32Array>();
    }

    public createBuffer(view: View3D) {
        if (!this.shadowLights.has(view.scene)) {
            let list = new Float32Array(16);
            this.shadowLights.set(view.scene, list);
        }
    }

    getShadowLightList(light: ILight) {
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

    getShadowLightWhichScene(scene: Scene3D, type: LightType) {
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

    getDirectShadowLightWhichScene(scene: Scene3D) {
        let list = this.directionLightList.get(scene);
        if (!list) {
            list = [];
            this.directionLightList.set(scene, list);
        }
        return list;
    }

    getPointShadowLightWhichScene(scene: Scene3D) {
        let list = this.pointLightList.get(scene);
        if (!list) {
            list = [];
            this.pointLightList.set(scene, list);
        }
        return list;
    }

    addShadowLight(light: ILight) {
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
                if (index != -1) {
                    list.splice(index, 1);
                }
            }
            light.lightData.castShadowIndex = -1;
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = this.pointLightList.get(light.transform.view3D.scene);
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

        const globalBindGroup = view.engine?.globalBindGroup ?? GlobalBindGroup['_primary'];
        let cameraGroup = globalBindGroup?.getAllCameraGroup();
        cameraGroup?.forEach((group: GlobalUniformGroup) => {
            group.dirShadowStart = nDirShadowStart;
            group.dirShadowEnd = nDirShadowEnd;
            group.pointShadowStart = nPointShadowStart;
            group.pointShadowEnd = nPointShadowEnd;
            group.shadowLights = shadowLights;
        });
    }

    // ---- Static backward-compat API (delegates to primary engine's shadowLightsCollect) ----

    /**
     * @internal
     */
    private static _primary: ShadowLightsCollect | null = null;

    /**
     * @internal
     */
    public static _setPrimary(instance: ShadowLightsCollect) {
        ShadowLightsCollect._primary = instance;
    }

    /** @deprecated Use view.engine.shadowLightsCollect.createBuffer(view) */
    public static createBuffer(view: View3D) {
        ShadowLightsCollect._primary?.createBuffer(view);
    }

    /** @deprecated Use view.engine.shadowLightsCollect.addShadowLight(light) */
    public static addShadowLight(light: ILight) {
        return ShadowLightsCollect._primary?.addShadowLight(light);
    }

    /** @deprecated Use view.engine.shadowLightsCollect.removeShadowLight(light) */
    public static removeShadowLight(light: ILight) {
        return ShadowLightsCollect._primary?.removeShadowLight(light);
    }

    /** @deprecated Use view.engine.shadowLightsCollect.update(view) */
    public static update(view: View3D) {
        ShadowLightsCollect._primary?.update(view);
    }

    /** @deprecated Use view.engine.shadowLightsCollect.getShadowLightList(light) */
    public static getShadowLightList(light: ILight) {
        return ShadowLightsCollect._primary?.getShadowLightList(light);
    }

    /** @deprecated Use view.engine.shadowLightsCollect.getDirectShadowLightWhichScene(scene) */
    public static getDirectShadowLightWhichScene(scene: Scene3D) {
        return ShadowLightsCollect._primary?.getDirectShadowLightWhichScene(scene);
    }

    /** @deprecated Use view.engine.shadowLightsCollect.getPointShadowLightWhichScene(scene) */
    public static getPointShadowLightWhichScene(scene: Scene3D) {
        return ShadowLightsCollect._primary?.getPointShadowLightWhichScene(scene);
    }

    /** @deprecated Use view.engine.shadowLightsCollect.getShadowLightWhichScene(scene, type) */
    public static getShadowLightWhichScene(scene: Scene3D, type: LightType) {
        return ShadowLightsCollect._primary?.getShadowLightWhichScene(scene, type);
    }
}
