import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';

let _current: ShadowLightsCollect | null = null;

/**
 * @internal
 * Activate a ShadowLightsCollect instance as the current one. Called by Engine3D.
 */
export function _setCurrentShadowLightsCollect(s: ShadowLightsCollect | null): void {
    _current = s;
}

/**
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    public static readonly maxNumDirectionShadow = 8;
    public static readonly maxNumPointShadow = 8;

    public directionLightList: Map<Scene3D, ILight[]>;
    public pointLightList: Map<Scene3D, ILight[]>;
    public shadowLights: Map<Scene3D, Float32Array>;

    constructor() {
        this.directionLightList = new Map<Scene3D, ILight[]>();
        this.pointLightList = new Map<Scene3D, ILight[]>();
        this.shadowLights = new Map<Scene3D, Float32Array>();
    }

    // ── Static accessors (delegate to current engine's ShadowLightsCollect) ──

    public static createBuffer(view: View3D) {
        if (!_current!.shadowLights.has(view.scene)) {
            _current!.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    static getShadowLightList(light: ILight) {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        if (light.lightData.lightType == LightType.DirectionLight) {
            return ShadowLightsCollect._getOrCreateList(_current!.directionLightList, scene);
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            return ShadowLightsCollect._getOrCreateList(_current!.pointLightList, scene);
        }
        return null;
    }

    static getShadowLightWhichScene(scene: Scene3D, type: LightType) {
        if (type == LightType.DirectionLight) {
            return ShadowLightsCollect._getOrCreateList(_current!.directionLightList, scene);
        } else if (type == LightType.PointLight) {
            return ShadowLightsCollect._getOrCreateList(_current!.pointLightList, scene);
        }
        return null;
    }

    static getDirectShadowLightWhichScene(scene: Scene3D) {
        return ShadowLightsCollect._getOrCreateList(_current!.directionLightList, scene);
    }

    static getPointShadowLightWhichScene(scene: Scene3D) {
        return ShadowLightsCollect._getOrCreateList(_current!.pointLightList, scene);
    }

    static addShadowLight(light: ILight) {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;

        if (light.lightData.lightType == LightType.DirectionLight) {
            const list = ShadowLightsCollect._getOrCreateList(_current!.directionLightList, scene);
            if (!light.shadowCamera) {
                light.shadowCamera = CameraUtil.createCamera3DObject(null, 'shadowCamera');
                light.shadowCamera.isShadowCamera = true;
                const shadowBound = -1000;
                light.shadowCamera.orthoOffCenter(shadowBound, -shadowBound, shadowBound, -shadowBound, 1, 10000);
            }
            if (list.indexOf(light) == -1) {
                list.push(light);
            }
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            const list = ShadowLightsCollect._getOrCreateList(_current!.pointLightList, scene);
            if (list.length >= 8) return list;
            if (list.indexOf(light) == -1) {
                list.push(light);
            }
            return list;
        }
        return null;
    }

    public static removeShadowLight(light: ILight) {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;

        if (light.lightData.lightType == LightType.DirectionLight) {
            const list = _current!.directionLightList.get(scene);
            if (list) {
                const index = list.indexOf(light);
                if (index != -1) list.splice(index, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            const list = _current!.pointLightList.get(scene);
            if (list) {
                const index = list.indexOf(light);
                if (index != -1) list.splice(index, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        }
        return null;
    }

    public static update(view: View3D) {
        const c = _current!;
        const shadowLights = c.shadowLights.get(view.scene);
        const directionLightList = c.directionLightList.get(view.scene);
        const pointLightList = c.pointLightList.get(view.scene);

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

        const cameraGroup = GlobalBindGroup.getAllCameraGroup();
        cameraGroup.forEach((group: GlobalUniformGroup) => {
            group.dirShadowStart = nDirShadowStart;
            group.dirShadowEnd = nDirShadowEnd;
            group.pointShadowStart = nPointShadowStart;
            group.pointShadowEnd = nPointShadowEnd;
            group.shadowLights = shadowLights as Float32Array<ArrayBuffer>;
        });
    }

    private static _getOrCreateList(map: Map<Scene3D, ILight[]>, scene: Scene3D): ILight[] {
        let list = map.get(scene);
        if (!list) {
            list = [];
            map.set(scene, list);
        }
        return list;
    }
}
