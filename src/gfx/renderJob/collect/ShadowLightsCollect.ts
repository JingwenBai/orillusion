import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';
import { EngineContext } from '../../../core/EngineContext';

/**
 * Per-engine shadow light collection state.
 * @internal
 */
export class ShadowLightsCollectInstance {
    public maxNumDirectionShadow = 8;
    public maxNumPointShadow = 8;

    public directionLightList: Map<Scene3D, ILight[]> = new Map();
    public pointLightList: Map<Scene3D, ILight[]> = new Map();
    public shadowLights: Map<Scene3D, Float32Array> = new Map();

    public init() {
        this.directionLightList = new Map();
        this.pointLightList = new Map();
        this.shadowLights = new Map();
    }

    public createBuffer(view: View3D) {
        if (!this.shadowLights.has(view.scene)) {
            this.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    getShadowLightList(light: ILight): ILight[] | null {
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

    getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
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

    getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        let list = this.directionLightList.get(scene);
        if (!list) { list = []; this.directionLightList.set(scene, list); }
        return list;
    }

    getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        let list = this.pointLightList.get(scene);
        if (!list) { list = []; this.pointLightList.set(scene, list); }
        return list;
    }

    addShadowLight(light: ILight): ILight[] | null {
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

    removeShadowLight(light: ILight): ILight[] | undefined {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        const scene = light.transform.view3D.scene;
        if (light.lightData.lightType === LightType.DirectionLight) {
            const list = this.directionLightList.get(scene);
            if (list) {
                const idx = list.indexOf(light);
                if (idx !== -1) list.splice(idx, 1);
            }
            return list;
        } else {
            const list = this.pointLightList.get(scene);
            if (list) {
                const idx = list.indexOf(light);
                if (idx !== -1) list.splice(idx, 1);
            }
            return list;
        }
    }

    update(view: View3D): void {
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
}

/**
 * Static API for shadow light collection.
 * All calls are routed to the owning engine's instance via light.transform.view3D.engine
 * or fall back to EngineContext.current.
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {
    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    private static _resolveByLight(light: ILight): ShadowLightsCollectInstance | null {
        const engine = light.transform?.view3D?.engine ?? EngineContext.current;
        return engine?._shadowLightsCollect ?? null;
    }

    private static _resolveByScene(scene: Scene3D): ShadowLightsCollectInstance | null {
        const engine = scene?.view?.engine ?? EngineContext.current;
        return engine?._shadowLightsCollect ?? null;
    }

    private static _resolveByView(view: View3D): ShadowLightsCollectInstance | null {
        const engine = view?.engine ?? EngineContext.current;
        return engine?._shadowLightsCollect ?? null;
    }

    public static get directionLightList(): Map<Scene3D, ILight[]> {
        return EngineContext.current?._shadowLightsCollect?.directionLightList;
    }

    public static get pointLightList(): Map<Scene3D, ILight[]> {
        return EngineContext.current?._shadowLightsCollect?.pointLightList;
    }

    public static get shadowLights(): Map<Scene3D, Float32Array> {
        return EngineContext.current?._shadowLightsCollect?.shadowLights;
    }

    public static init() {
        EngineContext.current?._shadowLightsCollect?.init();
    }

    public static createBuffer(view: View3D) {
        this._resolveByView(view)?.createBuffer(view);
    }

    public static getShadowLightList(light: ILight): ILight[] | null {
        return this._resolveByLight(light)?.getShadowLightList(light) ?? null;
    }

    public static getShadowLightWhichScene(scene: Scene3D, type: LightType): ILight[] {
        return this._resolveByScene(scene)?.getShadowLightWhichScene(scene, type) ?? [];
    }

    public static getDirectShadowLightWhichScene(scene: Scene3D): ILight[] {
        return this._resolveByScene(scene)?.getDirectShadowLightWhichScene(scene) ?? [];
    }

    public static getPointShadowLightWhichScene(scene: Scene3D): ILight[] {
        return this._resolveByScene(scene)?.getPointShadowLightWhichScene(scene) ?? [];
    }

    public static addShadowLight(light: ILight): ILight[] | null {
        return this._resolveByLight(light)?.addShadowLight(light) ?? null;
    }

    public static removeShadowLight(light: ILight) {
        this._resolveByLight(light)?.removeShadowLight(light);
    }

    public static update(view: View3D): void {
        this._resolveByView(view)?.update(view);
    }
}
