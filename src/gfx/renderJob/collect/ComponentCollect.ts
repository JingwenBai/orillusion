import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

// Module-level factory: set by Engine3D to resolve the current ComponentCollect
// without creating a circular import from ComponentCollect → Engine3D.
let _getCurrentCollect: (() => ComponentCollect | null) = () => null;

/**
 * Register the factory that resolves the active ComponentCollect instance.
 * Called once by Engine3D during initialization.
 * @internal
 */
export function setComponentCollectFactory(fn: () => ComponentCollect | null) {
    _getCurrentCollect = fn;
}

/**
 * Global wait-start map: holds components added to Object3Ds before the
 * scene's first update. Shared across engines so Object3D doesn't need
 * engine context to queue a component.
 * @internal
 */
export const waitStartComponentMap = new Map<Object3D, IComponent[]>();

export class ComponentCollect {

    // =========================================================
    // Instance properties (per-engine state)
    // =========================================================

    public componentsUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsComputeList: Map<View3D, Map<IComponent, Function>>;
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>>;
    public graphicComponent: Map<View3D, Map<IComponent, Function>>;

    constructor() {
        this.componentsUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsLateUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsBeforeUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsComputeList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsEnablePickerList = new Map<View3D, Map<ColliderComponent, Function>>();
        this.graphicComponent = new Map<View3D, Map<IComponent, Function>>();
    }

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
        this.componentsUpdateList.get(view)?.delete(component);
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
        this.componentsLateUpdateList.get(view)?.delete(component);
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
        this.componentsBeforeUpdateList.get(view)?.delete(component);
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
        this.componentsComputeList.get(view)?.delete(component);
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
        this.graphicComponent.get(view)?.delete(component);
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
        this.componentsEnablePickerList.get(view)?.delete(component);
    }

    // =========================================================
    // Static backward-compat methods
    // Resolve the correct ComponentCollect via view.engine first,
    // then fall back to the registered factory (Engine3D._current).
    // =========================================================

    private static _resolveCollect(view: View3D): ComponentCollect | null {
        return (view as any)?.engine?.componentCollect ?? _getCurrentCollect();
    }

    /** @internal */
    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return waitStartComponentMap;
    }

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolveCollect(view)?.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        ComponentCollect._resolveCollect(view)?.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolveCollect(view)?.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        ComponentCollect._resolveCollect(view)?.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolveCollect(view)?.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        ComponentCollect._resolveCollect(view)?.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolveCollect(view)?.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        ComponentCollect._resolveCollect(view)?.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolveCollect(view)?.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        ComponentCollect._resolveCollect(view)?.unBindGraphic(view, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        ComponentCollect._resolveCollect(view)?.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        ComponentCollect._resolveCollect(view)?.unBindEnablePick(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        const map = waitStartComponentMap;
        let arr = map.get(component.object3D);
        if (!arr) {
            map.set(component.object3D, [component]);
        } else {
            if (arr.indexOf(component) === -1) {
                arr.push(component);
            }
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        const arr = waitStartComponentMap.get(obj);
        if (arr) {
            const index = arr.indexOf(component);
            if (index !== -1) {
                arr.splice(index, 1);
            }
        }
    }
}
