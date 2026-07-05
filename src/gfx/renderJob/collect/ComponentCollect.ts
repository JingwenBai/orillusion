import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";
import { activeEngine } from "../../../core/EngineContext";

export class ComponentCollect {

    // ── Instance state (one per Engine3D instance) ──────────────────────

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
    /** @internal */
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

    // ── Instance methods ─────────────────────────────────────────────────

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
        if (list) {
            list.delete(component);
        }
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
        if (list) {
            list.delete(component);
        }
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
        if (list) {
            list.delete(component);
        }
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
        if (list) {
            list.delete(component);
        }
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
        if (list) {
            list.delete(component);
        }
    }

    public appendWaitStart(component: IComponent) {
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

    public removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = this.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index != -1) {
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
        let list = this.componentsEnablePickerList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    // ── Static router methods (backward compatibility) ───────────────────
    // These delegate to the currently-active engine instance's ComponentCollect.

    /** @internal */
    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        activeEngine?.componentCollect?.bindUpdate(view, component, call);
    }

    /** @internal */
    public static unBindUpdate(view: View3D, component: IComponent) {
        activeEngine?.componentCollect?.unBindUpdate(view, component);
    }

    /** @internal */
    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        activeEngine?.componentCollect?.bindLateUpdate(view, component, call);
    }

    /** @internal */
    public static unBindLateUpdate(view: View3D, component: IComponent) {
        activeEngine?.componentCollect?.unBindLateUpdate(view, component);
    }

    /** @internal */
    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        activeEngine?.componentCollect?.bindBeforeUpdate(view, component, call);
    }

    /** @internal */
    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        activeEngine?.componentCollect?.unBindBeforeUpdate(view, component);
    }

    /** @internal */
    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        activeEngine?.componentCollect?.bindCompute(view, component, call);
    }

    /** @internal */
    public static unBindCompute(view: View3D, component: IComponent) {
        activeEngine?.componentCollect?.unBindCompute(view, component);
    }

    /** @internal */
    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        activeEngine?.componentCollect?.bindGraphic(view, component, call);
    }

    /** @internal */
    public static unBindGraphic(view: View3D, component: IComponent) {
        activeEngine?.componentCollect?.unBindGraphic(view, component);
    }

    /** @internal */
    public static appendWaitStart(component: IComponent) {
        activeEngine?.componentCollect?.appendWaitStart(component);
    }

    /** @internal */
    public static removeWaitStart(obj: Object3D, component: IComponent) {
        activeEngine?.componentCollect?.removeWaitStart(obj, component);
    }

    /** @internal */
    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        activeEngine?.componentCollect?.bindEnablePick(view, component, call);
    }

    /** @internal */
    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        activeEngine?.componentCollect?.unBindEnablePick(view, component);
    }

    // Static property getters for code that reads these maps directly

    /** @internal */
    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return activeEngine?.componentCollect?.waitStartComponent;
    }

    /** @internal */
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return activeEngine?.componentCollect?.componentsEnablePickerList;
    }
}
