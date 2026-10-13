import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/**
 * Per-engine component update list manager.
 *
 * Instance methods are used by Engine3D's render loop.
 * Static methods are backward-compatible shims that route calls through the
 * view's owning engine, so existing component code needs no changes.
 * @internal
 */
export class ComponentCollect {

    // ─── Global waiting-start queue (shared across engines) ───────────────────
    // Keyed by Object3D. Processed by Entity.waitUpdate() on the first frame
    // the object's scene is updated. Each component is started exactly once
    // (deleted from the map after start), so sharing is safe.

    /** @internal */
    public static waitStartComponent: Map<Object3D, IComponent[]> = new Map();

    // ─── Instance (per-engine) component lists ────────────────────────────────

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

    constructor() {
        this.componentsUpdateList = new Map();
        this.componentsLateUpdateList = new Map();
        this.componentsBeforeUpdateList = new Map();
        this.componentsComputeList = new Map();
        this.componentsEnablePickerList = new Map();
        this.graphicComponent = new Map();
    }

    // ─── Instance methods ─────────────────────────────────────────────────────

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

    // ─── Static shims (backward-compat, routes to view's owning engine) ───────
    // These have the same signatures as the old static API so all existing
    // component code continues to compile and run unchanged.

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        (view as any)?.engine?.componentCollect.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        (view as any)?.engine?.componentCollect.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        (view as any)?.engine?.componentCollect.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        (view as any)?.engine?.componentCollect.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        (view as any)?.engine?.componentCollect.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        (view as any)?.engine?.componentCollect.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        (view as any)?.engine?.componentCollect.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        (view as any)?.engine?.componentCollect.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        (view as any)?.engine?.componentCollect.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        (view as any)?.engine?.componentCollect.unBindGraphic(view, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        (view as any)?.engine?.componentCollect.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        (view as any)?.engine?.componentCollect.unBindEnablePick(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        const obj = component.object3D;
        let arr = ComponentCollect.waitStartComponent.get(obj);
        if (!arr) {
            ComponentCollect.waitStartComponent.set(obj, [component]);
        } else {
            if (arr.indexOf(component) === -1) {
                arr.push(component);
            }
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        const arr = ComponentCollect.waitStartComponent.get(obj);
        if (arr) {
            const index = arr.indexOf(component);
            if (index !== -1) {
                arr.splice(index, 1);
            }
        }
    }
}
