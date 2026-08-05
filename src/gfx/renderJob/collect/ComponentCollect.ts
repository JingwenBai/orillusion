import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { getActiveEngineContext } from "../../../core/EngineRegistry";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/**
 * Per-engine instance that stores all component lifecycle hook registrations
 * for the views and objects belonging to one Engine3D.
 * @internal
 */
export class ComponentCollect {

    public componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();
    public graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();
    public waitStartComponent: Map<Object3D, IComponent[]> = new Map();

    // ─── static façade ───────────────────────────────────────────────────────
    // All static members delegate to the active engine's ComponentCollect.
    // Existing call sites (components, entity code, etc.) need no changes.

    private static _get(): ComponentCollect {
        const ctx = getActiveEngineContext();
        if (!ctx) throw new Error('No active Engine3D — call Engine3D.init() first');
        return ctx.componentCollect;
    }

    /** @internal */
    public static get componentsUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return this._get().componentsUpdateList;
    }

    /** @internal */
    public static get componentsLateUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return this._get().componentsLateUpdateList;
    }

    /** @internal */
    public static get componentsBeforeUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return this._get().componentsBeforeUpdateList;
    }

    /** @internal */
    public static get componentsComputeList(): Map<View3D, Map<IComponent, Function>> {
        return this._get().componentsComputeList;
    }

    /** @internal */
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return this._get().componentsEnablePickerList;
    }

    /** @internal */
    public static get graphicComponent(): Map<View3D, Map<IComponent, Function>> {
        return this._get().graphicComponent;
    }

    /** @internal */
    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return this._get().waitStartComponent;
    }

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        const cc = this._get();
        let list = cc.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            cc.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        this._get().componentsUpdateList.get(view)?.delete(component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        const cc = this._get();
        let list = cc.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            cc.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        this._get().componentsLateUpdateList.get(view)?.delete(component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        const cc = this._get();
        let list = cc.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            cc.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        this._get().componentsBeforeUpdateList.get(view)?.delete(component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        const cc = this._get();
        let list = cc.componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            cc.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        this._get().componentsComputeList.get(view)?.delete(component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        const cc = this._get();
        let list = cc.graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            cc.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        this._get().graphicComponent.get(view)?.delete(component);
    }

    public static appendWaitStart(component: IComponent) {
        const cc = this._get();
        let arr = cc.waitStartComponent.get(component.object3D);
        if (!arr) {
            cc.waitStartComponent.set(component.object3D, [component]);
        } else {
            if (arr.indexOf(component) === -1) {
                arr.push(component);
            }
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        const cc = this._get();
        const arr = cc.waitStartComponent.get(obj);
        if (arr) {
            const index = arr.indexOf(component);
            if (index !== -1) {
                arr.splice(index, 1);
            }
        }
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        const cc = this._get();
        let list = cc.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            cc.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        this._get().componentsEnablePickerList.get(view)?.delete(component);
    }
}
