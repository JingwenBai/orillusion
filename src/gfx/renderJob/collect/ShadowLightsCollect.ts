import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { activeEngine } from '../../../core/EngineContext';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';

/**
 * Per-Engine3D shadow light tracker.
 * Static methods delegate to the currently active Engine3D instance.
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    public static readonly maxNumDirectionShadow = 8;
    public static readonly maxNumPointShadow = 8;

    // ─── Instance state ───────────────────────────────────────────────────────

    public directionLightList: Map<Scene3D, ILight[]>;
    public pointLightList: Map<Scene3D, ILight[]>;
    public shadowLights: Map<Scene3D, Float32Array>;

    constructor() {
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
            return this._getOrCreate(this.directionLightList, scene);
        } else if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            return this._getOrCreate(this.pointLightList, scene);
        }
        return null;
    }

    public getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        if (type === LightType.DirectionLight) {
            return this._getOrCreate(this.directionLightList, scene);
        } else if (type === LightType.PointLight) {
            return this._getOrCreate(this.pointLightList, scene);
        }
        return [];
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
            if (list.indexOf(light) === -1) {
                list.push(light);
            }
            return list;
        } else if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            let list = this.pointLightList.get(scene);
            if (list && list.length >= 8) return list;
            if (!list) {
                list = [];
                this.pointLightList.set(scene, list);
            }
            if (list.indexOf(light) === -1) {
                list.push(light);
            }
            return list;
        }
        return null;
    }

    public removeShadowLight(light: ILight): ILight[] | null {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;

        if (light.lightData.lightType === LightType.DirectionLight) {
            const list = this.directionLightList.get(scene);
            if (list) {
                const index = list.indexOf(light);
                if (index !== -1) list.splice(index, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list ?? null;
        } else if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            const list = this.pointLightList.get(scene);
            if (list) {
                const index = list.indexOf(light);
                if (index !== -1) list.splice(index, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list ?? null;
        }
        return null;
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

    // ─── Static delegates → active engine's shadowLightsCollect ──────────────

    /** @deprecated Use engine.shadowLightsCollect directly for multi-instance setups */
    public static createBuffer(view: View3D): void {
        activeEngine?.shadowLightsCollect?.createBuffer(view);
    }

    /** @deprecated Use engine.shadowLightsCollect directly for multi-instance setups */
    public static getShadowLightList(light: ILight): ILight[] | null {
        return activeEngine?.shadowLightsCollect?.getShadowLightList(light) ?? null;
    }

    /** @deprecated Use engine.shadowLightsCollect directly for multi-instance setups */
    public static getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        return activeEngine?.shadowLightsCollect?.getShadowLightWhichScene(scene, type) ?? [];
    }

    /** @deprecated Use engine.shadowLightsCollect directly for multi-instance setups */
    public static getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return activeEngine?.shadowLightsCollect?.getDirectShadowLightWhichScene(scene) ?? [];
    }

    /** @deprecated Use engine.shadowLightsCollect directly for multi-instance setups */
    public static getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return activeEngine?.shadowLightsCollect?.getPointShadowLightWhichScene(scene) ?? [];
    }

    /** @deprecated Use engine.shadowLightsCollect directly for multi-instance setups */
    public static addShadowLight(light: ILight): ILight[] | null {
        return activeEngine?.shadowLightsCollect?.addShadowLight(light) ?? null;
    }

    /** @deprecated Use engine.shadowLightsCollect directly for multi-instance setups */
    public static removeShadowLight(light: ILight): ILight[] | null {
        return activeEngine?.shadowLightsCollect?.removeShadowLight(light) ?? null;
    }

    /** @deprecated Use engine.shadowLightsCollect directly for multi-instance setups */
    public static update(view: View3D): void {
        activeEngine?.shadowLightsCollect?.update(view);
    }
}
