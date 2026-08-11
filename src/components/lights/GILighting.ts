import { Scene3D } from '../../core/Scene3D';
import { ILight } from "./ILight";

/**
 * Collecting and storing light that affects GI, keyed by Scene3D.
 * @internal
 * @group Lights
 */
export class GILighting {
    private static _lists: Map<Scene3D, ILight[]> = new Map();

    /** @deprecated Access per-scene list via GILighting.getList(scene). */
    public static get list(): ILight[] {
        // Flatten all scene lists for backward compatibility
        const all: ILight[] = [];
        for (const lights of this._lists.values()) {
            all.push(...lights);
        }
        return all;
    }

    public static getList(scene: Scene3D): ILight[] {
        let list = this._lists.get(scene);
        if (!list) {
            list = [];
            this._lists.set(scene, list);
        }
        return list;
    }

    public static add(light: ILight) {
        const scene = light.transform?.view3D?.scene;
        if (!scene) return;
        const list = this.getList(scene);
        if (list.indexOf(light) === -1) {
            list.push(light);
        }
    }

    public static remove(light: ILight) {
        const scene = light.transform?.view3D?.scene;
        if (!scene) return;
        const list = this._lists.get(scene);
        if (list) {
            const index = list.indexOf(light);
            if (index !== -1) {
                list.splice(index, 1);
            }
        }
    }

    public static removeScene(scene: Scene3D) {
        this._lists.delete(scene);
    }
}
