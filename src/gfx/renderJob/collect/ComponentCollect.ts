import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

export class ComponentCollect {

    // ── Per-engine instance state ──────────────────────────────────────────
    /** @internal */
    public readonly updateList: Map<View3D, Map<IComponent, Function>> = new Map();
    /** @internal */
    public readonly lateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    /** @internal */
    public readonly beforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    /** @internal */
    public readonly computeList: Map<View3D, Map<IComponent, Function>> = new Map();
    /** @internal */
    public readonly enablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();
    /** @internal */
    public readonly graphicList: Map<View3D, Map<IComponent, Function>> = new Map();

    // ── Static fields (point to the active engine's Maps) ─────────────────
    /**
     * @internal
     */
    public static componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    /**
     * @internal
     */
    public static componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    /**
     * @internal
     */
    public static componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    /**
     * @internal
     */
    public static componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();
    /**
     * @internal
     */
    public static componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();
    /**
     * @internal
     */
    public static graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();

    /**
     * @internal
     * Global pending-start queue. Shared across all engines; filtered by scene
     * in Entity.waitUpdate() so each engine only starts its own components.
     */
    public static waitStartComponent: Map<Object3D, IComponent[]> = new Map();

    /**
     * @internal
     * Redirect the static fields to point to the given engine instance's Maps.
     * Called by Engine3D before rendering each frame so that all callers using
     * the static API automatically operate on the correct engine's state.
     */
    public static activate(inst: ComponentCollect): void {
        ComponentCollect.componentsUpdateList = inst.updateList;
        ComponentCollect.componentsLateUpdateList = inst.lateUpdateList;
        ComponentCollect.componentsBeforeUpdateList = inst.beforeUpdateList;
        ComponentCollect.componentsComputeList = inst.computeList;
        ComponentCollect.componentsEnablePickerList = inst.enablePickerList;
        ComponentCollect.graphicComponent = inst.graphicList;
    }

    // ── Static API (unchanged – zero diff for all callers) ────────────────

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        let list = this.componentsUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        let list = this.componentsLateUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        let list = this.componentsBeforeUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        let list = this.componentsComputeList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        let list = this.graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        let list = this.graphicComponent.get(view);
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
        let list = this.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            this.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        let list = this.componentsEnablePickerList.get(view);
        if (list) {
            list.delete(component);
        }
    }
}
