import { ILight } from '../../../components/lights/ILight';
import { LightType } from '../../../components/lights/LightData';
import { Scene3D } from '../../../core/Scene3D';
import { View3D } from '../../../core/View3D';
import { CameraUtil } from '../../../util/CameraUtil';
import { GlobalBindGroup } from '../../graphics/webGpu/core/bindGroups/GlobalBindGroup';
import { GlobalUniformGroup } from '../../graphics/webGpu/core/bindGroups/GlobalUniformGroup';

/** Active per-engine instance; set by Engine3D before each frame. */
let _active: ShadowLightsCollect | null = null;

/**
 * Activate a specific ShadowLightsCollect as the current one.
 * Engine3D calls this before rendering a frame.
 * @internal
 */
export function activateShadowLightsCollect(slc: ShadowLightsCollect): void {
    _active = slc;
}

/**
 * @internal
 * @group Lights
 */
export class ShadowLightsCollect {

    public static maxNumDirectionShadow = 8;
    public static maxNumPointShadow = 8;

    // ------------------------------------------------------------------ //
    //  Instance state — one set per Engine3D instance                     //
    // ------------------------------------------------------------------ //

    public directionLightList: Map<Scene3D, ILight[]>;
    public pointLightList: Map<Scene3D, ILight[]>;
    public shadowLights: Map<Scene3D, Float32Array>;

    constructor() {
        this.directionLightList = new Map<Scene3D, ILight[]>();
        this.pointLightList = new Map<Scene3D, ILight[]>();
        this.shadowLights = new Map<Scene3D, Float32Array>();
    }

    // ------------------------------------------------------------------ //
    //  Instance methods                                                    //
    // ------------------------------------------------------------------ //

    public createBuffer(view: View3D) {
        if (!this.shadowLights.has(view.scene)) {
            this.shadowLights.set(view.scene, new Float32Array(16));
        }
    }

    public getShadowLightList(light: ILight) {
        if (!light.transform.view3D) return null;
        if (light.lightData.lightType === LightType.DirectionLight) {
            let list = this.directionLightList.get(light.transform.view3D.scene);
            if (!list) { list = []; this.directionLightList.set(light.transform.view3D.scene, list); }
            return list;
        } else if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            let list = this.pointLightList.get(light.transform.view3D.scene);
            if (!list) { list = []; this.pointLightList.set(light.transform.view3D.scene, list); }
            return list;
        }
        return null;
    }

    public getShadowLightWhichScene(scene: Scene3D, type: LightType) {
        if (type === LightType.DirectionLight) {
            let list = this.directionLightList.get(scene);
            if (!list) { list = []; this.directionLightList.set(scene, list); }
            return list;
        } else if (type === LightType.PointLight) {
            let list = this.pointLightList.get(scene);
            if (!list) { list = []; this.pointLightList.set(scene, list); }
            return list;
        }
        return null;
    }

    public getDirectShadowLightWhichScene(scene: Scene3D) {
        let list = this.directionLightList.get(scene);
        if (!list) { list = []; this.directionLightList.set(scene, list); }
        return list;
    }

    public getPointShadowLightWhichScene(scene: Scene3D) {
        let list = this.pointLightList.get(scene);
        if (!list) { list = []; this.pointLightList.set(scene, list); }
        return list;
    }

    public addShadowLight(light: ILight) {
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
        } else if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            let list = this.pointLightList.get(scene);
            if (list && list.length >= 8) return list;
            if (!list) { list = []; this.pointLightList.set(scene, list); }
            if (list.indexOf(light) === -1) list.push(light);
            return list;
        }
        return null;
    }

    public removeShadowLight(light: ILight) {
        light.lightData.castShadowIndex = -1;
        if (!light.transform.view3D) return null;
        if (light.lightData.lightType === LightType.DirectionLight) {
            const list = this.directionLightList.get(light.transform.view3D.scene);
            if (list) {
                const index = list.indexOf(light);
                if (index !== -1) list.splice(index, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        } else if (light.lightData.lightType === LightType.PointLight || light.lightData.lightType === LightType.SpotLight) {
            const list = this.pointLightList.get(light.transform.view3D.scene);
            if (list) {
                const index = list.indexOf(light);
                if (index !== -1) list.splice(index, 1);
            }
            light.lightData.castShadowIndex = -1;
            return list;
        }
        return null;
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
        cameraGroup.forEach((group: GlobalUniformGroup) => {
            group.dirShadowStart = nDirShadowStart;
            group.dirShadowEnd = nDirShadowEnd;
            group.pointShadowStart = nPointShadowStart;
            group.pointShadowEnd = nPointShadowEnd;
            group.shadowLights = shadowLights;
        });
    }

    // ------------------------------------------------------------------ //
    //  Static delegates — forward to the currently active instance        //
    // ------------------------------------------------------------------ //

    public static init() {
        // No-op: kept for call-site compatibility.
        // Engine3D creates its own ShadowLightsCollect instance during init().
    }

    public static createBuffer(view: View3D) {
        _active?.createBuffer(view);
    }

    public static getShadowLightList(light: ILight) {
        return _active?.getShadowLightList(light) ?? null;
    }

    public static getShadowLightWhichScene(scene: Scene3D, type: LightType) {
        return _active?.getShadowLightWhichScene(scene, type) ?? null;
    }

    public static getDirectShadowLightWhichScene(scene: Scene3D) {
        return _active?.getDirectShadowLightWhichScene(scene) ?? [];
    }

    public static getPointShadowLightWhichScene(scene: Scene3D) {
        return _active?.getPointShadowLightWhichScene(scene) ?? [];
    }

    public static addShadowLight(light: ILight) {
        return _active?.addShadowLight(light) ?? null;
    }

    public static removeShadowLight(light: ILight) {
        return _active?.removeShadowLight(light) ?? null;
    }

    public static update(view: View3D) {
        _active?.update(view);
    }
}
