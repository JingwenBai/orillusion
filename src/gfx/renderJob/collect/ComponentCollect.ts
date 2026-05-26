import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/**
 * @internal
 * Per-engine component lifecycle registry.
 */
export class ComponentCollect {

    public componentsUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsComputeList: Map<View3D, Map<IComponent, Function>>;
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>>;
    public graphicComponent: Map<View3D, Map<IComponent, Function>>;

    /** @internal Global waiting list (keyed by Object3D, safe to share across engines) */
    public static waitStartComponent: Map<Object3D, IComponent[]> = new Map<Object3D, IComponent[]>();

    constructor() {
        this.componentsUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsLateUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsBeforeUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsComputeList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsEnablePickerList = new Map<View3D, Map<ColliderComponent, Function>>();
        this.graphicComponent = new Map<View3D, Map<IComponent, Function>>();
    }

    // ===== INSTANCE METHODS =====

    public bindUpdateInternal(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindUpdateInternal(view: View3D, component: IComponent) {
        this.componentsUpdateList.get(view)?.delete(component);
    }

    public bindLateUpdateInternal(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindLateUpdateInternal(view: View3D, component: IComponent) {
        this.componentsLateUpdateList.get(view)?.delete(component);
    }

    public bindBeforeUpdateInternal(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindBeforeUpdateInternal(view: View3D, component: IComponent) {
        this.componentsBeforeUpdateList.get(view)?.delete(component);
    }

    public bindComputeInternal(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindComputeInternal(view: View3D, component: IComponent) {
        this.componentsComputeList.get(view)?.delete(component);
    }

    public bindGraphicInternal(view: View3D, component: IComponent, call: Function) {
        let list = this.graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public unBindGraphicInternal(view: View3D, component: IComponent) {
        this.graphicComponent.get(view)?.delete(component);
    }

    public bindEnablePickInternal(view: View3D, component: ColliderComponent, call: Function) {
        let list = this.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            this.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindEnablePickInternal(view: View3D, component: ColliderComponent) {
        this.componentsEnablePickerList.get(view)?.delete(component);
    }

    // ===== STATIC SHIMS (route through view.engine for backward compat) =====

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        (view as any)?.engine?.componentCollect?.bindUpdateInternal(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        (view as any)?.engine?.componentCollect?.unBindUpdateInternal(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        (view as any)?.engine?.componentCollect?.bindLateUpdateInternal(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        (view as any)?.engine?.componentCollect?.unBindLateUpdateInternal(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        (view as any)?.engine?.componentCollect?.bindBeforeUpdateInternal(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        (view as any)?.engine?.componentCollect?.unBindBeforeUpdateInternal(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        (view as any)?.engine?.componentCollect?.bindComputeInternal(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        (view as any)?.engine?.componentCollect?.unBindComputeInternal(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        (view as any)?.engine?.componentCollect?.bindGraphicInternal(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        (view as any)?.engine?.componentCollect?.unBindGraphicInternal(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        let arr = ComponentCollect.waitStartComponent.get(component.object3D);
        if (!arr) {
            ComponentCollect.waitStartComponent.set(component.object3D, [component]);
        } else if (arr.indexOf(component) === -1) {
            arr.push(component);
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = ComponentCollect.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index !== -1) {
                arr.splice(index, 1);
            }
        }
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        (view as any)?.engine?.componentCollect?.bindEnablePickInternal(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        (view as any)?.engine?.componentCollect?.unBindEnablePickInternal(view, component);
    }
}
