import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';

/**
 * Per-engine instance data for shadow lights management
 * @internal
 */
export class ShadowLightsCollectData {
    public maxNumDirectionShadow: number = 8;
    public maxNumPointShadow: number = 8;

    public directionLightList: Map<Scene3D, ILight[]>;
    public pointLightList: Map<Scene3D, ILight[]>;
    public shadowLights: Map<Scene3D, Float32Array>;

    public init(): void {
        this.directionLightList = new Map<Scene3D, ILight[]>();
        this.pointLightList = new Map<Scene3D, ILight[]>();
        this.shadowLights = new Map<Scene3D, Float32Array>();
    }

    public createBuffer(view: View3D): void {
        if (!this.shadowLights.has(view.scene)) {
            let list = new Float32Array(16);
            this.shadowLights.set(view.scene, list);
        }
    }

    public getShadowLightList(light: ILight): ILight[] | null | undefined {
        if (!light.transform.view3D) return null;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this.directionLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                this.directionLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        } else if (light.lightData.lightType == LightType.PointLight) {
            let list = this.pointLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                this.pointLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        } else if (light.lightData.lightType == LightType.SpotLight) {
            let list = this.pointLightList.get(light.transform.view3D.scene);
            if (!list) {
                list = [];
                this.pointLightList.set(light.transform.view3D.scene, list);
            }
            return list;
        }
        return null;
    }

    public getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] | undefined {
        if (type == LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (!list) {
                list = [];
                this.directionLightList.set(scene, list);
            }
            return list;
        } else if (type == LightType.PointLight) {
            let list = this.pointLightList.get(scene);
            if (!list) {
                list = [];
                this.pointLightList.set(scene, list);
            }
            return list;
        }
    }

    public getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        let list = this.directionLightList.get(scene);
        if (!list) {
            list = [];
            this.directionLightList.set(scene, list);
        }
        return list;
    }

    public getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        let list = this.pointLightList.get(scene);
        if (!list) {
            list = [];
            this.pointLightList.set(scene, list);
        }
        return list;
    }

    public addShadowLight(light: ILight): ILight[] | null | undefined {
        if (!light.transform.view3D) return null;
        let scene = light.transform.view3D.scene;

        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (!list) {
                list = [];
                this.directionLightList.set(scene, list);
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
            let list = this.pointLightList.get(scene);
            if (list && list.length >= 8) {
                return list;
            }
            if (!list) {
                list = [];
                this.pointLightList.set(scene, list);
            }
            if (list.indexOf(light) == -1) {
                list.push(light);
            }
            return list;
        }
        return null;
    }

    public removeShadowLight(light: ILight): ILight[] | null | undefined {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this.directionLightList.get(light.transform.view3D.scene);
            if (list) {
                let index = list.indexOf(light);
                if (index != -1) {
                    list.splice(index, 1);
                }
            }
            light.lightData.castShadowIndex = -1;
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = this.pointLightList.get(light.transform.view3D.scene);
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
        let shadowLights = this.shadowLights.get(view.scene);
        let directionLightList = this.directionLightList.get(view.scene);
        let pointLightList = this.pointLightList.get(view.scene);

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

let _current: ShadowLightsCollectData | null = null;

export function setCurrentShadowLightsCollect(data: ShadowLightsCollectData): void {
    _current = data;
}

/**
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    public static get maxNumDirectionShadow(): number {
        return _current!.maxNumDirectionShadow;
    }
    public static set maxNumDirectionShadow(value: number) {
        _current!.maxNumDirectionShadow = value;
    }

    public static get maxNumPointShadow(): number {
        return _current!.maxNumPointShadow;
    }
    public static set maxNumPointShadow(value: number) {
        _current!.maxNumPointShadow = value;
    }

    public static get directionLightList(): Map<Scene3D, ILight[]> {
        return _current!.directionLightList;
    }
    public static set directionLightList(value: Map<Scene3D, ILight[]>) {
        _current!.directionLightList = value;
    }

    public static get pointLightList(): Map<Scene3D, ILight[]> {
        return _current!.pointLightList;
    }
    public static set pointLightList(value: Map<Scene3D, ILight[]>) {
        _current!.pointLightList = value;
    }

    public static get shadowLights(): Map<Scene3D, Float32Array> {
        return _current!.shadowLights;
    }
    public static set shadowLights(value: Map<Scene3D, Float32Array>) {
        _current!.shadowLights = value;
    }

    public static init(): void {
        _current!.init();
    }

    public static createBuffer(view: View3D): void {
        _current!.createBuffer(view);
    }

    static getShadowLightList(light: ILight): ILight[] | null | undefined {
        return _current!.getShadowLightList(light);
    }

    static getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] | undefined {
        return _current!.getShadowLightWhichScene(scene, type);
    }

    static getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return _current!.getDirectShadowLightWhichScene(scene);
    }

    static getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return _current!.getPointShadowLightWhichScene(scene);
    }

    static addShadowLight(light: ILight): ILight[] | null | undefined {
        return _current!.addShadowLight(light);
    }

    public static removeShadowLight(light: ILight): ILight[] | null | undefined {
        return _current!.removeShadowLight(light);
    }

    public static update(view: View3D): void {
        _current!.update(view);
    }
}
