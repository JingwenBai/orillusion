import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';

/** @internal */
let _activeInstance: ShadowLightsCollect | null = null;

/**
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    // =================== Per-engine instance state ===================

    public maxNumDirectionShadow: number = 8;
    public maxNumPointShadow: number = 8;

    public directionLightList: Map<Scene3D, ILight[]>;
    public pointLightList: Map<Scene3D, ILight[]>;
    public shadowLights: Map<Scene3D, Float32Array>;

    constructor() {
        this.directionLightList = new Map<Scene3D, ILight[]>();
        this.pointLightList = new Map<Scene3D, ILight[]>();
        this.shadowLights = new Map<Scene3D, Float32Array>();
    }

    // =================== Instance methods ===================

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
            if (list.indexOf(light) == -1) list.push(light);
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = this.pointLightList.get(scene);
            if (list && list.length >= 8) return list;
            if (!list) {
                list = [];
                this.pointLightList.set(scene, list);
            }
            if (list.indexOf(light) == -1) list.push(light);
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

    // =================== Static active-instance management ===================

    /** @internal */
    public static _setActive(instance: ShadowLightsCollect) {
        _activeInstance = instance;
    }

    /** @internal */
    public static get instance(): ShadowLightsCollect {
        return _activeInstance;
    }

    // =================== Static proxy methods (backward compat) ===================

    public static get maxNumDirectionShadow() { return _activeInstance?.maxNumDirectionShadow ?? 8; }
    public static get maxNumPointShadow() { return _activeInstance?.maxNumPointShadow ?? 8; }
    public static get directionLightList() { return _activeInstance?.directionLightList; }
    public static get pointLightList() { return _activeInstance?.pointLightList; }
    public static get shadowLights() { return _activeInstance?.shadowLights; }

    public static init() { _activeInstance?.init(); }

    public static createBuffer(view: View3D) { _activeInstance?.createBuffer(view); }

    public static getShadowLightList(light: ILight) {
        return _activeInstance?.getShadowLightList(light);
    }

    public static getShadowLightWhichScene(scene: Scene3D, type: LightType) {
        return _activeInstance?.getShadowLightWhichScene(scene, type);
    }

    public static getDirectShadowLightWhichScene(scene: Scene3D) {
        return _activeInstance?.getDirectShadowLightWhichScene(scene);
    }

    public static getPointShadowLightWhichScene(scene: Scene3D) {
        return _activeInstance?.getPointShadowLightWhichScene(scene);
    }

    public static addShadowLight(light: ILight) {
        return _activeInstance?.addShadowLight(light);
    }

    public static removeShadowLight(light: ILight) {
        return _activeInstance?.removeShadowLight(light);
    }

    public static update(view: View3D) {
        _activeInstance?.update(view);
    }
}
