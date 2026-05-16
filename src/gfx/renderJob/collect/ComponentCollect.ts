import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

export class ComponentCollect {

    /**
     * Global pending-start queue (shared across all engine instances).
     * Entries are processed by each scene's waitUpdate(), filtered to that scene.
     * @internal
     */
    public static waitStartComponent: Map<Object3D, IComponent[]> = new Map<Object3D, IComponent[]>();

    // ── per-engine instance state ──────────────────────────────────────────

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
        this.componentsUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsLateUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsBeforeUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsComputeList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsEnablePickerList = new Map<View3D, Map<ColliderComponent, Function>>();
        this.graphicComponent = new Map<View3D, Map<IComponent, Function>>();
    }

    // ── static helpers for the global pending queue ──────────────────────

    public static appendWaitStart(component: IComponent) {
        let arr = ComponentCollect.waitStartComponent.get(component.object3D);
        if (!arr) {
            ComponentCollect.waitStartComponent.set(component.object3D, [component]);
        } else {
            if (arr.indexOf(component) === -1) {
                arr.push(component);
            }
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

    // ── instance methods ──────────────────────────────────────────────────

    public bindUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindUpdate(view: View3D, component: IComponent) {
        let list = this.componentsUpdateList.get(view);
        if (list) list.delete(component);
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
        let list = this.componentsLateUpdateList.get(view);
        if (list) list.delete(component);
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
        let list = this.componentsBeforeUpdateList.get(view);
        if (list) list.delete(component);
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
        let list = this.componentsComputeList.get(view);
        if (list) list.delete(component);
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
        let list = this.graphicComponent.get(view);
        if (list) list.delete(component);
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
        let list = this.componentsEnablePickerList.get(view);
        if (list) list.delete(component);
    }
}
