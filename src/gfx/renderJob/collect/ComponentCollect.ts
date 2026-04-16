import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/**
 * Per-engine component lifecycle management.
 *
 * Instance methods are used internally by the engine.
 * Static methods are backward-compatible facades that delegate to the
 * currently active ComponentCollect instance (set by Engine3D).
 * @internal
 */
export class ComponentCollect {

    // ── Active-instance pointer (set by Engine3D before each frame) ──────────
    /** @internal */
    public static _current: ComponentCollect | null = null;

    // ── Instance state ────────────────────────────────────────────────────────
    public componentsUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsComputeList: Map<View3D, Map<IComponent, Function>>;
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>>;
    public graphicComponent: Map<View3D, Map<IComponent, Function>>;
    public waitStartComponent: Map<Object3D, IComponent[]>;

    constructor() {
        this.componentsUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsLateUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsBeforeUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsComputeList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsEnablePickerList = new Map<View3D, Map<ColliderComponent, Function>>();
        this.graphicComponent = new Map<View3D, Map<IComponent, Function>>();
        this.waitStartComponent = new Map<Object3D, IComponent[]>();
    }

    // ── Instance methods ──────────────────────────────────────────────────────

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

    public appendWaitStart(component: IComponent) {
        let arr = this.waitStartComponent.get(component.object3D);
        if (!arr) {
            this.waitStartComponent.set(component.object3D, [component]);
        } else {
            if (arr.indexOf(component) == -1) {
                arr.push(component);
            }
        }
    }

    public removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = this.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index != -1) {
                arr.splice(index, 1);
            }
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
        this.componentsEnablePickerList.get(view)?.delete(component);
    }

    // ── Static facades (backward-compatible, delegate to _current) ────────────

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._current?.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        ComponentCollect._current?.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._current?.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        ComponentCollect._current?.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._current?.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        ComponentCollect._current?.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._current?.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        ComponentCollect._current?.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._current?.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        ComponentCollect._current?.unBindGraphic(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        ComponentCollect._current?.appendWaitStart(component);
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        ComponentCollect._current?.removeWaitStart(obj, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        ComponentCollect._current?.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        ComponentCollect._current?.unBindEnablePick(view, component);
    }

    /**
     * Static property accessors — delegate to the current active instance.
     * Needed for code that reads ComponentCollect.componentsEnablePickerList etc.
     */
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> | undefined {
        return ComponentCollect._current?.componentsEnablePickerList;
    }

    public static get waitStartComponent(): Map<Object3D, IComponent[]> | undefined {
        return ComponentCollect._current?.waitStartComponent;
    }
}
