import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';
import { getCurrentEngine } from '../../../engineRegistry';

/**
 * Per-engine shadow-light registry.
 * Static methods are compatibility shims that delegate to the active engine instance.
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    // ── Instance fields ────────────────────────────────────────────────────

    public directionLightList: Map<Scene3D, ILight[]> = new Map();
    public pointLightList: Map<Scene3D, ILight[]> = new Map();
    public shadowLights: Map<Scene3D, Float32Array> = new Map();

    // ── Instance methods ───────────────────────────────────────────────────

    init() {
        this.directionLightList = new Map<Scene3D, ILight[]>();
        this.pointLightList = new Map<Scene3D, ILight[]>();
        this.shadowLights = new Map<Scene3D, Float32Array>();
    }

    createBuffer(view: View3D) {
        if (!this.shadowLights.has(view.scene)) {
            this.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    getShadowLightList(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        if (light.lightData.lightType === LightType.DirectionLight) {
            return this._getOrCreateList(this.directionLightList, scene);
        }
        return this._getOrCreateList(this.pointLightList, scene);
    }

    getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        if (type === LightType.DirectionLight) {
            return this._getOrCreateList(this.directionLightList, scene);
        }
        return this._getOrCreateList(this.pointLightList, scene);
    }

    getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return this._getOrCreateList(this.directionLightList, scene);
    }

    getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return this._getOrCreateList(this.pointLightList, scene);
    }

    addShadowLight(light: ILight): ILight[] | null {
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;

        if (light.lightData.lightType === LightType.DirectionLight) {
            const list = this._getOrCreateList(this.directionLightList, scene);
            if (!light.shadowCamera) {
                light.shadowCamera = CameraUtil.createCamera3DObject(null, 'shadowCamera');
                light.shadowCamera.isShadowCamera = true;
                const b = -1000;
                light.shadowCamera.orthoOffCenter(b, -b, b, -b, 1, 10000);
            }
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        }

        if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            const list = this._getOrCreateList(this.pointLightList, scene);
            if (list.length >= 8) return list;
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        }

        return null;
    }

    removeShadowLight(light: ILight): ILight[] | null {
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
        }

        if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            const list = this.pointLightList.get(scene);
            if (list) {
                const i = list.indexOf(light);
                if (i !== -1) list.splice(i, 1);
            }
            return list;
        }

        return null;
    }

    update(view: View3D) {
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

        const gbg = (view?.engine ?? getCurrentEngine())?.globalBindGroup;
        if (!gbg) return;

        gbg.getAllCameraGroup().forEach((group: GlobalUniformGroup) => {
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

    // ── Static compatibility shims ─────────────────────────────────────────

    /** @internal */
    public static init() { ShadowLightsCollect._get()?.init(); }

    /** @internal */
    public static createBuffer(view: View3D) {
        ShadowLightsCollect._resolve(view)?.createBuffer(view);
    }

    /** @internal */
    public static getShadowLightList(light: ILight): ILight[] | null {
        return ShadowLightsCollect._resolve(light.transform?.view3D)?.getShadowLightList(light) ?? null;
    }

    /** @internal */
    public static getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        return ShadowLightsCollect._get()?.getShadowLightWhichScene(scene, type) ?? [];
    }

    /** @internal */
    public static getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return ShadowLightsCollect._get()?.getDirectShadowLightWhichScene(scene) ?? [];
    }

    /** @internal */
    public static getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return ShadowLightsCollect._get()?.getPointShadowLightWhichScene(scene) ?? [];
    }

    /** @internal */
    public static addShadowLight(light: ILight): ILight[] | null {
        return ShadowLightsCollect._resolve(light.transform?.view3D)?.addShadowLight(light) ?? null;
    }

    /** @internal */
    public static removeShadowLight(light: ILight): ILight[] | null {
        return ShadowLightsCollect._resolve(light.transform?.view3D)?.removeShadowLight(light) ?? null;
    }

    /** @internal */
    public static update(view: View3D) {
        ShadowLightsCollect._resolve(view)?.update(view);
    }

    /** @internal */
    public static get directionLightList(): Map<Scene3D, ILight[]> {
        return ShadowLightsCollect._get()?.directionLightList ?? new Map();
    }

    /** @internal */
    public static get pointLightList(): Map<Scene3D, ILight[]> {
        return ShadowLightsCollect._get()?.pointLightList ?? new Map();
    }

    /** @internal */
    public static get shadowLights(): Map<Scene3D, Float32Array> {
        return ShadowLightsCollect._get()?.shadowLights ?? new Map();
    }

    private static _resolve(view: View3D | null | undefined): ShadowLightsCollect | null {
        if (view?.engine) return view.engine.shadowLightsCollect;
        return getCurrentEngine()?.shadowLightsCollect ?? null;
    }

    private static _get(): ShadowLightsCollect | null {
        return getCurrentEngine()?.shadowLightsCollect ?? null;
    }
}
