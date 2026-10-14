import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

export class ComponentCollect {

    // ---- Active instance registry (multi-instance support) ----
    private static _active: ComponentCollect;

    public static setActive(instance: ComponentCollect): void {
        ComponentCollect._active = instance;
    }

    public static createInstance(): ComponentCollect {
        const instance = new ComponentCollect();
        instance._doInit();
        return instance;
    }

    // ---- Static facade (zero changes required at call sites) ----

    /** @internal */
    public static get componentsUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._active._componentsUpdateList;
    }

    /** @internal */
    public static get componentsLateUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._active._componentsLateUpdateList;
    }

    /** @internal */
    public static get componentsBeforeUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._active._componentsBeforeUpdateList;
    }

    /** @internal */
    public static get componentsComputeList(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._active._componentsComputeList;
    }

    /** @internal */
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return ComponentCollect._active._componentsEnablePickerList;
    }

    /** @internal */
    public static get graphicComponent(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._active._graphicComponent;
    }

    /** @internal */
    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return ComponentCollect._active._waitStartComponent;
    }

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._active._bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        ComponentCollect._active._unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._active._bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        ComponentCollect._active._unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._active._bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        ComponentCollect._active._unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._active._bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        ComponentCollect._active._unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        ComponentCollect._active._bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        ComponentCollect._active._unBindGraphic(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        ComponentCollect._active._appendWaitStart(component);
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        ComponentCollect._active._removeWaitStart(obj, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        ComponentCollect._active._bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        ComponentCollect._active._unBindEnablePick(view, component);
    }

    // ---- Instance state ----
    private _componentsUpdateList: Map<View3D, Map<IComponent, Function>>;
    private _componentsLateUpdateList: Map<View3D, Map<IComponent, Function>>;
    private _componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>>;
    private _componentsComputeList: Map<View3D, Map<IComponent, Function>>;
    private _componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>>;
    private _graphicComponent: Map<View3D, Map<IComponent, Function>>;
    private _waitStartComponent: Map<Object3D, IComponent[]>;

    private _doInit(): void {
        this._componentsUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this._componentsLateUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this._componentsBeforeUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this._componentsComputeList = new Map<View3D, Map<IComponent, Function>>();
        this._componentsEnablePickerList = new Map<View3D, Map<ColliderComponent, Function>>();
        this._graphicComponent = new Map<View3D, Map<IComponent, Function>>();
        this._waitStartComponent = new Map<Object3D, IComponent[]>();
    }

    // ---- Instance implementations ----
    private _bindUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this._componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this._componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    private _unBindUpdate(view: View3D, component: IComponent) {
        let list = this._componentsUpdateList.get(view);
        if (list) list.delete(component);
    }

    private _bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this._componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this._componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    private _unBindLateUpdate(view: View3D, component: IComponent) {
        let list = this._componentsLateUpdateList.get(view);
        if (list) list.delete(component);
    }

    private _bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this._componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this._componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    private _unBindBeforeUpdate(view: View3D, component: IComponent) {
        let list = this._componentsBeforeUpdateList.get(view);
        if (list) list.delete(component);
    }

    private _bindCompute(view: View3D, component: IComponent, call: Function) {
        let list = this._componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this._componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    private _unBindCompute(view: View3D, component: IComponent) {
        let list = this._componentsComputeList.get(view);
        if (list) list.delete(component);
    }

    private _bindGraphic(view: View3D, component: IComponent, call: Function) {
        let list = this._graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this._graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    private _unBindGraphic(view: View3D, component: IComponent) {
        let list = this._graphicComponent.get(view);
        if (list) list.delete(component);
    }

    private _appendWaitStart(component: IComponent) {
        let arr = this._waitStartComponent.get(component.object3D);
        if (!arr) {
            this._waitStartComponent.set(component.object3D, [component]);
        } else {
            if (arr.indexOf(component) == -1) arr.push(component);
        }
    }

    private _removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = this._waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index != -1) arr.splice(index);
        }
    }

    private _bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        let list = this._componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            this._componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    private _unBindEnablePick(view: View3D, component: ColliderComponent) {
        let list = this._componentsEnablePickerList.get(view);
        if (list) list.delete(component);
    }
}
