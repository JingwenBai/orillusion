import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';

/**
 * Per-engine shadow light registry.
 * Create one instance per Engine3D; access via Engine3D.shadowLightsCollect.
 * The static methods are backward-compat proxies that route through view.engine.
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    // ========== INSTANCE STATE ==========

    public maxNumDirectionShadow: number = 8;
    public maxNumPointShadow: number = 8;

    public directionLightList: Map<Scene3D, ILight[]>;
    public pointLightList: Map<Scene3D, ILight[]>;
    public shadowLights: Map<Scene3D, Float32Array>;

    constructor() {
        this.directionLightList = new Map();
        this.pointLightList = new Map();
        this.shadowLights = new Map();
    }

    // ========== INSTANCE METHODS ==========

    public createBuffer(view: View3D) {
        if (!this.shadowLights.has(view.scene)) {
            this.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    public getShadowLightList(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (!list) {
                list = [];
                this.directionLightList.set(scene, list);
            }
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = this.pointLightList.get(scene);
            if (!list) {
                list = [];
                this.pointLightList.set(scene, list);
            }
            return list;
        }
        return null;
    }

    public getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        if (type == LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (!list) {
                list = [];
                this.directionLightList.set(scene, list);
            }
            return list;
        } else {
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

    public addShadowLight(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;

        if (light.lightData.lightType == LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (!list) {
                list = [];
                this.directionLightList.set(scene, list);
            }
            if (!light.shadowCamera) {
                light.shadowCamera = CameraUtil.createCamera3DObject(null, 'shadowCamera');
                light.shadowCamera.isShadowCamera = true;
                const shadowBound = -1000;
                light.shadowCamera.orthoOffCenter(shadowBound, -shadowBound, shadowBound, -shadowBound, 1, 10000);
            }
            if (list.indexOf(light) == -1) list.push(light);
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            let list = this.pointLightList.get(scene);
            if (list && list.length >= 8) return list;
            if (!list) {
                list = [];
                this.pointLightList.set(scene, list);
            }
            if (list.indexOf(light) == -1) list.push(light);
            return list;
        }
        return null;
    }

    public removeShadowLight(light: ILight): ILight[] | null {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;

        if (light.lightData.lightType == LightType.DirectionLight) {
            const list = this.directionLightList.get(light.transform.view3D.scene);
            if (list) {
                const index = list.indexOf(light);
                if (index != -1) list.splice(index, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        } else if (light.lightData.lightType == LightType.PointLight || light.lightData.lightType == LightType.SpotLight) {
            const list = this.pointLightList.get(light.transform.view3D.scene);
            if (list) {
                const index = list.indexOf(light);
                if (index != -1) list.splice(index, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        }
        return null;
    }

    public update(view: View3D, globalBindGroup: GlobalBindGroup) {
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

        const cameraGroup = globalBindGroup.getAllCameraGroup();
        cameraGroup.forEach((group: GlobalUniformGroup) => {
            group.dirShadowStart = nDirShadowStart;
            group.dirShadowEnd = nDirShadowEnd;
            group.pointShadowStart = nPointShadowStart;
            group.pointShadowEnd = nPointShadowEnd;
            group.shadowLights = shadowLights;
        });
    }

    // ========== STATIC PROXY ==========

    private static _current: ShadowLightsCollect = new ShadowLightsCollect();

    /** @internal Switch the static proxy to the given engine's ShadowLightsCollect. */
    public static setCurrent(instance: ShadowLightsCollect): void {
        ShadowLightsCollect._current = instance;
    }

    // Legacy static fields kept as getters for backward compat
    public static get maxNumDirectionShadow(): number { return ShadowLightsCollect._current.maxNumDirectionShadow; }
    public static set maxNumDirectionShadow(v: number) { ShadowLightsCollect._current.maxNumDirectionShadow = v; }
    public static get maxNumPointShadow(): number { return ShadowLightsCollect._current.maxNumPointShadow; }
    public static set maxNumPointShadow(v: number) { ShadowLightsCollect._current.maxNumPointShadow = v; }
    public static get directionLightList(): Map<Scene3D, ILight[]> { return ShadowLightsCollect._current.directionLightList; }
    public static get pointLightList(): Map<Scene3D, ILight[]> { return ShadowLightsCollect._current.pointLightList; }
    public static get shadowLights(): Map<Scene3D, Float32Array> { return ShadowLightsCollect._current.shadowLights; }

    private static _resolve(light: ILight): ShadowLightsCollect {
        return (light?.transform?.view3D as any)?.engine?.shadowLightsCollect ?? ShadowLightsCollect._current;
    }

    private static _resolveByView(view: View3D): ShadowLightsCollect {
        return (view as any)?.engine?.shadowLightsCollect ?? ShadowLightsCollect._current;
    }

    public static init() {
        // No-op: initialization is now done in the constructor; kept for API compat.
    }

    public static createBuffer(view: View3D) {
        ShadowLightsCollect._resolveByView(view).createBuffer(view);
    }

    static getShadowLightList(light: ILight): ILight[] | null {
        return ShadowLightsCollect._resolve(light).getShadowLightList(light);
    }

    static getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        return ShadowLightsCollect._current.getShadowLightWhichScene(scene, type);
    }

    static getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return ShadowLightsCollect._current.getDirectShadowLightWhichScene(scene);
    }

    static getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return ShadowLightsCollect._current.getPointShadowLightWhichScene(scene);
    }

    static addShadowLight(light: ILight): ILight[] | null {
        return ShadowLightsCollect._resolve(light).addShadowLight(light);
    }

    public static removeShadowLight(light: ILight): ILight[] | null {
        return ShadowLightsCollect._resolve(light).removeShadowLight(light);
    }

    public static update(view: View3D) {
        const slc = ShadowLightsCollect._resolveByView(view);
        slc.update(view, GlobalBindGroup.getCurrent((view as any)?.engine));
    }
}
