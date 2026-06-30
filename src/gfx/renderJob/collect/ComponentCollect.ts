import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

export class ComponentCollect {

    // ---- Global queue (static) ----
    // waitStartComponent is a temporary queue holding components awaiting their first __start().
    // It is keyed by Object3D and is global (not per-engine) because components may be added
    // to objects before those objects are attached to a scene/view.
    // Entity.waitUpdate() iterates this map and calls element.__start() which then registers
    // the component with the correct per-engine update lists via the static bindUpdate() dispatchers.

    /**
     * @internal
     */
    public static waitStartComponent: Map<Object3D, IComponent[]> = new Map();

    public static appendWaitStart(component: IComponent) {
        let arr = ComponentCollect.waitStartComponent.get(component.object3D);
        if (!arr) {
            ComponentCollect.waitStartComponent.set(component.object3D, [component]);
        } else {
            if (arr.indexOf(component) === -1) arr.push(component);
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        const arr = ComponentCollect.waitStartComponent.get(obj);
        if (arr) {
            const index = arr.indexOf(component);
            if (index !== -1) arr.splice(index, 1);
        }
    }

    // ---- Instance state (per-engine) ----
    // These maps hold the per-frame update callbacks for components belonging to
    // scenes that are rendered by this specific engine instance.

    /**
     * @internal
     */
    public componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();

    /**
     * @internal
     */
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();

    /**
     * @internal
     */
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();

    /**
     * @internal
     */
    public componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();

    /**
     * @internal
     */
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();

    /**
     * @internal
     */
    public graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();

    // ---- Static dispatch (routes bind/unbind calls to the correct per-engine instance via view.engine) ----

    private static _resolve(view: View3D): ComponentCollect | null {
        return view?.engine?.componentCollect ?? null;
    }

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolve(view)?._bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        ComponentCollect._resolve(view)?._unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolve(view)?._bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        ComponentCollect._resolve(view)?._unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolve(view)?._bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        ComponentCollect._resolve(view)?._unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolve(view)?._bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        ComponentCollect._resolve(view)?._unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolve(view)?._bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        ComponentCollect._resolve(view)?._unBindGraphic(view, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        ComponentCollect._resolve(view)?._bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        ComponentCollect._resolve(view)?._unBindEnablePick(view, component);
    }

    // ---- Instance implementation methods ----

    public _bindUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public _unBindUpdate(view: View3D, component: IComponent) {
        this.componentsUpdateList.get(view)?.delete(component);
    }

    public _bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public _unBindLateUpdate(view: View3D, component: IComponent) {
        this.componentsLateUpdateList.get(view)?.delete(component);
    }

    public _bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public _unBindBeforeUpdate(view: View3D, component: IComponent) {
        this.componentsBeforeUpdateList.get(view)?.delete(component);
    }

    public _bindCompute(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public _unBindCompute(view: View3D, component: IComponent) {
        this.componentsComputeList.get(view)?.delete(component);
    }

    public _bindGraphic(view: View3D, component: IComponent, call: Function) {
        let list = this.graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public _unBindGraphic(view: View3D, component: IComponent) {
        this.graphicComponent.get(view)?.delete(component);
    }

    public _bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        let list = this.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            this.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public _unBindEnablePick(view: View3D, component: ColliderComponent) {
        this.componentsEnablePickerList.get(view)?.delete(component);
    }
}
