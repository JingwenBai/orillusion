import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

export class ComponentCollect {

    private static _active: ComponentCollect;

    /** @internal Set which ComponentCollect instance is active (called by Engine3D). */
    public static activate(collect: ComponentCollect) {
        this._active = collect;
    }

    private static get _inst(): ComponentCollect {
        if (!this._active) {
            this._active = new ComponentCollect();
        }
        return this._active;
    }

    // ---- static API delegates to active instance ----

    public static get componentsUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return this._inst._componentsUpdateList;
    }
    public static get componentsLateUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return this._inst._componentsLateUpdateList;
    }
    public static get componentsBeforeUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return this._inst._componentsBeforeUpdateList;
    }
    public static get componentsComputeList(): Map<View3D, Map<IComponent, Function>> {
        return this._inst._componentsComputeList;
    }
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return this._inst._componentsEnablePickerList;
    }
    public static get graphicComponent(): Map<View3D, Map<IComponent, Function>> {
        return this._inst._graphicComponent;
    }
    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return this._inst._waitStartComponent;
    }

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        this._inst.bindUpdate(view, component, call);
    }
    public static unBindUpdate(view: View3D, component: IComponent) {
        this._inst.unBindUpdate(view, component);
    }
    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        this._inst.bindLateUpdate(view, component, call);
    }
    public static unBindLateUpdate(view: View3D, component: IComponent) {
        this._inst.unBindLateUpdate(view, component);
    }
    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        this._inst.bindBeforeUpdate(view, component, call);
    }
    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        this._inst.unBindBeforeUpdate(view, component);
    }
    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        this._inst.bindCompute(view, component, call);
    }
    public static unBindCompute(view: View3D, component: IComponent) {
        this._inst.unBindCompute(view, component);
    }
    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        this._inst.bindGraphic(view, component, call);
    }
    public static unBindGraphic(view: View3D, component: IComponent) {
        this._inst.unBindGraphic(view, component);
    }
    public static appendWaitStart(component: IComponent) {
        this._inst.appendWaitStart(component);
    }
    public static removeWaitStart(obj: Object3D, component: IComponent) {
        this._inst.removeWaitStart(obj, component);
    }
    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        this._inst.bindEnablePick(view, component, call);
    }
    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        this._inst.unBindEnablePick(view, component);
    }

    // ---- instance state ----

    /**
     * @internal
     */
    public _componentsUpdateList: Map<View3D, Map<IComponent, Function>>;
    /**
     * @internal
     */
    public _componentsLateUpdateList: Map<View3D, Map<IComponent, Function>>;
    /**
     * @internal
     */
    public _componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>>;
    /**
     * @internal
     */
    public _componentsComputeList: Map<View3D, Map<IComponent, Function>>;
    /**
     * @internal
     */
    public _componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>>;
    /**
     * @internal
     */
    public _graphicComponent: Map<View3D, Map<IComponent, Function>>;
    /**
     * @internal
     */
    public _waitStartComponent: Map<Object3D, IComponent[]>;

    constructor() {
        this._componentsUpdateList = new Map();
        this._componentsLateUpdateList = new Map();
        this._componentsBeforeUpdateList = new Map();
        this._componentsComputeList = new Map();
        this._componentsEnablePickerList = new Map();
        this._graphicComponent = new Map();
        this._waitStartComponent = new Map();
    }

    public bindUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this._componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this._componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindUpdate(view: View3D, component: IComponent) {
        let list = this._componentsUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this._componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this._componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindLateUpdate(view: View3D, component: IComponent) {
        let list = this._componentsLateUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this._componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this._componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindBeforeUpdate(view: View3D, component: IComponent) {
        let list = this._componentsBeforeUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindCompute(view: View3D, component: IComponent, call: Function) {
        let list = this._componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this._componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindCompute(view: View3D, component: IComponent) {
        let list = this._componentsComputeList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindGraphic(view: View3D, component: IComponent, call: Function) {
        let list = this._graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this._graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public unBindGraphic(view: View3D, component: IComponent) {
        let list = this._graphicComponent.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public appendWaitStart(component: IComponent) {
        let arr = this._waitStartComponent.get(component.object3D);
        if (!arr) {
            this._waitStartComponent.set(component.object3D, [component]);
        } else {
            let index = arr.indexOf(component);
            if (index == -1) {
                arr.push(component);
            }
        }
    }

    public removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = this._waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index != -1) {
                arr.splice(index);
            }
        }
    }

    public bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        let list = this._componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            this._componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindEnablePick(view: View3D, component: ColliderComponent) {
        let list = this._componentsEnablePickerList.get(view);
        if (list) {
            list.delete(component);
        }
    }
}
