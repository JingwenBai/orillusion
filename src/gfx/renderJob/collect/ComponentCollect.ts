import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/** Active per-engine instance; set by Engine3D before each frame. */
let _active: ComponentCollect | null = null;

/**
 * Activate a specific ComponentCollect as the current one.
 * Engine3D calls this before rendering a frame.
 * @internal
 */
export function activateComponentCollect(cc: ComponentCollect): void {
    _active = cc;
}

export class ComponentCollect {

    // ------------------------------------------------------------------ //
    //  Instance state — one set per Engine3D instance                     //
    // ------------------------------------------------------------------ //

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

    // ------------------------------------------------------------------ //
    //  Instance methods                                                    //
    // ------------------------------------------------------------------ //

    public bindUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindUpdate(view: View3D, component: IComponent) {
        this.componentsUpdateList.get(view)?.delete(component);
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
        this.componentsLateUpdateList.get(view)?.delete(component);
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
        this.componentsBeforeUpdateList.get(view)?.delete(component);
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
        this.componentsComputeList.get(view)?.delete(component);
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
        this.graphicComponent.get(view)?.delete(component);
    }

    public appendWaitStart(component: IComponent) {
        let arr = this.waitStartComponent.get(component.object3D);
        if (!arr) {
            this.waitStartComponent.set(component.object3D, [component]);
        } else {
            if (arr.indexOf(component) === -1) {
                arr.push(component);
            }
        }
    }

    public removeWaitStart(obj: Object3D, component: IComponent) {
        const arr = this.waitStartComponent.get(obj);
        if (arr) {
            const index = arr.indexOf(component);
            if (index !== -1) arr.splice(index, 1);
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
        this.componentsEnablePickerList.get(view)?.delete(component);
    }

    // ------------------------------------------------------------------ //
    //  Static delegates — forward to the currently active instance        //
    //  All existing call sites continue to work without changes.          //
    // ------------------------------------------------------------------ //

    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return _active!.waitStartComponent;
    }

    public static get componentsUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return _active!.componentsUpdateList;
    }

    public static get componentsLateUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return _active!.componentsLateUpdateList;
    }

    public static get componentsBeforeUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return _active!.componentsBeforeUpdateList;
    }

    public static get componentsComputeList(): Map<View3D, Map<IComponent, Function>> {
        return _active!.componentsComputeList;
    }

    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return _active!.componentsEnablePickerList;
    }

    public static get graphicComponent(): Map<View3D, Map<IComponent, Function>> {
        return _active!.graphicComponent;
    }

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        _active?.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        _active?.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        _active?.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        _active?.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        _active?.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        _active?.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        _active?.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        _active?.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        _active?.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        _active?.unBindGraphic(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        _active?.appendWaitStart(component);
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        _active?.removeWaitStart(obj, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        _active?.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        _active?.unBindEnablePick(view, component);
    }
}
