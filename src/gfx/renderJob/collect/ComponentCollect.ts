import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";
import { getCurrentEngineId } from "../../../core/EngineContext";

interface ComponentCollectData {
    componentsUpdateList: Map<View3D, Map<IComponent, Function>>;
    componentsLateUpdateList: Map<View3D, Map<IComponent, Function>>;
    componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>>;
    componentsComputeList: Map<View3D, Map<IComponent, Function>>;
    componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>>;
    graphicComponent: Map<View3D, Map<IComponent, Function>>;
    waitStartComponent: Map<Object3D, IComponent[]>;
}

function createComponentCollectData(): ComponentCollectData {
    return {
        componentsUpdateList: new Map(),
        componentsLateUpdateList: new Map(),
        componentsBeforeUpdateList: new Map(),
        componentsComputeList: new Map(),
        componentsEnablePickerList: new Map(),
        graphicComponent: new Map(),
        waitStartComponent: new Map(),
    };
}

export class ComponentCollect {
    private static _store: Map<number, ComponentCollectData> = new Map();

    private static _data(): ComponentCollectData {
        const id = getCurrentEngineId();
        let d = ComponentCollect._store.get(id);
        if (!d) {
            d = createComponentCollectData();
            ComponentCollect._store.set(id, d);
        }
        return d;
    }

    /**
     * @internal
     */
    public static get componentsUpdateList() { return ComponentCollect._data().componentsUpdateList; }

    /**
     * @internal
     */
    public static get componentsLateUpdateList() { return ComponentCollect._data().componentsLateUpdateList; }

    /**
     * @internal
     */
    public static get componentsBeforeUpdateList() { return ComponentCollect._data().componentsBeforeUpdateList; }

    /**
     * @internal
     */
    public static get componentsComputeList() { return ComponentCollect._data().componentsComputeList; }

    /**
     * @internal
     */
    public static get componentsEnablePickerList() { return ComponentCollect._data().componentsEnablePickerList; }

    /**
     * @internal
     */
    public static get graphicComponent() { return ComponentCollect._data().graphicComponent; }

    /**
     * @internal
     */
    public static get waitStartComponent() { return ComponentCollect._data().waitStartComponent; }

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        let list = ComponentCollect.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            ComponentCollect.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        let list = ComponentCollect.componentsUpdateList.get(view);
        if (list) { list.delete(component); }
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        let list = ComponentCollect.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            ComponentCollect.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        let list = ComponentCollect.componentsLateUpdateList.get(view);
        if (list) { list.delete(component); }
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        let list = ComponentCollect.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            ComponentCollect.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        let list = ComponentCollect.componentsBeforeUpdateList.get(view);
        if (list) { list.delete(component); }
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        let list = ComponentCollect.componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            ComponentCollect.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        let list = ComponentCollect.componentsComputeList.get(view);
        if (list) { list.delete(component); }
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        let list = ComponentCollect.graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            ComponentCollect.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        let list = ComponentCollect.graphicComponent.get(view);
        if (list) { list.delete(component); }
    }

    public static appendWaitStart(component: IComponent) {
        let arr = ComponentCollect.waitStartComponent.get(component.object3D);
        if (!arr) {
            ComponentCollect.waitStartComponent.set(component.object3D, [component]);
        } else {
            let index = arr.indexOf(component);
            if (index == -1) { arr.push(component); }
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = ComponentCollect.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index != -1) { arr.splice(index); }
        }
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        let list = ComponentCollect.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            ComponentCollect.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        let list = ComponentCollect.componentsEnablePickerList.get(view);
        if (list) { list.delete(component); }
    }
}
