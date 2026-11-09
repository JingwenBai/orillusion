import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

export class ComponentCollect {

    // =========================================================
    // Instance state
    // =========================================================

    /** @internal */
    public componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    /** @internal */
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    /** @internal */
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    /** @internal */
    public componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();
    /** @internal */
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();
    /** @internal */
    public graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();
    /** @internal */
    public waitStartComponent: Map<Object3D, IComponent[]> = new Map();

    // =========================================================
    // Static delegation to the currently-active instance
    // =========================================================

    private static _current: ComponentCollect = new ComponentCollect();

    public static setCurrent(instance: ComponentCollect) {
        ComponentCollect._current = instance;
    }

    public static get componentsUpdateList() { return ComponentCollect._current.componentsUpdateList; }
    public static get componentsLateUpdateList() { return ComponentCollect._current.componentsLateUpdateList; }
    public static get componentsBeforeUpdateList() { return ComponentCollect._current.componentsBeforeUpdateList; }
    public static get componentsComputeList() { return ComponentCollect._current.componentsComputeList; }
    public static get componentsEnablePickerList() { return ComponentCollect._current.componentsEnablePickerList; }
    public static get graphicComponent() { return ComponentCollect._current.graphicComponent; }
    public static get waitStartComponent() { return ComponentCollect._current.waitStartComponent; }

    // =========================================================
    // Instance methods
    // =========================================================

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
        if (list) list.delete(component);
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
        if (list) list.delete(component);
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
        if (list) list.delete(component);
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
        if (list) list.delete(component);
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
        if (list) list.delete(component);
    }

    public appendWaitStart(component: IComponent) {
        let arr = this.waitStartComponent.get(component.object3D);
        if (!arr) {
            this.waitStartComponent.set(component.object3D, [component]);
        } else {
            let index = arr.indexOf(component);
            if (index === -1) arr.push(component);
        }
    }

    public removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = this.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index !== -1) arr.splice(index);
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
        if (list) list.delete(component);
    }

    // =========================================================
    // Static wrappers (backward-compatible API)
    // =========================================================

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._current.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        ComponentCollect._current.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._current.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        ComponentCollect._current.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._current.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        ComponentCollect._current.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._current.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        ComponentCollect._current.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._current.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        ComponentCollect._current.unBindGraphic(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        ComponentCollect._current.appendWaitStart(component);
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        ComponentCollect._current.removeWaitStart(obj, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        ComponentCollect._current.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        ComponentCollect._current.unBindEnablePick(view, component);
    }
}
