import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

export class ComponentCollect {

    private static _current: ComponentCollect;

    /**
     * @internal
     * Set the active ComponentCollect instance used by the currently rendering engine.
     */
    public static setCurrentInstance(instance: ComponentCollect) {
        this._current = instance;
    }

    // --------------- Static proxy methods (delegate to active instance) ---------------

    /**
     * @internal
     */
    public static get componentsUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return this._current?.componentsUpdateList;
    }

    /**
     * @internal
     */
    public static get componentsLateUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return this._current?.componentsLateUpdateList;
    }

    /**
     * @internal
     */
    public static get componentsBeforeUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return this._current?.componentsBeforeUpdateList;
    }

    /**
     * @internal
     */
    public static get componentsComputeList(): Map<View3D, Map<IComponent, Function>> {
        return this._current?.componentsComputeList;
    }

    /**
     * @internal
     */
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return this._current?.componentsEnablePickerList;
    }

    /**
     * @internal
     */
    public static get graphicComponent(): Map<View3D, Map<IComponent, Function>> {
        return this._current?.graphicComponent;
    }

    /**
     * @internal
     */
    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return this._current?.waitStartComponent;
    }

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        this._current?.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        this._current?.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        this._current?.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        this._current?.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        this._current?.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        this._current?.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        this._current?.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        this._current?.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        this._current?.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        this._current?.unBindGraphic(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        this._current?.appendWaitStart(component);
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        this._current?.removeWaitStart(obj, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        this._current?.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        this._current?.unBindEnablePick(view, component);
    }

    // --------------- Instance members ---------------

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

    /**
     * @internal
     */
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
}
