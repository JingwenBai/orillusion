import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

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

    constructor() {
        this.componentsUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsLateUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsBeforeUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsComputeList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsEnablePickerList = new Map<View3D, Map<ColliderComponent, Function>>();
        this.graphicComponent = new Map<View3D, Map<IComponent, Function>>();
    }

    /**
     * Global queue for components waiting to start (engine-agnostic pre-registration).
     * Components move to per-engine lists once __start() is called.
     * @internal
     */
    public static waitStartComponent: Map<Object3D, IComponent[]> = new Map<Object3D, IComponent[]>();

    // ── Instance methods ────────────────────────────────────────────────────

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
        const map = ComponentCollect.waitStartComponent;
        let arr = map.get(component.object3D);
        if (!arr) {
            map.set(component.object3D, [component]);
        } else {
            if (arr.indexOf(component) === -1) {
                arr.push(component);
            }
        }
    }

    public removeWaitStart(obj: Object3D, component: IComponent) {
        const arr = ComponentCollect.waitStartComponent.get(obj);
        if (arr) {
            const index = arr.indexOf(component);
            if (index !== -1) {
                arr.splice(index);
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

    // ── Static backward-compat delegates (route via view.engine) ────────────

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        view?.engine?.componentCollect?.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        view?.engine?.componentCollect?.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        view?.engine?.componentCollect?.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        view?.engine?.componentCollect?.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        view?.engine?.componentCollect?.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        view?.engine?.componentCollect?.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        view?.engine?.componentCollect?.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        view?.engine?.componentCollect?.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        view?.engine?.componentCollect?.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        view?.engine?.componentCollect?.unBindGraphic(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        const map = ComponentCollect.waitStartComponent;
        let arr = map.get(component.object3D);
        if (!arr) {
            map.set(component.object3D, [component]);
        } else if (arr.indexOf(component) === -1) {
            arr.push(component);
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        const arr = ComponentCollect.waitStartComponent.get(obj);
        if (arr) {
            const index = arr.indexOf(component);
            if (index !== -1) {
                arr.splice(index);
            }
        }
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        view?.engine?.componentCollect?.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        view?.engine?.componentCollect?.unBindEnablePick(view, component);
    }
}
