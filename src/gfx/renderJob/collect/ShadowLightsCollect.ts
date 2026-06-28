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

    public maxNumDirectionShadow = 8;
    public maxNumPointShadow = 8;

    public directionLightList: Map<Scene3D, ILight[]>;
    public pointLightList: Map<Scene3D, ILight[]>;
    public shadowLights: Map<Scene3D, Float32Array>;

    constructor() {
        this.directionLightList = new Map<Scene3D, ILight[]>();
        this.pointLightList = new Map<Scene3D, ILight[]>();
        this.shadowLights = new Map<Scene3D, Float32Array>();
    }

    // ── Instance methods ────────────────────────────────────────────────────

    public createBuffer(view: View3D) {
        if (!this.shadowLights.has(view.scene)) {
            this.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    public getShadowLightList(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        const type = light.lightData.lightType;
        if (type === LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (!list) { list = []; this.directionLightList.set(scene, list); }
            return list;
        } else {
            let list = this.pointLightList.get(scene);
            if (!list) { list = []; this.pointLightList.set(scene, list); }
            return list;
        }
    }

    public getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        if (type === LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (!list) { list = []; this.directionLightList.set(scene, list); }
            return list;
        } else {
            let list = this.pointLightList.get(scene);
            if (!list) { list = []; this.pointLightList.set(scene, list); }
            return list;
        }
    }

    public getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        let list = this.directionLightList.get(scene);
        if (!list) { list = []; this.directionLightList.set(scene, list); }
        return list;
    }

    public getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        let list = this.pointLightList.get(scene);
        if (!list) { list = []; this.pointLightList.set(scene, list); }
        return list;
    }

    public addShadowLight(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;

        if (light.lightData.lightType === LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (!list) { list = []; this.directionLightList.set(scene, list); }
            if (!light.shadowCamera) {
                light.shadowCamera = CameraUtil.createCamera3DObject(null, 'shadowCamera');
                light.shadowCamera.isShadowCamera = true;
                const shadowBound = -1000;
                light.shadowCamera.orthoOffCenter(shadowBound, -shadowBound, shadowBound, -shadowBound, 1, 10000);
            }
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        } else if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            let list = this.pointLightList.get(scene);
            if (list && list.length >= 8) return list;
            if (!list) { list = []; this.pointLightList.set(scene, list); }
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        }
        return null;
    }

    public removeShadowLight(light: ILight): ILight[] | null {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        const type = light.lightData.lightType;
        let list: ILight[];
        if (type === LightType.DirectionLight) {
            list = this.directionLightList.get(scene);
        } else {
            list = this.pointLightList.get(scene);
        }
        if (list) {
            const index = list.indexOf(light);
            if (index !== -1) list.splice(index, 1);
        }
        light.lightData.castShadowIndex = -1;
        return list ?? null;
    }

    public update(view: View3D) {
        const shadowLights = this.shadowLights.get(view.scene);
        const directionLightList = this.directionLightList.get(view.scene);
        const pointLightList = this.pointLightList.get(view.scene);

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
            group.shadowLights = shadowLights;
        });
    }

    // ── Static backward-compat delegates ────────────────────────────────────

    /** @deprecated Will be removed. Use engine.shadowLightsCollect.maxNumDirectionShadow */
    public static maxNumDirectionShadow = 8;
    /** @deprecated Will be removed. Use engine.shadowLightsCollect.maxNumPointShadow */
    public static maxNumPointShadow = 8;

    private static _getCollect(light: ILight): ShadowLightsCollect | null {
        return light.transform?.view3D?.engine?.shadowLightsCollect ?? null;
    }

    private static _getCollectByScene(scene: Scene3D): ShadowLightsCollect | null {
        return scene?.view?.engine?.shadowLightsCollect ?? null;
    }

    /** @deprecated Use engine.shadowLightsCollect.init() */
    public static init() {
        // no-op: instance is created per Engine3D constructor
    }

    /** @deprecated Use view.engine.shadowLightsCollect.createBuffer(view) */
    public static createBuffer(view: View3D) {
        view?.engine?.shadowLightsCollect?.createBuffer(view);
    }

    /** @deprecated Use engine.shadowLightsCollect.getShadowLightList(light) */
    public static getShadowLightList(light: ILight): ILight[] | null {
        return this._getCollect(light)?.getShadowLightList(light) ?? null;
    }

    /** @deprecated Use engine.shadowLightsCollect.getShadowLightWhichScene(scene, type) */
    public static getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        return this._getCollectByScene(scene)?.getShadowLightWhichScene(scene, type) ?? [];
    }

    /** @deprecated Use engine.shadowLightsCollect.getDirectShadowLightWhichScene(scene) */
    public static getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return this._getCollectByScene(scene)?.getDirectShadowLightWhichScene(scene) ?? [];
    }

    /** @deprecated Use engine.shadowLightsCollect.getPointShadowLightWhichScene(scene) */
    public static getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return this._getCollectByScene(scene)?.getPointShadowLightWhichScene(scene) ?? [];
    }

    /** @deprecated Use engine.shadowLightsCollect.addShadowLight(light) */
    public static addShadowLight(light: ILight): ILight[] | null {
        return this._getCollect(light)?.addShadowLight(light) ?? null;
    }

    /** @deprecated Use engine.shadowLightsCollect.removeShadowLight(light) */
    public static removeShadowLight(light: ILight): ILight[] | null {
        return this._getCollect(light)?.removeShadowLight(light) ?? null;
    }

    /** @deprecated Use view.engine.shadowLightsCollect.update(view) */
    public static update(view: View3D) {
        view?.engine?.shadowLightsCollect?.update(view);
    }

    /** @deprecated Direct Map access removed for multi-instance. Use engine.shadowLightsCollect.directionLightList */
    public static get directionLightList(): Map<Scene3D, ILight[]> {
        return null;
    }
    /** @deprecated Direct Map access removed for multi-instance. Use engine.shadowLightsCollect.pointLightList */
    public static get pointLightList(): Map<Scene3D, ILight[]> {
        return null;
    }
    /** @deprecated Direct Map access removed for multi-instance. Use engine.shadowLightsCollect.shadowLights */
    public static get shadowLights(): Map<Scene3D, Float32Array> {
        return null;
    }
}
