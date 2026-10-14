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

    // ---- Active instance registry (multi-instance support) ----
    private static _active: ShadowLightsCollect;

    public static setActive(instance: ShadowLightsCollect): void {
        ShadowLightsCollect._active = instance;
    }

    public static createInstance(): ShadowLightsCollect {
        const instance = new ShadowLightsCollect();
        instance._doInit();
        return instance;
    }

    // ---- Static facade (zero changes required at call sites) ----

    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    public static get directionLightList(): Map<Scene3D, ILight[]> {
        return ShadowLightsCollect._active._directionLightList;
    }

    public static get pointLightList(): Map<Scene3D, ILight[]> {
        return ShadowLightsCollect._active._pointLightList;
    }

    public static get shadowLights(): Map<Scene3D, Float32Array> {
        return ShadowLightsCollect._active._shadowLights;
    }

    public static init(): void {
        ShadowLightsCollect._active._doInit();
    }

    public static createBuffer(view: View3D): void {
        ShadowLightsCollect._active._createBuffer(view);
    }

    public static getShadowLightList(light: ILight): ILight[] | null {
        return ShadowLightsCollect._active._getShadowLightList(light);
    }

    public static getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        return ShadowLightsCollect._active._getShadowLightWhichScene(scene, type);
    }

    public static getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return ShadowLightsCollect._active._getDirectShadowLightWhichScene(scene);
    }

    public static getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return ShadowLightsCollect._active._getPointShadowLightWhichScene(scene);
    }

    public static addShadowLight(light: ILight): ILight[] | null {
        return ShadowLightsCollect._active._addShadowLight(light);
    }

    public static removeShadowLight(light: ILight): ILight[] {
        return ShadowLightsCollect._active._removeShadowLight(light);
    }

    public static update(view: View3D): void {
        ShadowLightsCollect._active._update(view);
    }

    // ---- Instance state ----
    private _directionLightList: Map<Scene3D, ILight[]>;
    private _pointLightList: Map<Scene3D, ILight[]>;
    private _shadowLights: Map<Scene3D, Float32Array>;

    private _doInit(): void {
        this._directionLightList = new Map<Scene3D, ILight[]>();
        this._pointLightList = new Map<Scene3D, ILight[]>();
        this._shadowLights = new Map<Scene3D, Float32Array>();
    }

    // ---- Instance implementations ----
    private _createBuffer(view: View3D): void {
        if (!this._shadowLights.has(view.scene)) {
            this._shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    private _getShadowLightList(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this._directionLightList.get(scene);
            if (!list) { list = []; this._directionLightList.set(scene, list); }
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = this._pointLightList.get(scene);
            if (!list) { list = []; this._pointLightList.set(scene, list); }
            return list;
        }
        return null;
    }

    private _getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        if (type == LightType.DirectionLight) {
            let list = this._directionLightList.get(scene);
            if (!list) { list = []; this._directionLightList.set(scene, list); }
            return list;
        } else if (type == LightType.PointLight) {
            let list = this._pointLightList.get(scene);
            if (!list) { list = []; this._pointLightList.set(scene, list); }
            return list;
        }
        return [];
    }

    private _getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        let list = this._directionLightList.get(scene);
        if (!list) { list = []; this._directionLightList.set(scene, list); }
        return list;
    }

    private _getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        let list = this._pointLightList.get(scene);
        if (!list) { list = []; this._pointLightList.set(scene, list); }
        return list;
    }

    private _addShadowLight(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;

        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this._directionLightList.get(scene);
            if (!list) { list = []; this._directionLightList.set(scene, list); }
            if (!light.shadowCamera) {
                light.shadowCamera = CameraUtil.createCamera3DObject(null, 'shadowCamera');
                light.shadowCamera.isShadowCamera = true;
                let shadowBound = -1000;
                light.shadowCamera.orthoOffCenter(shadowBound, -shadowBound, shadowBound, -shadowBound, 1, 10000);
            }
            if (list.indexOf(light) == -1) list.push(light);
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = this._pointLightList.get(scene);
            if (list && list.length >= 8) return list;
            if (!list) { list = []; this._pointLightList.set(scene, list); }
            if (list.indexOf(light) == -1) list.push(light);
            return list;
        }
        return null;
    }

    private _removeShadowLight(light: ILight): ILight[] {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this._directionLightList.get(light.transform.view3D.scene);
            if (list) {
                let index = list.indexOf(light);
                if (index != -1) list.splice(index, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = this._pointLightList.get(light.transform.view3D.scene);
            if (list) {
                let index = list.indexOf(light);
                if (index != -1) list.splice(index, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        }
        return null;
    }

    private _update(view: View3D): void {
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
