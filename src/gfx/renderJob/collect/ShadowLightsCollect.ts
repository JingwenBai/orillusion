import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { engineRef } from '../../../EngineRef';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';

/**
 * Per-Engine3D shadow-light registry.
 * Each Engine3D instance owns one ShadowLightsCollect.
 * Static methods delegate to the active engine's instance for backward compatibility.
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    public maxNumDirectionShadow = 8;
    public maxNumPointShadow = 8;

    public directionLightList: Map<Scene3D, ILight[]>;
    public pointLightList: Map<Scene3D, ILight[]>;
    public shadowLights: Map<Scene3D, Float32Array>;

    constructor() {
        this.directionLightList = new Map<Scene3D, ILight[]>();
        this.pointLightList = new Map<Scene3D, ILight[]>();
        this.shadowLights = new Map<Scene3D, Float32Array>();
    }

    // ---- instance methods ----

    _createBuffer(view: View3D) {
        if (!this.shadowLights.has(view.scene)) {
            this.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    _getShadowLightList(light: ILight): ILight[] | null {
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

    _getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
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

    _getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        let list = this.directionLightList.get(scene);
        if (!list) { list = []; this.directionLightList.set(scene, list); }
        return list;
    }

    _getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        let list = this.pointLightList.get(scene);
        if (!list) { list = []; this.pointLightList.set(scene, list); }
        return list;
    }

    _addShadowLight(light: ILight): ILight[] | null {
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

    _removeShadowLight(light: ILight): ILight[] | null {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        if (light.lightData.lightType === LightType.DirectionLight) {
            let list = this.directionLightList.get(light.transform.view3D.scene);
            if (list) {
                const idx = list.indexOf(light);
                if (idx !== -1) list.splice(idx, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        } else {
            let list = this.pointLightList.get(light.transform.view3D.scene);
            if (list) {
                const idx = list.indexOf(light);
                if (idx !== -1) list.splice(idx, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        }
    }

    _update(view: View3D) {
        let shadowLights = this.shadowLights.get(view.scene);
        let directionLightList = this.directionLightList.get(view.scene);
        let pointLightList = this.pointLightList.get(view.scene);

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

        let cameraGroup = GlobalBindGroup.getAllCameraGroup();
        cameraGroup.forEach((group: GlobalUniformGroup) => {
            group.dirShadowStart = nDirShadowStart;
            group.dirShadowEnd = nDirShadowEnd;
            group.pointShadowStart = nPointShadowStart;
            group.pointShadowEnd = nPointShadowEnd;
            group.shadowLights = shadowLights;
        });
    }

    // ---- static backward-compat API ----

    /** Resolve using view.engine first, then the active engine. */
    private static _get(view?: View3D): ShadowLightsCollect {
        return (view as any)?.engine?.shadowLightsCollect ?? engineRef.active?.shadowLightsCollect;
    }

    /** @deprecated Constructed automatically by Engine3D.init() */
    public static init() {
        // no-op: ShadowLightsCollect is constructed in Engine3D.init()
    }

    public static get maxNumDirectionShadow(): number { return engineRef.active?.shadowLightsCollect?.maxNumDirectionShadow ?? 8; }
    public static get maxNumPointShadow(): number { return engineRef.active?.shadowLightsCollect?.maxNumPointShadow ?? 8; }

    public static get directionLightList(): Map<Scene3D, ILight[]> { return engineRef.active?.shadowLightsCollect?.directionLightList; }
    public static get pointLightList(): Map<Scene3D, ILight[]> { return engineRef.active?.shadowLightsCollect?.pointLightList; }
    public static get shadowLights(): Map<Scene3D, Float32Array> { return engineRef.active?.shadowLightsCollect?.shadowLights; }

    public static createBuffer(view: View3D) {
        this._get(view)?._createBuffer(view);
    }

    static getShadowLightList(light: ILight): ILight[] | null {
        const view = light.transform?.view3D;
        return this._get(view)?._getShadowLightList(light) ?? null;
    }

    static getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        const view = (scene as any)?.view;
        return this._get(view)?._getShadowLightWhichScene(scene, type);
    }

    static getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        const view = (scene as any)?.view;
        return this._get(view)?._getDirectShadowLightWhichScene(scene);
    }

    static getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        const view = (scene as any)?.view;
        return this._get(view)?._getPointShadowLightWhichScene(scene);
    }

    static addShadowLight(light: ILight): ILight[] | null {
        const view = light.transform?.view3D;
        return this._get(view)?._addShadowLight(light) ?? null;
    }

    public static removeShadowLight(light: ILight): ILight[] | null {
        const view = light.transform?.view3D;
        return this._get(view)?._removeShadowLight(light) ?? null;
    }

    public static update(view: View3D) {
        this._get(view)?._update(view);
    }
}
