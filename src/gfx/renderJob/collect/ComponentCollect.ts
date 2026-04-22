import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/**
 * Global pending-start queue. Keyed by Object3D, shared across all engine instances.
 * Entity.waitUpdate() filters entries by scene so each engine only starts its own components.
 * @internal
 */
const _globalWaitStart: Map<Object3D, IComponent[]> = new Map<Object3D, IComponent[]>();

/** @internal */
let _activeInstance: ComponentCollect | null = null;

export class ComponentCollect {

    // =================== Per-engine instance state ===================

    /**
     * @internal
     */
    public componentsUpdateList: Map<View3D, Map<IComponent, Function>>;

    /**
     * @internal
     */
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>>;

    /**
     * @internal
     */
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>>;

    /**
     * @internal
     */
    public componentsComputeList: Map<View3D, Map<IComponent, Function>>;

    /**
     * @internal
     */
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>>;

    /**
     * @internal
     */
    public graphicComponent: Map<View3D, Map<IComponent, Function>>;

    constructor() {
        this.componentsUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsLateUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsBeforeUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsComputeList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsEnablePickerList = new Map<View3D, Map<ColliderComponent, Function>>();
        this.graphicComponent = new Map<View3D, Map<IComponent, Function>>();
    }

    // =================== Instance methods ===================

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

    // =================== Static active-instance management ===================

    /** @internal */
    public static _setActive(instance: ComponentCollect) {
        _activeInstance = instance;
    }

    /** @internal */
    public static get instance(): ComponentCollect {
        return _activeInstance;
    }

    // =================== Static proxy getters (backward compat) ===================

    /** @internal */
    public static get componentsUpdateList() { return _activeInstance?.componentsUpdateList; }
    /** @internal */
    public static get componentsLateUpdateList() { return _activeInstance?.componentsLateUpdateList; }
    /** @internal */
    public static get componentsBeforeUpdateList() { return _activeInstance?.componentsBeforeUpdateList; }
    /** @internal */
    public static get componentsComputeList() { return _activeInstance?.componentsComputeList; }
    /** @internal */
    public static get componentsEnablePickerList() { return _activeInstance?.componentsEnablePickerList; }
    /** @internal */
    public static get graphicComponent() { return _activeInstance?.graphicComponent; }

    /**
     * Global pending-start queue (shared across engine instances, filtered per scene in Entity.waitUpdate).
     * @internal
     */
    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return _globalWaitStart;
    }

    // =================== Static proxy methods (backward compat) ===================

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        _activeInstance?.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        _activeInstance?.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        _activeInstance?.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        _activeInstance?.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        _activeInstance?.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        _activeInstance?.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        _activeInstance?.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        _activeInstance?.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        _activeInstance?.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        _activeInstance?.unBindGraphic(view, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        _activeInstance?.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        _activeInstance?.unBindEnablePick(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        let arr = _globalWaitStart.get(component.object3D);
        if (!arr) {
            _globalWaitStart.set(component.object3D, [component]);
        } else {
            let index = arr.indexOf(component);
            if (index == -1) arr.push(component);
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = _globalWaitStart.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index != -1) arr.splice(index, 1);
        }
    }
}
