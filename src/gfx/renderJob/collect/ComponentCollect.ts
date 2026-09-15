import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

export class ComponentCollect {

    // ---- Global staging area (shared across all engines) ----

    /**
     * @internal
     */
    public static waitStartComponent: Map<Object3D, IComponent[]> = new Map<Object3D, IComponent[]>();

    // ---- Per-engine instance (set by Engine3D before each render) ----

    private static _current: ComponentCollect = new ComponentCollect();

    /**
     * @internal
     * Switch the active ComponentCollect to the one owned by the given Engine3D instance.
     */
    public static setCurrent(instance: ComponentCollect): void {
        this._current = instance;
    }

    // ---- Static getters that forward to the current per-engine instance ----

    /** @internal */
    public static get componentsUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return this._current._componentsUpdateList;
    }

    /** @internal */
    public static get componentsLateUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return this._current._componentsLateUpdateList;
    }

    /** @internal */
    public static get componentsBeforeUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return this._current._componentsBeforeUpdateList;
    }

    /** @internal */
    public static get componentsComputeList(): Map<View3D, Map<IComponent, Function>> {
        return this._current._componentsComputeList;
    }

    /** @internal */
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return this._current._componentsEnablePickerList;
    }

    /** @internal */
    public static get graphicComponent(): Map<View3D, Map<IComponent, Function>> {
        return this._current._graphicComponent;
    }

    // ---- Instance (per-engine) properties ----

    public _componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public _componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public _componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public _componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();
    public _componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();
    public _graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();

    // ---- Static methods (forward to _current instance) ----

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this._current._componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this._current._componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        let list = this._current._componentsUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this._current._componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this._current._componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        let list = this._current._componentsLateUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this._current._componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this._current._componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        let list = this._current._componentsBeforeUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        let list = this._current._componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this._current._componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        let list = this._current._componentsComputeList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        let list = this._current._graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this._current._graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        let list = this._current._graphicComponent.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static appendWaitStart(component: IComponent) {
        let arr = this.waitStartComponent.get(component.object3D);
        if (!arr) {
            this.waitStartComponent.set(component.object3D, [component]);
        } else {
            let index = arr.indexOf(component);
            if (index == -1) {
                arr.push(component);
            }
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = ComponentCollect.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index != -1) {
                arr.splice(index);
            }
        }
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        let list = this._current._componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            this._current._componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        let list = this._current._componentsEnablePickerList.get(view);
        if (list) {
            list.delete(component);
        }
    }
}
