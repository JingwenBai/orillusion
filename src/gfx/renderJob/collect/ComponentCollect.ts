import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

export class ComponentCollect {

    // ─── Instance fields ───────────────────────────────────────────────────────
    /** @internal */
    public componentsUpdateList: Map<View3D, Map<IComponent, Function>>;
    /** @internal */
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>>;
    /** @internal */
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>>;
    /** @internal */
    public componentsComputeList: Map<View3D, Map<IComponent, Function>>;
    /** @internal */
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>>;
    /** @internal */
    public graphicComponent: Map<View3D, Map<IComponent, Function>>;
    /** @internal */
    public waitStartComponent: Map<Object3D, IComponent[]>;

    /** @internal Global singleton used by legacy code that runs without an engine context */
    private static _global: ComponentCollect = new ComponentCollect();

    /** @internal Find the right ComponentCollect for a given view (from its engine, or the global fallback) */
    private static _forView(view: View3D): ComponentCollect {
        return (view as any)?._engine?.componentCollect ?? ComponentCollect._global;
    }

    constructor() {
        this.componentsUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsLateUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsBeforeUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsComputeList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsEnablePickerList = new Map<View3D, Map<ColliderComponent, Function>>();
        this.graphicComponent = new Map<View3D, Map<IComponent, Function>>();
        this.waitStartComponent = new Map<Object3D, IComponent[]>();
    }

    // ─── Instance methods ──────────────────────────────────────────────────────

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

    public appendWaitStart(component: IComponent) {
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

    public removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = this.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index != -1) {
                arr.splice(index, 1);
            }
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

    // ─── Static API (backward-compatible, routes to per-engine instance) ───────

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._forView(view).bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        ComponentCollect._forView(view).unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._forView(view).bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        ComponentCollect._forView(view).unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._forView(view).bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        ComponentCollect._forView(view).unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._forView(view).bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        ComponentCollect._forView(view).unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._forView(view).bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        ComponentCollect._forView(view).unBindGraphic(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        // waitStartComponent is keyed by Object3D; route via the component's own view engine or global
        const view = component.object3D?.transform?.view3D;
        const cc = (view as any)?._engine?.componentCollect ?? ComponentCollect._global;
        cc.appendWaitStart(component);
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        const view = obj?.transform?.view3D;
        const cc = (view as any)?._engine?.componentCollect ?? ComponentCollect._global;
        cc.removeWaitStart(obj, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        ComponentCollect._forView(view).bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        ComponentCollect._forView(view).unBindEnablePick(view, component);
    }

    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return ComponentCollect._global.waitStartComponent;
    }

    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return ComponentCollect._global.componentsEnablePickerList;
    }
}
