import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";
import { getCurrentEngine } from "../../../engineRegistry";

/**
 * Per-engine component registration and update scheduling.
 * Static methods are compatibility shims that delegate to the active engine instance.
 * @internal
 */
export class ComponentCollect {

    // ── Instance fields ────────────────────────────────────────────────────

    public componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();
    public graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();
    public waitStartComponent: Map<Object3D, IComponent[]> = new Map();

    // ── Instance methods ───────────────────────────────────────────────────

    bindUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    unBindUpdate(view: View3D, component: IComponent) {
        this.componentsUpdateList.get(view)?.delete(component);
    }

    bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    unBindLateUpdate(view: View3D, component: IComponent) {
        this.componentsLateUpdateList.get(view)?.delete(component);
    }

    bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    unBindBeforeUpdate(view: View3D, component: IComponent) {
        this.componentsBeforeUpdateList.get(view)?.delete(component);
    }

    bindCompute(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    unBindCompute(view: View3D, component: IComponent) {
        this.componentsComputeList.get(view)?.delete(component);
    }

    bindGraphic(view: View3D, component: IComponent, call: Function) {
        let list = this.graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    unBindGraphic(view: View3D, component: IComponent) {
        this.graphicComponent.get(view)?.delete(component);
    }

    appendWaitStart(component: IComponent) {
        let arr = this.waitStartComponent.get(component.object3D);
        if (!arr) {
            this.waitStartComponent.set(component.object3D, [component]);
        } else {
            if (arr.indexOf(component) === -1) arr.push(component);
        }
    }

    removeWaitStart(obj: Object3D, component: IComponent) {
        const arr = this.waitStartComponent.get(obj);
        if (arr) {
            const index = arr.indexOf(component);
            if (index !== -1) arr.splice(index, 1);
        }
    }

    bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        let list = this.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            this.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    unBindEnablePick(view: View3D, component: ColliderComponent) {
        this.componentsEnablePickerList.get(view)?.delete(component);
    }

    // ── Static compatibility shims (delegate to active engine) ─────────────
    // These allow existing component code to call ComponentCollect.bindUpdate(...)
    // without modification.  The active engine is resolved via:
    //   1. view.engine  (set when engine.startRenderView() is called)
    //   2. Engine3D.current  (fallback during engine init / frame loop)

    /** @internal */
    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolve(view)?.bindUpdate(view, component, call);
    }
    /** @internal */
    public static unBindUpdate(view: View3D, component: IComponent) {
        ComponentCollect._resolve(view)?.unBindUpdate(view, component);
    }
    /** @internal */
    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolve(view)?.bindLateUpdate(view, component, call);
    }
    /** @internal */
    public static unBindLateUpdate(view: View3D, component: IComponent) {
        ComponentCollect._resolve(view)?.unBindLateUpdate(view, component);
    }
    /** @internal */
    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolve(view)?.bindBeforeUpdate(view, component, call);
    }
    /** @internal */
    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        ComponentCollect._resolve(view)?.unBindBeforeUpdate(view, component);
    }
    /** @internal */
    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolve(view)?.bindCompute(view, component, call);
    }
    /** @internal */
    public static unBindCompute(view: View3D, component: IComponent) {
        ComponentCollect._resolve(view)?.unBindCompute(view, component);
    }
    /** @internal */
    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._resolve(view)?.bindGraphic(view, component, call);
    }
    /** @internal */
    public static unBindGraphic(view: View3D, component: IComponent) {
        ComponentCollect._resolve(view)?.unBindGraphic(view, component);
    }
    /** @internal */
    public static appendWaitStart(component: IComponent) {
        ComponentCollect._resolveCurrent()?.appendWaitStart(component);
    }
    /** @internal */
    public static removeWaitStart(obj: Object3D, component: IComponent) {
        ComponentCollect._resolveCurrent()?.removeWaitStart(obj, component);
    }
    /** @internal */
    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        ComponentCollect._resolve(view)?.bindEnablePick(view, component, call);
    }
    /** @internal */
    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        ComponentCollect._resolve(view)?.unBindEnablePick(view, component);
    }

    // ── Shim helpers ───────────────────────────────────────────────────────

    private static _resolve(view: View3D): ComponentCollect | null {
        if (view?.engine) return view.engine.componentCollect;
        return getCurrentEngine()?.componentCollect ?? null;
    }
}
