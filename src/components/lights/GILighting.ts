import { ILight } from "./ILight";

/**
 * Collecting and storing light that affects GI, keyed by scene object to
 * avoid collisions between multiple Engine3D instances.
 * @internal
 * @group Lights
 */
export class GILighting {
    private static _sceneMap: Map<object, ILight[]> = new Map();

    /** Legacy accessor – returns the list for the given scene (or a global fallback). */
    public static getList(scene?: object): ILight[] {
        if (!scene) {
            // Fallback: return all lights across all scenes (backward compat).
            const all: ILight[] = [];
            this._sceneMap.forEach(list => all.push(...list));
            return all;
        }
        if (!this._sceneMap.has(scene)) {
            this._sceneMap.set(scene, []);
        }
        return this._sceneMap.get(scene)!;
    }

    /** @deprecated Use add(light, scene) for multi-instance support */
    public static get list(): ILight[] {
        return this.getList();
    }

    public static add(light: ILight, scene?: object) {
        const list = this.getList(scene);
        if (list.indexOf(light) === -1) {
            list.push(light);
        }
    }

    public static remove(light: ILight, scene?: object) {
        const list = this.getList(scene);
        const index = list.indexOf(light);
        if (index !== -1) {
            list.splice(index, 1);
        }
    }
}
