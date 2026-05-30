import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

export class ComponentCollect {

    // --- Instance properties (per-engine) ---

    public componentsUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsComputeList: Map<View3D, Map<IComponent, Function>>;
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>>;
    public graphicComponent: Map<View3D, Map<IComponent, Function>>;

    /**
     * Global staging queue shared across all engines.
     * Components are placed here on addComponent() and moved to the engine's
     * per-view maps during Entity.waitUpdate() for the owning engine.
     * @internal
     */
    public static waitStartComponent: Map<Object3D, IComponent[]> = new Map<Object3D, IComponent[]>();

    constructor() {
        this.componentsUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsLateUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsBeforeUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsComputeList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsEnablePickerList = new Map<View3D, Map<ColliderComponent, Function>>();
        this.graphicComponent = new Map<View3D, Map<IComponent, Function>>();
    }

    public bindUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindUpdate(view: View3D, component: IComponent) {
        let list = this.componentsUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindLateUpdate(view: View3D, component: IComponent) {
        let list = this.componentsLateUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindBeforeUpdate(view: View3D, component: IComponent) {
        let list = this.componentsBeforeUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindCompute(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindCompute(view: View3D, component: IComponent) {
        let list = this.componentsComputeList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindGraphic(view: View3D, component: IComponent, call: Function) {
        let list = this.graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public unBindGraphic(view: View3D, component: IComponent) {
        let list = this.graphicComponent.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        let list = this.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            this.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindEnablePick(view: View3D, component: ColliderComponent) {
        let list = this.componentsEnablePickerList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    // --- Static helpers for global wait-start queue ---

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

    // --- Static proxy methods: route to Engine3D._current.componentCollect ---
    // These exist so that ComponentBase and other internal callers can use the
    // familiar static API without needing to know which Engine3D instance is active.

    /** @internal */
    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        Engine3D_ref._current?.componentCollect?.bindUpdate(view, component, call);
    }

    /** @internal */
    public static unBindUpdate(view: View3D, component: IComponent) {
        Engine3D_ref._current?.componentCollect?.unBindUpdate(view, component);
    }

    /** @internal */
    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        Engine3D_ref._current?.componentCollect?.bindLateUpdate(view, component, call);
    }

    /** @internal */
    public static unBindLateUpdate(view: View3D, component: IComponent) {
        Engine3D_ref._current?.componentCollect?.unBindLateUpdate(view, component);
    }

    /** @internal */
    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        Engine3D_ref._current?.componentCollect?.bindBeforeUpdate(view, component, call);
    }

    /** @internal */
    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        Engine3D_ref._current?.componentCollect?.unBindBeforeUpdate(view, component);
    }

    /** @internal */
    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        Engine3D_ref._current?.componentCollect?.bindCompute(view, component, call);
    }

    /** @internal */
    public static unBindCompute(view: View3D, component: IComponent) {
        Engine3D_ref._current?.componentCollect?.unBindCompute(view, component);
    }

    /** @internal */
    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        Engine3D_ref._current?.componentCollect?.bindGraphic(view, component, call);
    }

    /** @internal */
    public static unBindGraphic(view: View3D, component: IComponent) {
        Engine3D_ref._current?.componentCollect?.unBindGraphic(view, component);
    }

    /** @internal */
    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        Engine3D_ref._current?.componentCollect?.bindEnablePick(view, component, call);
    }

    /** @internal */
    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        Engine3D_ref._current?.componentCollect?.unBindEnablePick(view, component);
    }

    /** @internal - backward-compat static access to the active engine's picker list */
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return Engine3D_ref._current?.componentCollect?.componentsEnablePickerList;
    }
}

/**
 * Lazy reference to Engine3D to avoid circular import issues.
 * Set by Engine3D at module load time.
 * @internal
 */
export const Engine3D_ref: { _current: any } = { _current: null };
