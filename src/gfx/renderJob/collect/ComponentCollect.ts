import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

let _current: ComponentCollect | null = null;

/**
 * @internal
 * Activate a ComponentCollect instance as the current one. Called by Engine3D.
 */
export function _setCurrentComponentCollect(c: ComponentCollect | null): void {
    _current = c;
}

/**
 * Manages per-engine component lifecycle callback registration.
 * @internal
 */
export class ComponentCollect {

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

    // ── Static property accessors (read-only views into current instance) ──────

    /** @internal Direct access to the current waitStartComponent map. */
    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return _current!.waitStartComponent;
    }

    /** @internal Direct access to the current componentsEnablePickerList map. */
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return _current!.componentsEnablePickerList;
    }

    // ── Static method accessors (delegate to current engine's ComponentCollect) ──────

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        let list = _current!.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            _current!.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        _current!.componentsUpdateList.get(view)?.delete(component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        let list = _current!.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            _current!.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        _current!.componentsLateUpdateList.get(view)?.delete(component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        let list = _current!.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            _current!.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        _current!.componentsBeforeUpdateList.get(view)?.delete(component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        let list = _current!.componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            _current!.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        _current!.componentsComputeList.get(view)?.delete(component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        let list = _current!.graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            _current!.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        _current!.graphicComponent.get(view)?.delete(component);
    }

    public static appendWaitStart(component: IComponent) {
        const obj = component.object3D;
        let arr = _current!.waitStartComponent.get(obj);
        if (!arr) {
            _current!.waitStartComponent.set(obj, [component]);
        } else if (arr.indexOf(component) === -1) {
            arr.push(component);
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        const arr = _current!.waitStartComponent.get(obj);
        if (arr) {
            const index = arr.indexOf(component);
            if (index !== -1) {
                arr.splice(index, 1);
            }
        }
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        let list = _current!.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            _current!.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        _current!.componentsEnablePickerList.get(view)?.delete(component);
    }
}
