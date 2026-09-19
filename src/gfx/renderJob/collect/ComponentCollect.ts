import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/** Per-engine instance data for component lifecycle management */
export class ComponentCollectData {
    public componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();
    public graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();
    public waitStartComponent: Map<Object3D, IComponent[]> = new Map();

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

let _current: ComponentCollectData | null = null;

export function setCurrentComponentCollect(data: ComponentCollectData): void {
    _current = data;
}

export class ComponentCollect {

    /**
     * @internal
     */
    public static get componentsUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return _current!.componentsUpdateList;
    }
    public static set componentsUpdateList(value: Map<View3D, Map<IComponent, Function>>) {
        _current!.componentsUpdateList = value;
    }

    /**
     * @internal
     */
    public static get componentsLateUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return _current!.componentsLateUpdateList;
    }
    public static set componentsLateUpdateList(value: Map<View3D, Map<IComponent, Function>>) {
        _current!.componentsLateUpdateList = value;
    }

    /**
     * @internal
     */
    public static get componentsBeforeUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return _current!.componentsBeforeUpdateList;
    }
    public static set componentsBeforeUpdateList(value: Map<View3D, Map<IComponent, Function>>) {
        _current!.componentsBeforeUpdateList = value;
    }

    /**
     * @internal
     */
    public static get componentsComputeList(): Map<View3D, Map<IComponent, Function>> {
        return _current!.componentsComputeList;
    }
    public static set componentsComputeList(value: Map<View3D, Map<IComponent, Function>>) {
        _current!.componentsComputeList = value;
    }

    /**
     * @internal
     */
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return _current!.componentsEnablePickerList;
    }
    public static set componentsEnablePickerList(value: Map<View3D, Map<ColliderComponent, Function>>) {
        _current!.componentsEnablePickerList = value;
    }

    /**
     * @internal
     */
    public static get graphicComponent(): Map<View3D, Map<IComponent, Function>> {
        return _current!.graphicComponent;
    }
    public static set graphicComponent(value: Map<View3D, Map<IComponent, Function>>) {
        _current!.graphicComponent = value;
    }

    /**
     * @internal
     */
    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return _current!.waitStartComponent;
    }
    public static set waitStartComponent(value: Map<Object3D, IComponent[]>) {
        _current!.waitStartComponent = value;
    }

    public static bindUpdate(view: View3D, component: IComponent, call: Function): void {
        _current!.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent): void {
        _current!.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function): void {
        _current!.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent): void {
        _current!.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function): void {
        _current!.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent): void {
        _current!.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function): void {
        _current!.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent): void {
        _current!.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function): void {
        _current!.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent): void {
        _current!.unBindGraphic(view, component);
    }

    public static appendWaitStart(component: IComponent): void {
        _current!.appendWaitStart(component);
    }

    public static removeWaitStart(obj: Object3D, component: IComponent): void {
        _current!.removeWaitStart(obj, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function): void {
        _current!.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent): void {
        _current!.unBindEnablePick(view, component);
    }
}
