import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/**
 * Per-engine component lifecycle registry.
 * Create one instance per Engine3D; access via Engine3D.componentCollect.
 * The static methods are backward-compat proxies that route through view.engine when available.
 * @internal
 */
export class ComponentCollect {

    // ========== INSTANCE STATE ==========

    public componentsUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsComputeList: Map<View3D, Map<IComponent, Function>>;
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>>;
    public graphicComponent: Map<View3D, Map<IComponent, Function>>;

    constructor() {
        this.componentsUpdateList = new Map();
        this.componentsLateUpdateList = new Map();
        this.componentsBeforeUpdateList = new Map();
        this.componentsComputeList = new Map();
        this.componentsEnablePickerList = new Map();
        this.graphicComponent = new Map();
    }

    // ========== INSTANCE METHODS ==========

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

    // ========== SHARED GLOBAL STATE ==========
    // waitStartComponent is a temporary bootstrap buffer shared across all engines.
    // Components are routed to the correct per-engine ComponentCollect when __start() fires
    // (because bindUpdate uses view.engine to pick the right collect at that point).
    public static waitStartComponent: Map<Object3D, IComponent[]> = new Map();

    public static appendWaitStart(component: IComponent) {
        let arr = ComponentCollect.waitStartComponent.get(component.object3D);
        if (!arr) {
            ComponentCollect.waitStartComponent.set(component.object3D, [component]);
        } else {
            let index = arr.indexOf(component);
            if (index == -1) arr.push(component);
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = ComponentCollect.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index != -1) arr.splice(index, 1);
        }
    }

    // ========== STATIC PROXY ==========
    // Points to the active engine's ComponentCollect. Set by Engine3D before each frame.
    private static _current: ComponentCollect = new ComponentCollect();

    /** @internal Switch the static proxy to the given engine's ComponentCollect. */
    public static setCurrent(instance: ComponentCollect): void {
        ComponentCollect._current = instance;
    }

    // Static list accessors — return the current engine's maps.
    public static get componentsUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._current.componentsUpdateList;
    }
    public static get componentsLateUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._current.componentsLateUpdateList;
    }
    public static get componentsBeforeUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._current.componentsBeforeUpdateList;
    }
    public static get componentsComputeList(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._current.componentsComputeList;
    }
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return ComponentCollect._current.componentsEnablePickerList;
    }
    public static get graphicComponent(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._current.graphicComponent;
    }

    // Static bind/unbind methods — route through view.engine for proper multi-instance isolation.
    private static _resolve(view: View3D): ComponentCollect {
        return (view as any)?.engine?.componentCollect ?? ComponentCollect._current;
    }

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolve(view).bindUpdate(view, component, call);
    }
    public static unBindUpdate(view: View3D, component: IComponent) {
        ComponentCollect._resolve(view).unBindUpdate(view, component);
    }
    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolve(view).bindLateUpdate(view, component, call);
    }
    public static unBindLateUpdate(view: View3D, component: IComponent) {
        ComponentCollect._resolve(view).unBindLateUpdate(view, component);
    }
    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolve(view).bindBeforeUpdate(view, component, call);
    }
    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        ComponentCollect._resolve(view).unBindBeforeUpdate(view, component);
    }
    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolve(view).bindCompute(view, component, call);
    }
    public static unBindCompute(view: View3D, component: IComponent) {
        ComponentCollect._resolve(view).unBindCompute(view, component);
    }
    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolve(view).bindGraphic(view, component, call);
    }
    public static unBindGraphic(view: View3D, component: IComponent) {
        ComponentCollect._resolve(view).unBindGraphic(view, component);
    }
    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        ComponentCollect._resolve(view).bindEnablePick(view, component, call);
    }
    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        ComponentCollect._resolve(view).unBindEnablePick(view, component);
    }
}
