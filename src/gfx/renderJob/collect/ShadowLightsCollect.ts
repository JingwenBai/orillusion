import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { EngineContext } from '../../../EngineContext';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';

/**
 * @internal
 * Per-engine shadow light registry.
 *
 * Static methods are backward-compatible facades that delegate to the active
 * engine's instance (EngineContext.current.shadowLightsCollect).
 *
 * @group Lights
 */
export class ShadowLightsCollect {

    // ─── Shared constants (not per-engine) ───────────────────────────────────

    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    // ─── Instance data (per Engine3D) ────────────────────────────────────────

    public directionLightList: Map<Scene3D, ILight[]>;
    public pointLightList: Map<Scene3D, ILight[]>;
    public shadowLights: Map<Scene3D, Float32Array>;

    constructor() {
        this.directionLightList = new Map();
        this.pointLightList = new Map();
        this.shadowLights = new Map();
    }

    // ─── Instance methods ─────────────────────────────────────────────────────

    public createBuffer(view: View3D) {
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
        if (type === LightType.DirectionLight) {
            return this._getOrCreate(this.directionLightList, scene);
        } else {
            return this._getOrCreate(this.pointLightList, scene);
        }
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
                const b = -1000;
                light.shadowCamera.orthoOffCenter(b, -b, b, -b, 1, 10000);
            }
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        } else {
            // PointLight and SpotLight share the pointLightList
            const list = this._getOrCreate(this.pointLightList, scene);
            if (list.length >= 8) return list;
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        }
    }

    public removeShadowLight(light: ILight): ILight[] | null {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        const map = light.lightData.lightType === LightType.DirectionLight
            ? this.directionLightList
            : this.pointLightList;
        const list = map.get(scene);
        if (list) {
            const idx = list.indexOf(light);
            if (idx !== -1) list.splice(idx, 1);
        }
        light.lightData.castShadowIndex = -1;
        return list;
    }

    public update(view: View3D) {
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
        if (cameraGroup) {
            cameraGroup.forEach((group: GlobalUniformGroup) => {
                group.dirShadowStart = nDirShadowStart;
                group.dirShadowEnd = nDirShadowEnd;
                group.pointShadowStart = nPointShadowStart;
                group.pointShadowEnd = nPointShadowEnd;
                group.shadowLights = shadowLights;
            });
        }
    }

    private _getOrCreate(map: Map<Scene3D, ILight[]>, scene: Scene3D): ILight[] {
        let list = map.get(scene);
        if (!list) {
            list = [];
            map.set(scene, list);
        }
        return list;
    }

    // ─── Static backward-compatible facades ──────────────────────────────────

    private static get _inst(): ShadowLightsCollect {
        return EngineContext.current?.shadowLightsCollect;
    }

    public static createBuffer(view: View3D) {
        ShadowLightsCollect._inst?.createBuffer(view);
    }

    public static getShadowLightList(light: ILight) {
        return ShadowLightsCollect._inst?.getShadowLightList(light) ?? null;
    }

    public static getShadowLightWhichScene(scene: Scene3D, type: LightType) {
        return ShadowLightsCollect._inst?.getShadowLightWhichScene(scene, type);
    }

    public static getDirectShadowLightWhichScene(scene: Scene3D) {
        return ShadowLightsCollect._inst?.getDirectShadowLightWhichScene(scene);
    }

    public static getPointShadowLightWhichScene(scene: Scene3D) {
        return ShadowLightsCollect._inst?.getPointShadowLightWhichScene(scene);
    }

    public static addShadowLight(light: ILight) {
        return ShadowLightsCollect._inst?.addShadowLight(light) ?? null;
    }

    public static removeShadowLight(light: ILight) {
        return ShadowLightsCollect._inst?.removeShadowLight(light) ?? null;
    }

    public static update(view: View3D) {
        ShadowLightsCollect._inst?.update(view);
    }

    /** @deprecated Called automatically by Engine3D.init(). Kept for compatibility. */
    public static init() {
        // no-op: initialization now happens in the ShadowLightsCollect constructor
        // which is called by Engine3D during init().
    }
}
