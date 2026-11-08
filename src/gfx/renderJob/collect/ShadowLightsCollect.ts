import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';
import { getCurrentEngine } from '../../../util/EngineHolder';

/**
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    // ─── per-instance state ───────────────────────────────────────────────────

    public directionLightList: Map<Scene3D, ILight[]>;
    public pointLightList: Map<Scene3D, ILight[]>;
    public shadowLights: Map<Scene3D, Float32Array>;

    constructor() {
        this.directionLightList = new Map<Scene3D, ILight[]>();
        this.pointLightList = new Map<Scene3D, ILight[]>();
        this.shadowLights = new Map<Scene3D, Float32Array>();
    }

    // ─── static facade helpers ────────────────────────────────────────────────

    private static get _current(): ShadowLightsCollect {
        const engine = getCurrentEngine();
        return engine?.shadowLightsCollect ?? ShadowLightsCollect._global;
    }

    private static readonly _global: ShadowLightsCollect = new ShadowLightsCollect();

    // ─── static init (kept for legacy callers) ────────────────────────────────

    /** @deprecated Create a new Engine3D instance instead. */
    public static init() {
        const s = ShadowLightsCollect._current;
        s.directionLightList = new Map<Scene3D, ILight[]>();
        s.pointLightList = new Map<Scene3D, ILight[]>();
        s.shadowLights = new Map<Scene3D, Float32Array>();
    }

    // ─── static facade API (backward-compatible) ─────────────────────────────

    public static createBuffer(view: View3D) {
        const s = ShadowLightsCollect._current;
        if (!s.shadowLights.has(view.scene)) {
            s.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    static getShadowLightList(light: ILight) {
        if (!light.transform.view3D) return null;
        const s = ShadowLightsCollect._current;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = s.directionLightList.get(light.transform.view3D.scene);
            if (!list) { list = []; s.directionLightList.set(light.transform.view3D.scene, list); }
            return list;
        } else if (light.lightData.lightType == LightType.PointLight) {
            let list = s.pointLightList.get(light.transform.view3D.scene);
            if (!list) { list = []; s.pointLightList.set(light.transform.view3D.scene, list); }
            return list;
        } else if (light.lightData.lightType == LightType.SpotLight) {
            let list = s.pointLightList.get(light.transform.view3D.scene);
            if (!list) { list = []; s.pointLightList.set(light.transform.view3D.scene, list); }
            return list;
        }
    }

    static getShadowLightWhichScene(scene: Scene3D, type: LightType) {
        const s = ShadowLightsCollect._current;
        if (type == LightType.DirectionLight) {
            let list = s.directionLightList.get(scene);
            if (!list) { list = []; s.directionLightList.set(scene, list); }
            return list;
        } else if (type == LightType.PointLight) {
            let list = s.pointLightList.get(scene);
            if (!list) { list = []; s.pointLightList.set(scene, list); }
            return list;
        }
    }

    static getDirectShadowLightWhichScene(scene: Scene3D) {
        const s = ShadowLightsCollect._current;
        let list = s.directionLightList.get(scene);
        if (!list) { list = []; s.directionLightList.set(scene, list); }
        return list;
    }

    static getPointShadowLightWhichScene(scene: Scene3D) {
        const s = ShadowLightsCollect._current;
        let list = s.pointLightList.get(scene);
        if (!list) { list = []; s.pointLightList.set(scene, list); }
        return list;
    }

    static addShadowLight(light: ILight) {
        if (!light.transform.view3D) return null;
        const s = ShadowLightsCollect._current;
        const scene = light.transform.view3D.scene;

        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = s.directionLightList.get(scene);
            if (!list) { list = []; s.directionLightList.set(scene, list); }
            if (!light.shadowCamera) {
                light.shadowCamera = CameraUtil.createCamera3DObject(null, 'shadowCamera');
                light.shadowCamera.isShadowCamera = true;
                let shadowBound = -1000;
                light.shadowCamera.orthoOffCenter(shadowBound, -shadowBound, shadowBound, -shadowBound, 1, 10000);
            }
            if (list.indexOf(light) == -1) list.push(light);
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = s.pointLightList.get(scene);
            if (list && list.length >= 8) return list;
            if (!list) { list = []; s.pointLightList.set(scene, list); }
            if (list.indexOf(light) == -1) list.push(light);
            return list;
        }
    }

    public static removeShadowLight(light: ILight) {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        const s = ShadowLightsCollect._current;
        if (light.lightData.lightType == LightType.DirectionLight) {
            const list = s.directionLightList.get(light.transform.view3D.scene);
            if (list) {
                const index = list.indexOf(light);
                if (index != -1) list.splice(index, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            const list = s.pointLightList.get(light.transform.view3D.scene);
            if (list) {
                const index = list.indexOf(light);
                if (index != -1) list.splice(index, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        }
    }

    public static update(view: View3D) {
        const s = ShadowLightsCollect._current;
        const shadowLights = s.shadowLights.get(view.scene);
        const directionLightList = s.directionLightList.get(view.scene);
        const pointLightList = s.pointLightList.get(view.scene);

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

        const cameraGroup = GlobalBindGroup.getAllCameraGroup();
        cameraGroup.forEach((group: GlobalUniformGroup) => {
            group.dirShadowStart = nDirShadowStart;
            group.dirShadowEnd = nDirShadowEnd;
            group.pointShadowStart = nPointShadowStart;
            group.pointShadowEnd = nPointShadowEnd;
            group.shadowLights = shadowLights;
        });
    }
}
