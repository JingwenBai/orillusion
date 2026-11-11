import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/**
 * @internal
 */
export class ComponentCollect {

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

    // --- Static proxy API (delegates to current instance) ---

    /** @internal */
    public static _instance: ComponentCollect;

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        let inst = ComponentCollect._instance;
        let list = inst.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            inst.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        let inst = ComponentCollect._instance;
        let list = inst.componentsUpdateList.get(view);
        if (list) list.delete(component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        let inst = ComponentCollect._instance;
        let list = inst.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            inst.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        let inst = ComponentCollect._instance;
        let list = inst.componentsLateUpdateList.get(view);
        if (list) list.delete(component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        let inst = ComponentCollect._instance;
        let list = inst.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            inst.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        let inst = ComponentCollect._instance;
        let list = inst.componentsBeforeUpdateList.get(view);
        if (list) list.delete(component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        let inst = ComponentCollect._instance;
        let list = inst.componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            inst.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        let inst = ComponentCollect._instance;
        let list = inst.componentsComputeList.get(view);
        if (list) list.delete(component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        let inst = ComponentCollect._instance;
        let list = inst.graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            inst.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        let inst = ComponentCollect._instance;
        let list = inst.graphicComponent.get(view);
        if (list) list.delete(component);
    }

    public static appendWaitStart(component: IComponent) {
        let inst = ComponentCollect._instance;
        let arr = inst.waitStartComponent.get(component.object3D);
        if (!arr) {
            inst.waitStartComponent.set(component.object3D, [component]);
        } else {
            let index = arr.indexOf(component);
            if (index == -1) arr.push(component);
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        let inst = ComponentCollect._instance;
        let arr = inst.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index != -1) arr.splice(index);
        }
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        let inst = ComponentCollect._instance;
        let list = inst.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            inst.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        let inst = ComponentCollect._instance;
        let list = inst.componentsEnablePickerList.get(view);
        if (list) list.delete(component);
    }

    // --- Static accessors for backward-compat read access ---

    public static get componentsUpdateList() { return ComponentCollect._instance?.componentsUpdateList; }
    public static get componentsLateUpdateList() { return ComponentCollect._instance?.componentsLateUpdateList; }
    public static get componentsBeforeUpdateList() { return ComponentCollect._instance?.componentsBeforeUpdateList; }
    public static get componentsComputeList() { return ComponentCollect._instance?.componentsComputeList; }
    public static get componentsEnablePickerList() { return ComponentCollect._instance?.componentsEnablePickerList; }
    public static get graphicComponent() { return ComponentCollect._instance?.graphicComponent; }
    public static get waitStartComponent() { return ComponentCollect._instance?.waitStartComponent; }
}
