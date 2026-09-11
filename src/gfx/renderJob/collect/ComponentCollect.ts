import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

export class ComponentCollect {

    // ──────────────────────────────────────────────────────────────
    // Per-engine instance data
    // ──────────────────────────────────────────────────────────────

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

    // ──────────────────────────────────────────────────────────────
    // Active-instance management (set by Engine3D)
    // ──────────────────────────────────────────────────────────────

    /** @internal – currently active per-engine collect; set by Engine3D */
    public static _active: ComponentCollect = new ComponentCollect();

    // ──────────────────────────────────────────────────────────────
    // Static property accessors (backward-compat: delegate to _active)
    // ──────────────────────────────────────────────────────────────

    /** @internal */
    public static get componentsUpdateList() { return ComponentCollect._active.componentsUpdateList; }
    /** @internal */
    public static get componentsLateUpdateList() { return ComponentCollect._active.componentsLateUpdateList; }
    /** @internal */
    public static get componentsBeforeUpdateList() { return ComponentCollect._active.componentsBeforeUpdateList; }
    /** @internal */
    public static get componentsComputeList() { return ComponentCollect._active.componentsComputeList; }
    /** @internal */
    public static get componentsEnablePickerList() { return ComponentCollect._active.componentsEnablePickerList; }
    /** @internal */
    public static get graphicComponent() { return ComponentCollect._active.graphicComponent; }
    /** @internal */
    public static get waitStartComponent() { return ComponentCollect._active.waitStartComponent; }

    // ──────────────────────────────────────────────────────────────
    // Static API (backward-compat: delegate to active instance)
    // ──────────────────────────────────────────────────────────────

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._active.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        ComponentCollect._active.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._active.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        ComponentCollect._active.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._active.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        ComponentCollect._active.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._active.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        ComponentCollect._active.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._active.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        ComponentCollect._active.unBindGraphic(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        ComponentCollect._active.appendWaitStart(component);
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        ComponentCollect._active.removeWaitStart(obj, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        ComponentCollect._active.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        ComponentCollect._active.unBindEnablePick(view, component);
    }

    // ──────────────────────────────────────────────────────────────
    // Instance methods (the real implementation)
    // ──────────────────────────────────────────────────────────────

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
            if (arr.indexOf(component) === -1) arr.push(component);
        }
    }

    public removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = this.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index !== -1) arr.splice(index, 1);
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
}
