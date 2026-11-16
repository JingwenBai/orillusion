import { Scene3D } from "../../core/Scene3D";
import { ILight } from "./ILight";

/**
 * Collecting and storing light that affects GI
 * @internal
 * @group Lights
 */
export class GILighting {
    private static _sceneMap: Map<Scene3D, ILight[]> = new Map();

    /**
     * @deprecated Use getList(scene) for multi-instance support.
     * Returns lights from all scenes merged into one array.
     */
    public static get list(): ILight[] {
        const all: ILight[] = [];
        this._sceneMap.forEach(arr => all.push(...arr));
        return all;
    }

    public static getList(scene: Scene3D): ILight[] {
        return this._sceneMap.get(scene) ?? [];
    }

    public static add(light: ILight) {
        const scene = light.transform?.scene3D;
        if (!scene) return;
        let arr = this._sceneMap.get(scene);
        if (!arr) {
            arr = [];
            this._sceneMap.set(scene, arr);
        }
        if (arr.indexOf(light) === -1) {
            arr.push(light);
        }
    }

    public static remove(light: ILight) {
        const scene = light.transform?.scene3D;
        if (!scene) return;
        const arr = this._sceneMap.get(scene);
        if (!arr) return;
        const index = arr.indexOf(light);
        if (index !== -1) {
            arr.splice(index, 1);
            if (arr.length === 0) this._sceneMap.delete(scene);
        }
    }

    public static removeScene(scene: Scene3D) {
        this._sceneMap.delete(scene);
    }
}
