import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/**
 * Per-engine component registration data. Each Engine3D instance owns one of
 * these; the static accessors on ComponentCollect always delegate to the
 * currently active instance so that existing code continues to work unchanged.
 */
export class ComponentCollect {

    // --- INSTANCE DATA ---

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

    // --- ACTIVE INSTANCE TRACKING ---

    private static _active: ComponentCollect = new ComponentCollect();

    /** Switch the active per-engine instance. Called by Engine3D._activate(). */
    public static setActive(cc: ComponentCollect): void {
        ComponentCollect._active = cc;
    }

    // --- STATIC ACCESSORS (delegate to active instance for backward compat) ---

    /** @internal */
    public static get componentsUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._active.componentsUpdateList;
    }
    public static set componentsUpdateList(v: Map<View3D, Map<IComponent, Function>>) {
        ComponentCollect._active.componentsUpdateList = v;
    }

    /** @internal */
    public static get componentsLateUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._active.componentsLateUpdateList;
    }
    public static set componentsLateUpdateList(v: Map<View3D, Map<IComponent, Function>>) {
        ComponentCollect._active.componentsLateUpdateList = v;
    }

    /** @internal */
    public static get componentsBeforeUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._active.componentsBeforeUpdateList;
    }
    public static set componentsBeforeUpdateList(v: Map<View3D, Map<IComponent, Function>>) {
        ComponentCollect._active.componentsBeforeUpdateList = v;
    }

    /** @internal */
    public static get componentsComputeList(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._active.componentsComputeList;
    }
    public static set componentsComputeList(v: Map<View3D, Map<IComponent, Function>>) {
        ComponentCollect._active.componentsComputeList = v;
    }

    /** @internal */
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return ComponentCollect._active.componentsEnablePickerList;
    }
    public static set componentsEnablePickerList(v: Map<View3D, Map<ColliderComponent, Function>>) {
        ComponentCollect._active.componentsEnablePickerList = v;
    }

    /** @internal */
    public static get graphicComponent(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._active.graphicComponent;
    }
    public static set graphicComponent(v: Map<View3D, Map<IComponent, Function>>) {
        ComponentCollect._active.graphicComponent = v;
    }

    /** @internal */
    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return ComponentCollect._active.waitStartComponent;
    }
    public static set waitStartComponent(v: Map<Object3D, IComponent[]>) {
        ComponentCollect._active.waitStartComponent = v;
    }

    // --- STATIC METHODS (unchanged — `this.xxx` calls the static getters above) ---

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
