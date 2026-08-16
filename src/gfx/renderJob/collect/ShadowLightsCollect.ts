import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';

/**
 * Per-engine-instance shadow/light collection.
 * Instance methods hold per-engine state; static shims delegate to current engine.
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    // --- Instance state ---
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
            this.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    public getShadowLightList(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        if (light.lightData.lightType === LightType.DirectionLight) {
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
        } else {
            let list = this.pointLightList.get(scene);
            if (list && list.length >= 8) return list;
            if (!list) { list = []; this.pointLightList.set(scene, list); }
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        }
    }

    public removeShadowLight(light: ILight): ILight[] | null {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        if (light.lightData.lightType === LightType.DirectionLight) {
            const list = this.directionLightList.get(scene);
            if (list) {
                const i = list.indexOf(light);
                if (i !== -1) list.splice(i, 1);
            }
            return list;
        } else {
            const list = this.pointLightList.get(scene);
            if (list) {
                const i = list.indexOf(light);
                if (i !== -1) list.splice(i, 1);
            }
            return list;
        }
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

        // Route through the engine's GlobalBindGroup instance
        const gbg = view.engine?.globalBindGroup;
        const cameraGroup = gbg?.getAllCameraGroup() ?? GlobalBindGroup.getAllCameraGroup();
        cameraGroup.forEach((group: GlobalUniformGroup) => {
            group.dirShadowStart = nDirShadowStart;
            group.dirShadowEnd = nDirShadowEnd;
            group.pointShadowStart = nPointShadowStart;
            group.pointShadowEnd = nPointShadowEnd;
            group.shadowLights = shadowLights;
        });
    }

    // --- Static backward-compat shims ---

    private static _getInstance(): ShadowLightsCollect | null {
        const Engine3D = (globalThis as any).__Engine3D__;
        return Engine3D?.current?.shadowLightsCollect ?? null;
    }

    public static init(): void {
        ShadowLightsCollect._getInstance()?.init();
    }

    public static createBuffer(view: View3D): void {
        const instance = view?.engine?.shadowLightsCollect ?? ShadowLightsCollect._getInstance();
        instance?.createBuffer(view);
    }

    public static getShadowLightList(light: ILight): ILight[] | null {
        const view = light?.transform?.view3D;
        const instance = view?.engine?.shadowLightsCollect ?? ShadowLightsCollect._getInstance();
        return instance?.getShadowLightList(light) ?? null;
    }

    public static getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        return ShadowLightsCollect._getInstance()?.getShadowLightWhichScene(scene, type) ?? [];
    }

    public static getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return ShadowLightsCollect._getInstance()?.getDirectShadowLightWhichScene(scene) ?? [];
    }

    public static getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return ShadowLightsCollect._getInstance()?.getPointShadowLightWhichScene(scene) ?? [];
    }

    public static addShadowLight(light: ILight): ILight[] | null {
        const view = light?.transform?.view3D;
        const instance = view?.engine?.shadowLightsCollect ?? ShadowLightsCollect._getInstance();
        return instance?.addShadowLight(light) ?? null;
    }

    public static removeShadowLight(light: ILight): ILight[] | null {
        const view = light?.transform?.view3D;
        const instance = view?.engine?.shadowLightsCollect ?? ShadowLightsCollect._getInstance();
        return instance?.removeShadowLight(light) ?? null;
    }

    public static update(view: View3D): void {
        const instance = view?.engine?.shadowLightsCollect ?? ShadowLightsCollect._getInstance();
        instance?.update(view);
    }
}
