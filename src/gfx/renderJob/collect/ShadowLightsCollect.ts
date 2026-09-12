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

    // ─── Instance fields ───────────────────────────────────────────────────────
    public directionLightList: Map<Scene3D, ILight[]>;
    public pointLightList: Map<Scene3D, ILight[]>;
    public shadowLights: Map<Scene3D, Float32Array>;

    /** @internal Global fallback for legacy/single-engine code */
    private static _global: ShadowLightsCollect = new ShadowLightsCollect();

    /** @internal Resolve the right instance from a View3D or fall back to global */
    private static _forView(view: View3D): ShadowLightsCollect {
        return (view as any)?._engine?.shadowLightsCollect ?? ShadowLightsCollect._global;
    }

    private static _forLight(light: ILight): ShadowLightsCollect {
        return ShadowLightsCollect._forView(light?.transform?.view3D);
    }

    private static _forScene(scene: Scene3D): ShadowLightsCollect {
        return ShadowLightsCollect._forView((scene as any)?.view);
    }

    constructor() {
        this.directionLightList = new Map<Scene3D, ILight[]>();
        this.pointLightList = new Map<Scene3D, ILight[]>();
        this.shadowLights = new Map<Scene3D, Float32Array>();
    }

    // ─── Instance methods ──────────────────────────────────────────────────────

    public initInstance() {
        this.directionLightList = new Map<Scene3D, ILight[]>();
        this.pointLightList = new Map<Scene3D, ILight[]>();
        this.shadowLights = new Map<Scene3D, Float32Array>();
    }

    public createBufferInstance(view: View3D) {
        if (!this.shadowLights.has(view.scene)) {
            this.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    public getShadowLightListInstance(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (!list) { list = []; this.directionLightList.set(scene, list); }
            return list;
        } else {
            let list = this.pointLightList.get(scene);
            if (!list) { list = []; this.pointLightList.set(scene, list); }
            return list;
        }
    }

    public getShadowLightWhichSceneInstance(scene: Scene3D, type: LightType): ILight[] {
        if (type == LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (!list) { list = []; this.directionLightList.set(scene, list); }
            return list;
        } else {
            let list = this.pointLightList.get(scene);
            if (!list) { list = []; this.pointLightList.set(scene, list); }
            return list;
        }
    }

    public getDirectShadowLightWhichSceneInstance(scene: Scene3D): ILight[] {
        let list = this.directionLightList.get(scene);
        if (!list) { list = []; this.directionLightList.set(scene, list); }
        return list;
    }

    public getPointShadowLightWhichSceneInstance(scene: Scene3D): ILight[] {
        let list = this.pointLightList.get(scene);
        if (!list) { list = []; this.pointLightList.set(scene, list); }
        return list;
    }

    public addShadowLightInstance(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
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
        return null;
    }

    public removeShadowLightInstance(light: ILight): ILight[] | null {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (list) {
                let index = list.indexOf(light);
                if (index != -1) list.splice(index, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = this.pointLightList.get(scene);
            if (list) {
                let index = list.indexOf(light);
                if (index != -1) list.splice(index, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        }
        return null;
    }

    public updateInstance(view: View3D) {
        let shadowLights = this.shadowLights.get(view.scene);
        let directionLightList = this.directionLightList.get(view.scene);
        let pointLightList = this.pointLightList.get(view.scene);

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

        // Route to the same engine's GlobalBindGroup
        const engine = (view as any)?._engine;
        const gbg: GlobalBindGroup = engine?.globalBindGroup;
        const cameraGroup = gbg ? gbg.getAllCameraGroupInstance() : GlobalBindGroup.getAllCameraGroup();
        cameraGroup.forEach((group: GlobalUniformGroup) => {
            group.dirShadowStart = nDirShadowStart;
            group.dirShadowEnd = nDirShadowEnd;
            group.pointShadowStart = nPointShadowStart;
            group.pointShadowEnd = nPointShadowEnd;
            group.shadowLights = shadowLights;
        });
    }

    // ─── Static API (backward-compatible) ─────────────────────────────────────

    public static init() {
        ShadowLightsCollect._global.initInstance();
    }

    public static createBuffer(view: View3D) {
        ShadowLightsCollect._forView(view).createBufferInstance(view);
    }

    static getShadowLightList(light: ILight): ILight[] | null {
        return ShadowLightsCollect._forLight(light).getShadowLightListInstance(light);
    }

    static getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        return ShadowLightsCollect._forScene(scene).getShadowLightWhichSceneInstance(scene, type);
    }

    static getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return ShadowLightsCollect._forScene(scene).getDirectShadowLightWhichSceneInstance(scene);
    }

    static getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return ShadowLightsCollect._forScene(scene).getPointShadowLightWhichSceneInstance(scene);
    }

    static addShadowLight(light: ILight): ILight[] | null {
        return ShadowLightsCollect._forLight(light).addShadowLightInstance(light);
    }

    public static removeShadowLight(light: ILight): ILight[] | null {
        return ShadowLightsCollect._forLight(light).removeShadowLightInstance(light);
    }

    public static update(view: View3D) {
        ShadowLightsCollect._forView(view).updateInstance(view);
    }
}
