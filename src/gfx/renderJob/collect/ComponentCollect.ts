import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

let _inst: ComponentCollect = null;

export class ComponentCollect {

    // Static delegation getters (backward compat)

    /**
     * @internal
     */
    public static get componentsUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return _inst?.componentsUpdateList;
    }

    /**
     * @internal
     */
    public static get componentsLateUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return _inst?.componentsLateUpdateList;
    }

    /**
     * @internal
     */
    public static get componentsBeforeUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return _inst?.componentsBeforeUpdateList;
    }

    /**
     * @internal
     */
    public static get componentsComputeList(): Map<View3D, Map<IComponent, Function>> {
        return _inst?.componentsComputeList;
    }

    /**
     * @internal
     */
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return _inst?.componentsEnablePickerList;
    }

    /**
     * @internal
     */
    public static get graphicComponent(): Map<View3D, Map<IComponent, Function>> {
        return _inst?.graphicComponent;
    }

    /**
     * @internal
     */
    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return _inst?.waitStartComponent;
    }

    public static setActive(inst: ComponentCollect): void {
        _inst = inst;
    }

    // Static delegation methods (backward compat)

    public static bindUpdate(view: View3D, component: IComponent, call: Function): void {
        _inst?.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent): void {
        _inst?.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function): void {
        _inst?.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent): void {
        _inst?.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function): void {
        _inst?.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent): void {
        _inst?.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function): void {
        _inst?.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent): void {
        _inst?.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function): void {
        _inst?.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent): void {
        _inst?.unBindGraphic(view, component);
    }

    public static appendWaitStart(component: IComponent): void {
        _inst?.appendWaitStart(component);
    }

    public static removeWaitStart(obj: Object3D, component: IComponent): void {
        _inst?.removeWaitStart(obj, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function): void {
        _inst?.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent): void {
        _inst?.unBindEnablePick(view, component);
    }

    // Instance backing fields

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

    // Instance methods

    public bindUpdate(view: View3D, component: IComponent, call: Function): void {
        let list = this.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindUpdate(view: View3D, component: IComponent): void {
        let list = this.componentsUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindLateUpdate(view: View3D, component: IComponent, call: Function): void {
        let list = this.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindLateUpdate(view: View3D, component: IComponent): void {
        let list = this.componentsLateUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindBeforeUpdate(view: View3D, component: IComponent, call: Function): void {
        let list = this.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindBeforeUpdate(view: View3D, component: IComponent): void {
        let list = this.componentsBeforeUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindCompute(view: View3D, component: IComponent, call: Function): void {
        let list = this.componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindCompute(view: View3D, component: IComponent): void {
        let list = this.componentsComputeList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindGraphic(view: View3D, component: IComponent, call: Function): void {
        let list = this.graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public unBindGraphic(view: View3D, component: IComponent): void {
        let list = this.graphicComponent.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public appendWaitStart(component: IComponent): void {
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

    public removeWaitStart(obj: Object3D, component: IComponent): void {
        let arr = this.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index != -1) {
                arr.splice(index);
            }
        }
    }

    public bindEnablePick(view: View3D, component: ColliderComponent, call: Function): void {
        let list = this.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            this.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindEnablePick(view: View3D, component: ColliderComponent): void {
        let list = this.componentsEnablePickerList.get(view);
        if (list) {
            list.delete(component);
        }
    }
}
