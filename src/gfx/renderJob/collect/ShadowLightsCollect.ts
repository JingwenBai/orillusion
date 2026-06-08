import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';
import { ActiveEngineContext } from '../../../EngineContext';

/**
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    public maxNumDirectionShadow = 8;
    public maxNumPointShadow = 8;

    public directionLightList: Map<Scene3D, ILight[]> = new Map();
    public pointLightList: Map<Scene3D, ILight[]> = new Map();
    public shadowLights: Map<Scene3D, Float32Array> = new Map();

    // ---- Instance methods ----

    public createBuffer(view: View3D): void {
        if (!this.shadowLights.has(view.scene)) {
            this.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    public getShadowLightList(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        if (light.lightData.lightType === LightType.DirectionLight) {
            return this._getOrCreate(this.directionLightList, scene);
        } else {
            return this._getOrCreate(this.pointLightList, scene);
        }
    }

    public getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        if (type === LightType.DirectionLight) return this._getOrCreate(this.directionLightList, scene);
        return this._getOrCreate(this.pointLightList, scene);
    }

    public getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return this._getOrCreate(this.directionLightList, scene);
    }

    public getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return this._getOrCreate(this.pointLightList, scene);
    }

    public addShadowLight(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;

        if (light.lightData.lightType === LightType.DirectionLight) {
            const list = this._getOrCreate(this.directionLightList, scene);
            if (!light.shadowCamera) {
                light.shadowCamera = CameraUtil.createCamera3DObject(null, 'shadowCamera');
                light.shadowCamera.isShadowCamera = true;
                const shadowBound = -1000;
                light.shadowCamera.orthoOffCenter(shadowBound, -shadowBound, shadowBound, -shadowBound, 1, 10000);
            }
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        } else if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            const list = this._getOrCreate(this.pointLightList, scene);
            if (list.length >= 8) return list;
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        }
        return null;
    }

    public removeShadowLight(light: ILight): ILight[] | null {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        let list: ILight[];
        if (light.lightData.lightType === LightType.DirectionLight) {
            list = this.directionLightList.get(scene);
        } else {
            list = this.pointLightList.get(scene);
        }
        if (list) {
            const idx = list.indexOf(light);
            if (idx !== -1) list.splice(idx, 1);
        }
        light.lightData.castShadowIndex = -1;
        return list;
    }

    public update(view: View3D): void {
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

        // GlobalBindGroup.getAllCameraGroup() routes to the active engine's bind group
        // via ActiveEngineContext, which is set by Engine3D before calling update().
        const cameraGroup = GlobalBindGroup.getAllCameraGroup();
        cameraGroup.forEach((group: GlobalUniformGroup) => {
            group.dirShadowStart = nDirShadowStart;
            group.dirShadowEnd = nDirShadowEnd;
            group.pointShadowStart = nPointShadowStart;
            group.pointShadowEnd = nPointShadowEnd;
            group.shadowLights = shadowLights;
        });
    }

    private _getOrCreate(map: Map<Scene3D, ILight[]>, scene: Scene3D): ILight[] {
        let list = map.get(scene);
        if (!list) {
            list = [];
            map.set(scene, list);
        }
        return list;
    }

    // ---- Static backward-compat API ----

    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    private static _resolve(): ShadowLightsCollect {
        if (ActiveEngineContext.shadowLightsCollect instanceof ShadowLightsCollect) return ActiveEngineContext.shadowLightsCollect;
        if (!ShadowLightsCollect._default) ShadowLightsCollect._default = new ShadowLightsCollect();
        return ShadowLightsCollect._default;
    }

    /** @internal */
    private static _default: ShadowLightsCollect;

    /** @internal No-op: initialization now happens in the constructor. */
    public static init(): void {}

    public static get directionLightList(): Map<Scene3D, ILight[]> {
        return this._resolve().directionLightList;
    }

    public static get pointLightList(): Map<Scene3D, ILight[]> {
        return this._resolve().pointLightList;
    }

    public static get shadowLights(): Map<Scene3D, Float32Array> {
        return this._resolve().shadowLights;
    }

    public static createBuffer(view: View3D): void {
        this._resolve().createBuffer(view);
    }

    static getShadowLightList(light: ILight): ILight[] | null {
        return this._resolve().getShadowLightList(light);
    }

    static getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        return this._resolve().getShadowLightWhichScene(scene, type);
    }

    static getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return this._resolve().getDirectShadowLightWhichScene(scene);
    }

    static getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return this._resolve().getPointShadowLightWhichScene(scene);
    }

    static addShadowLight(light: ILight): ILight[] | null {
        return this._resolve().addShadowLight(light);
    }

    public static removeShadowLight(light: ILight): ILight[] | null {
        return this._resolve().removeShadowLight(light);
    }

    public static update(view: View3D): void {
        this._resolve().update(view);
    }
}
