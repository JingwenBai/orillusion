import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';
import { getActiveEngine } from '../../EngineContext';

/**
 * Per-engine instance that tracks which lights cast shadows in each scene.
 * Each Engine3D creates exactly one ShadowLightsCollect.
 *
 * The static methods that were previously used throughout the codebase now
 * route to the instance belonging to the engine that is currently rendering
 * (i.e. the engine that last called setActiveEngine).
 *
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    public maxNumDirectionShadow: number = 8;
    public maxNumPointShadow: number = 8;

    public directionLightList: Map<Scene3D, ILight[]> = new Map();
    public pointLightList: Map<Scene3D, ILight[]> = new Map();
    public shadowLights: Map<Scene3D, Float32Array> = new Map();

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
            return this._getOrCreate(this.directionLightList, scene);
        } else if (type === LightType.PointLight || type === LightType.SpotLight) {
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
        const type = light.lightData.lightType;

        if (type === LightType.DirectionLight) {
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
        } else if (type === LightType.PointLight || type === LightType.SpotLight) {
            const list = this._getOrCreate(this.pointLightList, scene);
            if (list.length >= 8) return list;
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
        const type = light.lightData.lightType;

        let list: ILight[];
        if (type === LightType.DirectionLight) {
            list = this.directionLightList.get(scene);
        } else if (type === LightType.PointLight || type === LightType.SpotLight) {
            list = this.pointLightList.get(scene);
        }
        if (list) {
            const index = list.indexOf(light);
            if (index !== -1) list.splice(index, 1);
        }
        light.lightData.castShadowIndex = -1;
        return list ?? null;
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

        const globalBindGroup: GlobalBindGroup = view.engine?.globalBindGroup ?? ShadowLightsCollect._getStaticGlobalBindGroup();
        const cameraGroup = globalBindGroup.getAllCameraGroup();
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

    // ------------------------------------------------------------------ //
    // Static routing API — kept for backward compat                        //
    // Routes to the engine that is currently active in the render loop.   //
    // ------------------------------------------------------------------ //

    private static _getStaticGlobalBindGroup(): GlobalBindGroup {
        return GlobalBindGroup.getCurrent();
    }

    private static get _current(): ShadowLightsCollect {
        const engine = getActiveEngine();
        return engine?.shadowLightsCollect ?? ShadowLightsCollect._default;
    }

    private static _default: ShadowLightsCollect = new ShadowLightsCollect();

    /** @deprecated Use engine.shadowLightsCollect.createBuffer(view) */
    public static createBuffer(view: View3D) { this._current.createBuffer(view); }
    /** @deprecated Use engine.shadowLightsCollect.addShadowLight(light) */
    public static addShadowLight(light: ILight) { return this._current.addShadowLight(light); }
    /** @deprecated Use engine.shadowLightsCollect.removeShadowLight(light) */
    public static removeShadowLight(light: ILight) { return this._current.removeShadowLight(light); }
    /** @deprecated Use engine.shadowLightsCollect.update(view) */
    public static update(view: View3D) { this._current.update(view); }
    /** @deprecated Use engine.shadowLightsCollect.getShadowLightList(light) */
    public static getShadowLightList(light: ILight) { return this._current.getShadowLightList(light); }
    /** @deprecated Use engine.shadowLightsCollect.getShadowLightWhichScene(scene, type) */
    public static getShadowLightWhichScene(scene: Scene3D, type: LightType) { return this._current.getShadowLightWhichScene(scene, type); }
    /** @deprecated */
    public static getDirectShadowLightWhichScene(scene: Scene3D) { return this._current.getDirectShadowLightWhichScene(scene); }
    /** @deprecated */
    public static getPointShadowLightWhichScene(scene: Scene3D) { return this._current.getPointShadowLightWhichScene(scene); }
    /** @deprecated */
    public static get directionLightList() { return this._current.directionLightList; }
    /** @deprecated */
    public static get pointLightList() { return this._current.pointLightList; }
    /** @deprecated */
    public static get shadowLights() { return this._current.shadowLights; }
    /** @deprecated */
    public static get maxNumDirectionShadow() { return this._current.maxNumDirectionShadow; }
    /** @deprecated */
    public static get maxNumPointShadow() { return this._current.maxNumPointShadow; }
    /** @deprecated — legacy init(), now a no-op */
    public static init() { /* no-op — Engine3D creates the instance */ }
}
