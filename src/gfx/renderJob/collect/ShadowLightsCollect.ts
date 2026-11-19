import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';
import { EngineRegistry } from '../../../util/EngineRegistry';

/**
 * ShadowLightsCollect tracks shadow-casting lights per scene.
 *
 * In multi-instance mode each Engine3D owns a ShadowLightsCollect instance.
 * Static methods route to the correct instance via EngineRegistry so all
 * existing callers work unchanged.
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    public maxNumDirectionShadow = 8;
    public maxNumPointShadow = 8;

    public directionLightList: Map<Scene3D, ILight[]> = new Map();
    public pointLightList: Map<Scene3D, ILight[]> = new Map();
    public shadowLights: Map<Scene3D, Float32Array> = new Map();

    // --- Static convenience aliases used by existing code ---
    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    // Global fallback for single-instance backward compat
    private static _default: ShadowLightsCollect = new ShadowLightsCollect();

    private static _get(scene?: Scene3D): ShadowLightsCollect {
        if (scene?.view) {
            const ctx = EngineRegistry.getByView(scene.view);
            if (ctx?.shadowLightsCollect) return ctx.shadowLightsCollect;
        }
        return EngineRegistry.active?.shadowLightsCollect ?? ShadowLightsCollect._default;
    }

    // --- Static init (called by Engine3D.init) ---
    public static init() {
        const inst = ShadowLightsCollect._get();
        inst.directionLightList = new Map();
        inst.pointLightList = new Map();
        inst.shadowLights = new Map();
    }

    public static createBuffer(view: View3D) {
        const inst = ShadowLightsCollect._get(view.scene as Scene3D);
        if (!inst.shadowLights.has(view.scene)) {
            inst.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    static getShadowLightList(light: ILight) {
        if (!light.transform.view3D) return null;
        return ShadowLightsCollect._getShadowLightListByScene(
            ShadowLightsCollect._get(light.transform.view3D.scene as Scene3D),
            light.transform.view3D.scene as Scene3D,
            light.lightData.lightType
        );
    }

    private static _getShadowLightListByScene(inst: ShadowLightsCollect, scene: Scene3D, type: LightType): ILight[] | null {
        if (type === LightType.DirectionLight) {
            let list = inst.directionLightList.get(scene);
            if (!list) { list = []; inst.directionLightList.set(scene, list); }
            return list;
        } else if (type === LightType.PointLight || type === LightType.SpotLight) {
            let list = inst.pointLightList.get(scene);
            if (!list) { list = []; inst.pointLightList.set(scene, list); }
            return list;
        }
        return null;
    }

    static getShadowLightWhichScene(scene: Scene3D, type: LightType) {
        const inst = ShadowLightsCollect._get(scene);
        return ShadowLightsCollect._getShadowLightListByScene(inst, scene, type);
    }

    static getDirectShadowLightWhichScene(scene: Scene3D) {
        const inst = ShadowLightsCollect._get(scene);
        let list = inst.directionLightList.get(scene);
        if (!list) { list = []; inst.directionLightList.set(scene, list); }
        return list;
    }

    static getPointShadowLightWhichScene(scene: Scene3D) {
        const inst = ShadowLightsCollect._get(scene);
        let list = inst.pointLightList.get(scene);
        if (!list) { list = []; inst.pointLightList.set(scene, list); }
        return list;
    }

    static addShadowLight(light: ILight) {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene as Scene3D;
        const inst = ShadowLightsCollect._get(scene);

        if (light.lightData.lightType === LightType.DirectionLight) {
            let list = inst.directionLightList.get(scene);
            if (!list) { list = []; inst.directionLightList.set(scene, list); }
            if (!light.shadowCamera) {
                light.shadowCamera = CameraUtil.createCamera3DObject(null, 'shadowCamera');
                light.shadowCamera.isShadowCamera = true;
                let shadowBound = -1000;
                light.shadowCamera.orthoOffCenter(shadowBound, -shadowBound, shadowBound, -shadowBound, 1, 10000);
            }
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        } else if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            let list = inst.pointLightList.get(scene);
            if (list && list.length >= 8) return list;
            if (!list) { list = []; inst.pointLightList.set(scene, list); }
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        }
    }

    public static removeShadowLight(light: ILight) {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene as Scene3D;
        const inst = ShadowLightsCollect._get(scene);

        if (light.lightData.lightType === LightType.DirectionLight) {
            const list = inst.directionLightList.get(scene);
            if (list) {
                const idx = list.indexOf(light);
                if (idx !== -1) list.splice(idx, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        } else if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            const list = inst.pointLightList.get(scene);
            if (list) {
                const idx = list.indexOf(light);
                if (idx !== -1) list.splice(idx, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        }
    }

    public static update(view: View3D) {
        const inst = ShadowLightsCollect._get(view.scene as Scene3D);
        const shadowLights = inst.shadowLights.get(view.scene);
        const directionLightList = inst.directionLightList.get(view.scene);
        const pointLightList = inst.pointLightList.get(view.scene);

        let nDirShadowStart = 0, nDirShadowEnd = 0;
        let nPointShadowStart = 0, nPointShadowEnd = 0;
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
