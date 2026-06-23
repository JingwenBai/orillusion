import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { getCurrentEngine } from "../../../EngineContext";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

export class ComponentCollect {

    // ─── Instance state ────────────────────────────────────────────────────────

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
        if (list) list.delete(component);
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
        if (list) list.delete(component);
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
        if (list) list.delete(component);
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
        if (list) list.delete(component);
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
        if (list) list.delete(component);
    }

    public appendWaitStart(component: IComponent) {
        let arr = this.waitStartComponent.get(component.object3D);
        if (!arr) {
            this.waitStartComponent.set(component.object3D, [component]);
        } else {
            let index = arr.indexOf(component);
            if (index == -1) arr.push(component);
        }
    }

    public removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = this.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index != -1) arr.splice(index);
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
        if (list) list.delete(component);
    }

    // ─── Static backward-compat delegation ─────────────────────────────────────

    private static get _instance(): ComponentCollect {
        return getCurrentEngine()?.componentCollect;
    }

    /** @internal */
    public static get componentsUpdateList() {
        return this._instance?.componentsUpdateList;
    }

    /** @internal */
    public static get componentsLateUpdateList() {
        return this._instance?.componentsLateUpdateList;
    }

    /** @internal */
    public static get componentsBeforeUpdateList() {
        return this._instance?.componentsBeforeUpdateList;
    }

    /** @internal */
    public static get componentsComputeList() {
        return this._instance?.componentsComputeList;
    }

    /** @internal */
    public static get componentsEnablePickerList() {
        return this._instance?.componentsEnablePickerList;
    }

    /** @internal */
    public static get graphicComponent() {
        return this._instance?.graphicComponent;
    }

    /** @internal */
    public static get waitStartComponent() {
        return this._instance?.waitStartComponent;
    }

    /** @internal */
    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        this._instance?.bindUpdate(view, component, call);
    }

    /** @internal */
    public static unBindUpdate(view: View3D, component: IComponent) {
        this._instance?.unBindUpdate(view, component);
    }

    /** @internal */
    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        this._instance?.bindLateUpdate(view, component, call);
    }

    /** @internal */
    public static unBindLateUpdate(view: View3D, component: IComponent) {
        this._instance?.unBindLateUpdate(view, component);
    }

    /** @internal */
    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        this._instance?.bindBeforeUpdate(view, component, call);
    }

    /** @internal */
    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        this._instance?.unBindBeforeUpdate(view, component);
    }

    /** @internal */
    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        this._instance?.bindCompute(view, component, call);
    }

    /** @internal */
    public static unBindCompute(view: View3D, component: IComponent) {
        this._instance?.unBindCompute(view, component);
    }

    /** @internal */
    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        this._instance?.bindGraphic(view, component, call);
    }

    /** @internal */
    public static unBindGraphic(view: View3D, component: IComponent) {
        this._instance?.unBindGraphic(view, component);
    }

    /** @internal */
    public static appendWaitStart(component: IComponent) {
        this._instance?.appendWaitStart(component);
    }

    /** @internal */
    public static removeWaitStart(obj: Object3D, component: IComponent) {
        this._instance?.removeWaitStart(obj, component);
    }

    /** @internal */
    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        this._instance?.bindEnablePick(view, component, call);
    }

    /** @internal */
    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        this._instance?.unBindEnablePick(view, component);
    }
}
