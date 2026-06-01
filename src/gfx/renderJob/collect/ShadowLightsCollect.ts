import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';

/**
 * @internal
 * Per-engine shadow-light registry.
 * Instantiated by Engine3D; static methods route to the correct instance.
 * @group Lights
 */
export class ShadowLightsCollect {

    // ─── Constants ────────────────────────────────────────────────────────────

    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    // ─── Instance state ───────────────────────────────────────────────────────

    public directionLightList: Map<Scene3D, ILight[]> = new Map();
    public pointLightList: Map<Scene3D, ILight[]> = new Map();
    public shadowLights: Map<Scene3D, Float32Array> = new Map();

    // ─── Instance methods ─────────────────────────────────────────────────────

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
            return this._getOrCreateList(this.directionLightList, scene);
        }
        if (type === LightType.PointLight || type === LightType.SpotLight) {
            return this._getOrCreateList(this.pointLightList, scene);
        }
        return null;
    }

    public getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        if (type === LightType.DirectionLight) {
            return this._getOrCreateList(this.directionLightList, scene);
        }
        return this._getOrCreateList(this.pointLightList, scene);
    }

    public getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return this._getOrCreateList(this.directionLightList, scene);
    }

    public getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return this._getOrCreateList(this.pointLightList, scene);
    }

    public addShadowLight(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        const type = light.lightData.lightType;

        if (type === LightType.DirectionLight) {
            const list = this._getOrCreateList(this.directionLightList, scene);
            if (!light.shadowCamera) {
                light.shadowCamera = CameraUtil.createCamera3DObject(null, 'shadowCamera');
                light.shadowCamera.isShadowCamera = true;
                const shadowBound = -1000;
                light.shadowCamera.orthoOffCenter(shadowBound, -shadowBound, shadowBound, -shadowBound, 1, 10000);
            }
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        }

        if (type === LightType.PointLight || type === LightType.SpotLight) {
            const list = this._getOrCreateList(this.pointLightList, scene);
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
        const type = light.lightData.lightType;

        const map = (type === LightType.DirectionLight) ? this.directionLightList : this.pointLightList;
        const list = map.get(scene);
        if (list) {
            const index = list.indexOf(light);
            if (index !== -1) list.splice(index, 1);
            return list;
        }
        return null;
    }

    public update(view: View3D, globalBindGroup: GlobalBindGroup) {
        let shadowLights = this.shadowLights.get(view.scene);
        if (!shadowLights) {
            shadowLights = new Float32Array(16);
            this.shadowLights.set(view.scene, shadowLights);
        }

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

    private _getOrCreateList(map: Map<Scene3D, ILight[]>, scene: Scene3D): ILight[] {
        let list = map.get(scene);
        if (!list) {
            list = [];
            map.set(scene, list);
        }
        return list;
    }

    // ─── Static backward-compat API ───────────────────────────────────────────

    /** @internal Set by Engine3D before each render frame. */
    public static _currentRenderingInstance: ShadowLightsCollect | null = null;

    /** @internal Set by Engine3D on first init. */
    public static _defaultInstance: ShadowLightsCollect | null = null;

    /** @deprecated Use engine.shadowLightsCollect directly. */
    public static init() {
        // No-op: instances created by Engine3D.
    }

    public static createBuffer(view: View3D) {
        _get(view?.engine?.shadowLightsCollect).createBuffer(view);
    }

    public static getShadowLightList(light: ILight): ILight[] | null {
        const inst = light.transform?.view3D?.engine?.shadowLightsCollect ?? _getDefault();
        return inst?.getShadowLightList(light) ?? null;
    }

    public static getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        return _getScene(scene).getShadowLightWhichScene(scene, type);
    }

    public static getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return _getScene(scene).getDirectShadowLightWhichScene(scene);
    }

    public static getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return _getScene(scene).getPointShadowLightWhichScene(scene);
    }

    public static addShadowLight(light: ILight): ILight[] | null {
        const inst = light.transform?.view3D?.engine?.shadowLightsCollect ?? _getDefault();
        return inst?.addShadowLight(light) ?? null;
    }

    public static removeShadowLight(light: ILight): ILight[] | null {
        const inst = light.transform?.view3D?.engine?.shadowLightsCollect ?? _getDefault();
        return inst?.removeShadowLight(light) ?? null;
    }

    public static update(view: View3D) {
        const inst = view?.engine?.shadowLightsCollect ?? _getDefault();
        const gbg = view?.engine?.globalBindGroup ?? GlobalBindGroup._defaultInstance;
        if (inst && gbg) inst.update(view, gbg);
    }
}

function _getDefault(): ShadowLightsCollect | null {
    return ShadowLightsCollect._currentRenderingInstance ?? ShadowLightsCollect._defaultInstance;
}

function _get(preferred: ShadowLightsCollect | undefined): ShadowLightsCollect {
    const inst = preferred ?? _getDefault();
    if (!inst) throw new Error('ShadowLightsCollect: no Engine3D instance initialised');
    return inst;
}

function _getScene(scene: Scene3D): ShadowLightsCollect {
    return _get(scene?.view?.engine?.shadowLightsCollect);
}
