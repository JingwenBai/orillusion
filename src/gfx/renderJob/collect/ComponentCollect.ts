import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";
import { EngineRegistry } from "../../../util/EngineRegistry";

/**
 * ComponentCollect manages per-view component update/render lists.
 *
 * In multi-instance mode each Engine3D owns a ComponentCollect instance.
 * The static facade methods route to the correct instance via EngineRegistry
 * so all existing callers (ComponentBase, Transform, etc.) work unchanged.
 * @internal
 */
export class ComponentCollect {

    // --- Per-instance state ---
    public componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();
    public graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();

    // waitStartComponent is intentionally global (components may be created before
    // being attached to a scene/view).  Engine3D.updateFrame filters by its own views.
    public static waitStartComponent: Map<Object3D, IComponent[]> = new Map();

    // --- Global fallback for single-instance backward compat ---
    private static _default: ComponentCollect = new ComponentCollect();

    private static _get(view?: View3D): ComponentCollect {
        if (view) {
            const ctx = EngineRegistry.getByView(view);
            if (ctx?.componentCollect) return ctx.componentCollect;
        }
        return EngineRegistry.active?.componentCollect ?? ComponentCollect._default;
    }

    // --- Static facade methods (keep existing API) ---

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        const inst = ComponentCollect._get(view);
        let list = inst.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            inst.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        const inst = ComponentCollect._get(view);
        inst.componentsUpdateList.get(view)?.delete(component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        const inst = ComponentCollect._get(view);
        let list = inst.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            inst.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        const inst = ComponentCollect._get(view);
        inst.componentsLateUpdateList.get(view)?.delete(component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        const inst = ComponentCollect._get(view);
        let list = inst.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            inst.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        const inst = ComponentCollect._get(view);
        inst.componentsBeforeUpdateList.get(view)?.delete(component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        const inst = ComponentCollect._get(view);
        let list = inst.componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            inst.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        const inst = ComponentCollect._get(view);
        inst.componentsComputeList.get(view)?.delete(component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        const inst = ComponentCollect._get(view);
        let list = inst.graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            inst.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        const inst = ComponentCollect._get(view);
        inst.graphicComponent.get(view)?.delete(component);
    }

    public static appendWaitStart(component: IComponent) {
        const arr = ComponentCollect.waitStartComponent.get(component.object3D);
        if (!arr) {
            ComponentCollect.waitStartComponent.set(component.object3D, [component]);
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

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        const inst = ComponentCollect._get(view);
        let list = inst.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            inst.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        const inst = ComponentCollect._get(view);
        inst.componentsEnablePickerList.get(view)?.delete(component);
    }
}
