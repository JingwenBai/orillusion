import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";
import { Engine3D } from "../../../Engine3D";

/**
 * Per-engine component lifecycle registry.
 * Static methods are backward-compatible proxies that delegate to the
 * active Engine3D instance's componentCollect via Engine3D.current.
 */
export class ComponentCollect {

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

    /**
     * @internal
     */
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

    // ─── Instance methods ────────────────────────────────────────────────────

    bindUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    unBindUpdate(view: View3D, component: IComponent) {
        let list = this.componentsUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
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
        let list = this.componentsLateUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
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
        let list = this.componentsBeforeUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
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
        let list = this.componentsComputeList.get(view);
        if (list) {
            list.delete(component);
        }
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
        let list = this.graphicComponent.get(view);
        if (list) {
            list.delete(component);
        }
    }

    appendWaitStart(component: IComponent) {
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

    removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = this.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index != -1) {
                arr.splice(index);
            }
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
        let list = this.componentsEnablePickerList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    // ─── Static proxy API (backward compatibility) ──────────────────────────
    // All static methods delegate to Engine3D.current.componentCollect so that
    // existing call-sites (ComponentBase, Transform, Object3D, Entity …) work
    // unchanged across multiple engine instances.

    public static get componentsUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return Engine3D.current?.componentCollect?.componentsUpdateList;
    }

    public static get componentsLateUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return Engine3D.current?.componentCollect?.componentsLateUpdateList;
    }

    public static get componentsBeforeUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return Engine3D.current?.componentCollect?.componentsBeforeUpdateList;
    }

    public static get componentsComputeList(): Map<View3D, Map<IComponent, Function>> {
        return Engine3D.current?.componentCollect?.componentsComputeList;
    }

    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return Engine3D.current?.componentCollect?.componentsEnablePickerList;
    }

    public static get graphicComponent(): Map<View3D, Map<IComponent, Function>> {
        return Engine3D.current?.componentCollect?.graphicComponent;
    }

    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return Engine3D.current?.componentCollect?.waitStartComponent;
    }

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        Engine3D.current?.componentCollect?.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        Engine3D.current?.componentCollect?.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        Engine3D.current?.componentCollect?.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        Engine3D.current?.componentCollect?.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        Engine3D.current?.componentCollect?.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        Engine3D.current?.componentCollect?.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        Engine3D.current?.componentCollect?.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        Engine3D.current?.componentCollect?.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        Engine3D.current?.componentCollect?.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        Engine3D.current?.componentCollect?.unBindGraphic(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        Engine3D.current?.componentCollect?.appendWaitStart(component);
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        Engine3D.current?.componentCollect?.removeWaitStart(obj, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        Engine3D.current?.componentCollect?.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        Engine3D.current?.componentCollect?.unBindEnablePick(view, component);
    }
}
