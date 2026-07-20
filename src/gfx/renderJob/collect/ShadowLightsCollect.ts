import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';
import { getCurrentEngine } from '../../EngineContext';

/**
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    // ------------------------------------------------------------------ //
    // Static proxy — forward to current engine's instance
    // ------------------------------------------------------------------ //

    public static get directionLightList(): Map<Scene3D, ILight[]> {
        return getCurrentEngine()?.shadowLightsCollect?.directionLightList;
    }
    public static get pointLightList(): Map<Scene3D, ILight[]> {
        return getCurrentEngine()?.shadowLightsCollect?.pointLightList;
    }
    public static get shadowLights(): Map<Scene3D, Float32Array> {
        return getCurrentEngine()?.shadowLightsCollect?.shadowLights;
    }

    public static init(): void {
        getCurrentEngine()?.shadowLightsCollect?.init();
    }
    public static createBuffer(view: View3D): void {
        getCurrentEngine()?.shadowLightsCollect?.createBuffer(view);
    }
    public static getShadowLightList(light: ILight): ILight[] {
        return getCurrentEngine()?.shadowLightsCollect?.getShadowLightList(light);
    }
    public static getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        return getCurrentEngine()?.shadowLightsCollect?.getShadowLightWhichScene(scene, type);
    }
    public static getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return getCurrentEngine()?.shadowLightsCollect?.getDirectShadowLightWhichScene(scene);
    }
    public static getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return getCurrentEngine()?.shadowLightsCollect?.getPointShadowLightWhichScene(scene);
    }
    public static addShadowLight(light: ILight): ILight[] {
        return getCurrentEngine()?.shadowLightsCollect?.addShadowLight(light);
    }
    public static removeShadowLight(light: ILight): ILight[] {
        return getCurrentEngine()?.shadowLightsCollect?.removeShadowLight(light);
    }
    public static update(view: View3D): void {
        getCurrentEngine()?.shadowLightsCollect?.update(view);
    }

    // ------------------------------------------------------------------ //
    // Instance data
    // ------------------------------------------------------------------ //

    public directionLightList: Map<Scene3D, ILight[]>;
    public pointLightList: Map<Scene3D, ILight[]>;
    public shadowLights: Map<Scene3D, Float32Array>;

    constructor() {
        this.init();
    }

    public init(): void {
        this.directionLightList = new Map<Scene3D, ILight[]>();
        this.pointLightList = new Map<Scene3D, ILight[]>();
        this.shadowLights = new Map<Scene3D, Float32Array>();
    }

    public createBuffer(view: View3D): void {
        if (!this.shadowLights.has(view.scene)) {
            this.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    public getShadowLightList(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        if (light.lightData.lightType === LightType.DirectionLight) {
            return this._getOrCreate(this.directionLightList, light.transform.view3D.scene);
        } else if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            return this._getOrCreate(this.pointLightList, light.transform.view3D.scene);
        }
        return null;
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
        } else if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            list = this.pointLightList.get(scene);
        }

        if (list) {
            const index = list.indexOf(light);
            if (index !== -1) list.splice(index, 1);
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

        // Use the engine's own GlobalBindGroup instance
        const engine = getCurrentEngine();
        const bindGroup = engine?.globalBindGroup ?? GlobalBindGroup;
        const cameraGroup = bindGroup.getAllCameraGroup();
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
}
