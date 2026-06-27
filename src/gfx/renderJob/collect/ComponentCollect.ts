import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/**
 * Per-engine component lifecycle collection.
 * Static dispatch methods route to the correct per-engine instance via view.engine.
 * @internal
 */
export class ComponentCollect {

    // ─── Instance state (per Engine3D instance) ───────────────────────────────

    public componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();
    public graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();

    // ─── Global wait queue (components pending start, not yet view-bound) ─────

    public static waitStartComponent: Map<Object3D, IComponent[]> = new Map();

    // ─── Static dispatch helpers ──────────────────────────────────────────────

    /** Route to the per-engine ComponentCollect via view.engine */
    private static _dispatch(view: View3D): ComponentCollect | null {
        return (view as any)?.engine?.componentCollect ?? null;
    }

    // ─── Static dispatch methods (public API – callers unchanged) ─────────────

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        const cc = ComponentCollect._dispatch(view);
        if (!cc) return;
        let list = cc.componentsUpdateList.get(view);
        if (!list) { list = new Map(); cc.componentsUpdateList.set(view, list); }
        list.set(component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        ComponentCollect._dispatch(view)?.componentsUpdateList.get(view)?.delete(component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        const cc = ComponentCollect._dispatch(view);
        if (!cc) return;
        let list = cc.componentsLateUpdateList.get(view);
        if (!list) { list = new Map(); cc.componentsLateUpdateList.set(view, list); }
        list.set(component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        ComponentCollect._dispatch(view)?.componentsLateUpdateList.get(view)?.delete(component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        const cc = ComponentCollect._dispatch(view);
        if (!cc) return;
        let list = cc.componentsBeforeUpdateList.get(view);
        if (!list) { list = new Map(); cc.componentsBeforeUpdateList.set(view, list); }
        list.set(component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        ComponentCollect._dispatch(view)?.componentsBeforeUpdateList.get(view)?.delete(component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        const cc = ComponentCollect._dispatch(view);
        if (!cc) return;
        let list = cc.componentsComputeList.get(view);
        if (!list) { list = new Map(); cc.componentsComputeList.set(view, list); }
        list.set(component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        ComponentCollect._dispatch(view)?.componentsComputeList.get(view)?.delete(component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        const cc = ComponentCollect._dispatch(view);
        if (!cc) return;
        let list = cc.graphicComponent.get(view);
        if (!list) { list = new Map(); cc.graphicComponent.set(view, list); }
        list.set(component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        ComponentCollect._dispatch(view)?.graphicComponent.get(view)?.delete(component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        const cc = ComponentCollect._dispatch(view);
        if (!cc) return;
        let list = cc.componentsEnablePickerList.get(view);
        if (!list) { list = new Map(); cc.componentsEnablePickerList.set(view, list); }
        list.set(component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        ComponentCollect._dispatch(view)?.componentsEnablePickerList.get(view)?.delete(component);
    }

    public static appendWaitStart(component: IComponent) {
        const obj = component.object3D;
        let arr = ComponentCollect.waitStartComponent.get(obj);
        if (!arr) {
            ComponentCollect.waitStartComponent.set(obj, [component]);
        } else if (arr.indexOf(component) === -1) {
            arr.push(component);
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        const arr = ComponentCollect.waitStartComponent.get(obj);
        if (arr) {
            const index = arr.indexOf(component);
            if (index !== -1) arr.splice(index, 1);
        }
    }
}
