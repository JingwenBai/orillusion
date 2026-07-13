import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/** @internal Per-engine component lifecycle state */
export class ComponentCollectState {
    componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();
    componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();
    graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();
    waitStartComponent: Map<Object3D, IComponent[]> = new Map();
}

let _state: ComponentCollectState = new ComponentCollectState();

/** @internal */
export function _createComponentCollectState(): ComponentCollectState { return new ComponentCollectState(); }
/** @internal */
export function _setActiveComponentCollect(s: ComponentCollectState): void { _state = s; }

export class ComponentCollect {

    /** @internal */
    public static get componentsUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return _state.componentsUpdateList;
    }

    /** @internal */
    public static get componentsLateUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return _state.componentsLateUpdateList;
    }

    /** @internal */
    public static get componentsBeforeUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return _state.componentsBeforeUpdateList;
    }

    /** @internal */
    public static get componentsComputeList(): Map<View3D, Map<IComponent, Function>> {
        return _state.componentsComputeList;
    }

    /** @internal */
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return _state.componentsEnablePickerList;
    }

    /** @internal */
    public static get graphicComponent(): Map<View3D, Map<IComponent, Function>> {
        return _state.graphicComponent;
    }

    /** @internal */
    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return _state.waitStartComponent;
    }

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        let list = _state.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            _state.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        let list = _state.componentsUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        let list = _state.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            _state.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        let list = _state.componentsLateUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        let list = _state.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            _state.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        let list = _state.componentsBeforeUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        let list = _state.componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            _state.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        let list = _state.componentsComputeList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        let list = _state.graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            _state.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        let list = _state.graphicComponent.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public static appendWaitStart(component: IComponent) {
        let arr = _state.waitStartComponent.get(component.object3D);
        if (!arr) {
            _state.waitStartComponent.set(component.object3D, [component]);
        } else {
            let index = arr.indexOf(component);
            if (index == -1) {
                arr.push(component);
            }
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = _state.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index != -1) {
                arr.splice(index);
            }
        }
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        let list = _state.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            _state.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        let list = _state.componentsEnablePickerList.get(view);
        if (list) {
            list.delete(component);
        }
    }
}
