import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/**
 * @internal
 * Per-engine component lifecycle registry.
 * Instantiated by Engine3D; legacy static methods route here via view.engine.
 */
export class ComponentCollect {

    // ─── Instance state ───────────────────────────────────────────────────────

    public componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();
    public graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();
    public waitStartComponent: Map<Object3D, IComponent[]> = new Map();

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

    public appendWaitStart(component: IComponent) {
        const obj = component.object3D;
        let arr = this.waitStartComponent.get(obj);
        if (!arr) {
            this.waitStartComponent.set(obj, [component]);
        } else if (arr.indexOf(component) === -1) {
            arr.push(component);
        }
    }

    public removeWaitStart(obj: Object3D, component: IComponent) {
        const arr = this.waitStartComponent.get(obj);
        if (arr) {
            const index = arr.indexOf(component);
            if (index !== -1) arr.splice(index, 1);
        }
    }

    // ─── Static backward-compat API ───────────────────────────────────────────
    // Route to the engine that owns the given view.
    // Engine3D calls setDefaultComponentCollect() so legacy single-engine
    // code that doesn't have a view reference still works.

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        _resolve(view)?.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        _resolve(view)?.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        _resolve(view)?.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        _resolve(view)?.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        _resolve(view)?.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        _resolve(view)?.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        _resolve(view)?.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        _resolve(view)?.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        _resolve(view)?.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        _resolve(view)?.unBindGraphic(view, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        _resolve(view)?.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        _resolve(view)?.unBindEnablePick(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        const view = component.transform?.view3D;
        const collect = (view?.engine?.componentCollect) ?? _defaultCollect;
        collect?.appendWaitStart(component);
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        const view = component.transform?.view3D;
        const collect = (view?.engine?.componentCollect) ?? _defaultCollect;
        collect?.removeWaitStart(obj, component);
    }
}

// ─── Module-level fallback (set by Engine3D) ──────────────────────────────────

/** @internal */
export let _defaultCollect: ComponentCollect | null = null;

/** @internal Called by Engine3D on first init to enable legacy static usage. */
export function setDefaultComponentCollect(collect: ComponentCollect) {
    _defaultCollect = collect;
}

function _resolve(view: View3D): ComponentCollect | undefined {
    if (view?.engine) return view.engine.componentCollect;
    return _defaultCollect ?? undefined;
}
