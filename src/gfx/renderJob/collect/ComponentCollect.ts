import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/**
 * @internal
 * Per-engine instance data for ComponentCollect
 */
export class ComponentCollectContext {
    componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();
    componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();
    graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();
    waitStartComponent: Map<Object3D, IComponent[]> = new Map();
}

export class ComponentCollect {

    private static _ctx: ComponentCollectContext = new ComponentCollectContext();

    /**
     * @internal
     * Switch to a different engine instance's context
     */
    public static setContext(ctx: ComponentCollectContext) {
        ComponentCollect._ctx = ctx;
    }

    /**
     * @internal
     */
    public static get componentsUpdateList() { return ComponentCollect._ctx.componentsUpdateList; }

    /**
     * @internal
     */
    public static get componentsLateUpdateList() { return ComponentCollect._ctx.componentsLateUpdateList; }

    /**
     * @internal
     */
    public static get componentsBeforeUpdateList() { return ComponentCollect._ctx.componentsBeforeUpdateList; }

    /**
     * @internal
     */
    public static get componentsComputeList() { return ComponentCollect._ctx.componentsComputeList; }

    /**
     * @internal
     */
    public static get componentsEnablePickerList() { return ComponentCollect._ctx.componentsEnablePickerList; }

    /**
     * @internal
     */
    public static get graphicComponent() { return ComponentCollect._ctx.graphicComponent; }

    /**
     * @internal
     */
    public static get waitStartComponent() { return ComponentCollect._ctx.waitStartComponent; }

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        let list = this.componentsUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        let list = this.componentsLateUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        let list = this.componentsBeforeUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        let list = this.componentsComputeList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        let list = this.graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        let list = this.graphicComponent.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static appendWaitStart(component: IComponent) {
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

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = ComponentCollect.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index != -1) {
                arr.splice(index);
            }
        }
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        let list = this.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            this.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        let list = this.componentsEnablePickerList.get(view);
        if (list) {
            list.delete(component);
        }
    }
}
