import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';

/**
 * Per-engine shadow-light registry.
 * Static proxy methods keep backward compatibility and route through
 * `view.engine.shadowLightsCollect` or `scene.view.engine.shadowLightsCollect`.
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    // ── instance fields ──────────────────────────────────────────────────────
    public directionLightList: Map<Scene3D, ILight[]> = new Map();
    public pointLightList: Map<Scene3D, ILight[]> = new Map();
    public shadowLights: Map<Scene3D, Float32Array> = new Map();

    // ── static proxy methods (backward compat) ───────────────────────────────

    /** @deprecated Use view.engine.shadowLightsCollect.createBuffer(view) */
    public static createBuffer(view: View3D) {
        view?.engine?.shadowLightsCollect?.createBuffer(view);
    }

    public static getShadowLightList(light: ILight) {
        return light.transform?.view3D?.engine?.shadowLightsCollect?.getShadowLightList(light) ?? null;
    }

    public static getShadowLightWhichScene(scene: Scene3D, type: LightType) {
        return scene?.view?.engine?.shadowLightsCollect?.getShadowLightWhichScene(scene, type) ?? [];
    }

    public static getDirectShadowLightWhichScene(scene: Scene3D) {
        return scene?.view?.engine?.shadowLightsCollect?.getDirectShadowLightWhichScene(scene) ?? [];
    }

    public static getPointShadowLightWhichScene(scene: Scene3D) {
        return scene?.view?.engine?.shadowLightsCollect?.getPointShadowLightWhichScene(scene) ?? [];
    }

    public static addShadowLight(light: ILight) {
        return light.transform?.view3D?.engine?.shadowLightsCollect?.addShadowLight(light) ?? null;
    }

    public static removeShadowLight(light: ILight) {
        return light.transform?.view3D?.engine?.shadowLightsCollect?.removeShadowLight(light) ?? null;
    }

    public static update(view: View3D) {
        view?.engine?.shadowLightsCollect?.update(view);
    }

    // ── instance methods ──────────────────────────────────────────────────────

    public createBuffer(view: View3D) {
        if (!this.shadowLights.has(view.scene)) {
            this.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    public getShadowLightList(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        if (light.lightData.lightType === LightType.DirectionLight) {
            return this._ensureList(this.directionLightList, scene);
        } else {
            return this._ensureList(this.pointLightList, scene);
        }
    }

    public getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        if (type === LightType.DirectionLight) {
            return this._ensureList(this.directionLightList, scene);
        }
        return this._ensureList(this.pointLightList, scene);
    }

    public getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return this._ensureList(this.directionLightList, scene);
    }

    public getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return this._ensureList(this.pointLightList, scene);
    }

    public addShadowLight(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;

        if (light.lightData.lightType === LightType.DirectionLight) {
            const list = this._ensureList(this.directionLightList, scene);
            if (!light.shadowCamera) {
                light.shadowCamera = CameraUtil.createCamera3DObject(null, 'shadowCamera');
                light.shadowCamera.isShadowCamera = true;
                const shadowBound = -1000;
                light.shadowCamera.orthoOffCenter(shadowBound, -shadowBound, shadowBound, -shadowBound, 1, 10000);
            }
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        } else {
            const list = this._ensureList(this.pointLightList, scene);
            if (list.length >= 8) return list;
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
            light.lightData.castShadowIndex = -1;
            return list;
        } else {
            const list = this.pointLightList.get(scene);
            if (list) {
                const i = list.indexOf(light);
                if (i !== -1) list.splice(i, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        }
    }

    public update(view: View3D) {
        const shadowLights = this.shadowLights.get(view.scene);
        if (!shadowLights) return;

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

    private _ensureList(map: Map<Scene3D, ILight[]>, scene: Scene3D): ILight[] {
        let list = map.get(scene);
        if (!list) {
            list = [];
            map.set(scene, list);
        }
        return list;
    }
}
