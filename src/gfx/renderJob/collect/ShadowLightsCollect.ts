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

    private static _active: ShadowLightsCollect;

    /** @internal */
    public static activate(collect: ShadowLightsCollect) {
        this._active = collect;
    }

    private static get _inst(): ShadowLightsCollect {
        if (!this._active) {
            this._active = new ShadowLightsCollect();
        }
        return this._active;
    }

    public static get directionLightList(): Map<Scene3D, ILight[]> {
        return this._inst._directionLightList;
    }
    public static get pointLightList(): Map<Scene3D, ILight[]> {
        return this._inst._pointLightList;
    }
    public static get shadowLights(): Map<Scene3D, Float32Array> {
        return this._inst._shadowLights;
    }

    public static init() {
        this._inst._directionLightList = new Map<Scene3D, ILight[]>();
        this._inst._pointLightList = new Map<Scene3D, ILight[]>();
        this._inst._shadowLights = new Map<Scene3D, Float32Array>();
    }

    public static createBuffer(view: View3D) {
        this._inst.createBuffer(view);
    }

    public static getShadowLightList(light: ILight) {
        return this._inst.getShadowLightList(light);
    }

    public static getShadowLightWhichScene(scene: Scene3D, type: LightType) {
        return this._inst.getShadowLightWhichScene(scene, type);
    }

    public static getDirectShadowLightWhichScene(scene: Scene3D) {
        return this._inst.getDirectShadowLightWhichScene(scene);
    }

    public static getPointShadowLightWhichScene(scene: Scene3D) {
        return this._inst.getPointShadowLightWhichScene(scene);
    }

    public static addShadowLight(light: ILight) {
        return this._inst.addShadowLight(light);
    }

    public static removeShadowLight(light: ILight) {
        return this._inst.removeShadowLight(light);
    }

    public static update(view: View3D) {
        this._inst.update(view);
    }

    // ---- instance state ----

    public _directionLightList: Map<Scene3D, ILight[]>;
    public _pointLightList: Map<Scene3D, ILight[]>;
    public _shadowLights: Map<Scene3D, Float32Array>;

    constructor() {
        this._directionLightList = new Map<Scene3D, ILight[]>();
        this._pointLightList = new Map<Scene3D, ILight[]>();
        this._shadowLights = new Map<Scene3D, Float32Array>();
    }

    public createBuffer(view: View3D) {
        if (!this._shadowLights.has(view.scene)) {
            let list = new Float32Array(16);
            this._shadowLights.set(view.scene, list);
        }
    }

    public getShadowLightList(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this._directionLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                this._directionLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        } else if (light.lightData.lightType == LightType.PointLight) {
            let list = this._pointLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                this._pointLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        } else if (light.lightData.lightType == LightType.SpotLight) {
            let list = this._pointLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                this._pointLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        }
        return null;
    }

    public getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        if (type == LightType.DirectionLight) {
            let list = this._directionLightList.get(scene);
            if (!list) {
                list = [];
                this._directionLightList.set(scene, list);
            }
            return list;
        } else if (type == LightType.PointLight) {
            let list = this._pointLightList.get(scene);
            if (!list) {
                list = [];
                this._pointLightList.set(scene, list);
            }
            return list;
        }
        return [];
    }

    public getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        let list = this._directionLightList.get(scene);
        if (!list) {
            list = [];
            this._directionLightList.set(scene, list);
        }
        return list;
    }

    public getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        let list = this._pointLightList.get(scene);
        if (!list) {
            list = [];
            this._pointLightList.set(scene, list);
        }
        return list;
    }

    public addShadowLight(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        let scene = light.transform.view3D.scene;

        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this._directionLightList.get(scene);
            if (!list) {
                list = [];
                this._directionLightList.set(scene, list);
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
            let list = this._pointLightList.get(scene);
            if (list && list.length >= 8) {
                return list;
            }
            if (!list) {
                list = [];
                this._pointLightList.set(scene, list);
            }
            if (list.indexOf(light) == -1) {
                list.push(light);
            }
            return list;
        }
        return null;
    }

    public removeShadowLight(light: ILight): ILight[] | null {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this._directionLightList.get(light.transform.view3D.scene);
            if (list) {
                let index = list.indexOf(light);
                if (index != -1) {
                    list.splice(index, 1);
                }
            }
            light.lightData.castShadowIndex = -1;
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = this._pointLightList.get(light.transform.view3D.scene);
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

    public update(view: View3D) {
        let shadowLights = this._shadowLights.get(view.scene);
        let directionLightList = this._directionLightList.get(view.scene);
        let pointLightList = this._pointLightList.get(view.scene);

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
