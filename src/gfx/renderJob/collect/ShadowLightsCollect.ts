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

    // ---- per-engine limits (can remain static / shared) ----
    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    // ---- per-engine instance state ----
    private _directionLightList: Map<Scene3D, ILight[]> = new Map();
    private _pointLightList: Map<Scene3D, ILight[]> = new Map();
    private _shadowLights: Map<Scene3D, Float32Array> = new Map();

    // ---- active instance ----
    private static _current: ShadowLightsCollect | null = null;

    /**
     * Activate an engine's ShadowLightsCollect as the current context.
     * @internal
     */
    public static activate(instance: ShadowLightsCollect): void {
        this._current = instance;
    }

    // ---- static backward-compat API ----

    public static init() {
        // no-op: instance is created in Engine3D constructor
    }

    public static createBuffer(view: View3D) {
        this._current?.createBuffer(view);
    }

    static getShadowLightList(light: ILight) {
        if (!light.transform.view3D) return null;
        return this._current?.getShadowLightList(light) ?? null;
    }

    static getShadowLightWhichScene(scene: Scene3D, type: LightType) {
        return this._current?.getShadowLightWhichScene(scene, type) ?? null;
    }

    static getDirectShadowLightWhichScene(scene: Scene3D) {
        return this._current?.getDirectShadowLightWhichScene(scene) ?? null;
    }

    static getPointShadowLightWhichScene(scene: Scene3D) {
        return this._current?.getPointShadowLightWhichScene(scene) ?? null;
    }

    static addShadowLight(light: ILight) {
        if (!light.transform.view3D) return null;
        return this._current?.addShadowLight(light) ?? null;
    }

    public static removeShadowLight(light: ILight) {
        if (!light.transform.view3D) return null;
        return this._current?.removeShadowLight(light) ?? null;
    }

    public static update(view: View3D) {
        this._current?.update(view);
    }

    // ---- Static accessor shims for direct list access used by light components ----
    public static get directionLightList(): Map<Scene3D, ILight[]> {
        return this._current?._directionLightList;
    }
    public static get pointLightList(): Map<Scene3D, ILight[]> {
        return this._current?._pointLightList;
    }
    public static get shadowLights(): Map<Scene3D, Float32Array> {
        return this._current?._shadowLights;
    }

    // ---- instance methods ----

    public createBuffer(view: View3D): void {
        if (!this._shadowLights.has(view.scene)) {
            let list = new Float32Array(16);
            this._shadowLights.set(view.scene, list);
        }
    }

    public getShadowLightList(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this._directionLightList.get(scene);
            if (!list) {
                list = [];
                this._directionLightList.set(scene, list);
            }
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = this._pointLightList.get(scene);
            if (!list) {
                list = [];
                this._pointLightList.set(scene, list);
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

    public update(view: View3D): void {
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

        // Only update cameras belonging to this engine's GlobalBindGroup
        let cameraGroup = GlobalBindGroup.getAllCameraGroup();
        if (cameraGroup) {
            cameraGroup.forEach((group: GlobalUniformGroup) => {
                group.dirShadowStart = nDirShadowStart;
                group.dirShadowEnd = nDirShadowEnd;
                group.pointShadowStart = nPointShadowStart;
                group.pointShadowEnd = nPointShadowEnd;
                group.shadowLights = shadowLights;
            });
        }
    }
}
