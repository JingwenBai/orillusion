import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";
import { getCurrentEngine } from "../../EngineContext";

/**
 * Global pending-start queue.  Shared across all engine instances because
 * addComponent() can be called before an object is attached to any scene/view.
 * @internal
 */
const _globalWaitStart: Map<Object3D, IComponent[]> = new Map();

/**
 * Per-engine-instance component lifecycle registry.
 * @internal
 */
export class ComponentCollect {

    // ------------------------------------------------------------------ //
    // Global (static) pending-start queue — shared, order-only, no engine tie
    // ------------------------------------------------------------------ //

    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return _globalWaitStart;
    }

    public static appendWaitStart(component: IComponent): void {
        let arr = _globalWaitStart.get(component.object3D);
        if (!arr) {
            _globalWaitStart.set(component.object3D, [component]);
        } else {
            if (arr.indexOf(component) === -1) {
                arr.push(component);
            }
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent): void {
        const arr = _globalWaitStart.get(obj);
        if (arr) {
            const index = arr.indexOf(component);
            if (index !== -1) {
                arr.splice(index, 1);
            }
        }
    }

    // ------------------------------------------------------------------ //
    // Static proxy methods — forward to the current engine's instance
    // ------------------------------------------------------------------ //

    public static get componentsUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return getCurrentEngine()?.componentCollect?.componentsUpdateList ?? _empty;
    }
    public static get componentsLateUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return getCurrentEngine()?.componentCollect?.componentsLateUpdateList ?? _empty;
    }
    public static get componentsBeforeUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return getCurrentEngine()?.componentCollect?.componentsBeforeUpdateList ?? _empty;
    }
    public static get componentsComputeList(): Map<View3D, Map<IComponent, Function>> {
        return getCurrentEngine()?.componentCollect?.componentsComputeList ?? _empty;
    }
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return getCurrentEngine()?.componentCollect?.componentsEnablePickerList ?? _empty;
    }
    public static get graphicComponent(): Map<View3D, Map<IComponent, Function>> {
        return getCurrentEngine()?.componentCollect?.graphicComponent ?? _empty;
    }

    public static bindUpdate(view: View3D, component: IComponent, call: Function): void {
        getCurrentEngine()?.componentCollect?.bindUpdate(view, component, call);
    }
    public static unBindUpdate(view: View3D, component: IComponent): void {
        getCurrentEngine()?.componentCollect?.unBindUpdate(view, component);
    }
    public static bindLateUpdate(view: View3D, component: IComponent, call: Function): void {
        getCurrentEngine()?.componentCollect?.bindLateUpdate(view, component, call);
    }
    public static unBindLateUpdate(view: View3D, component: IComponent): void {
        getCurrentEngine()?.componentCollect?.unBindLateUpdate(view, component);
    }
    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function): void {
        getCurrentEngine()?.componentCollect?.bindBeforeUpdate(view, component, call);
    }
    public static unBindBeforeUpdate(view: View3D, component: IComponent): void {
        getCurrentEngine()?.componentCollect?.unBindBeforeUpdate(view, component);
    }
    public static bindCompute(view: View3D, component: IComponent, call: Function): void {
        getCurrentEngine()?.componentCollect?.bindCompute(view, component, call);
    }
    public static unBindCompute(view: View3D, component: IComponent): void {
        getCurrentEngine()?.componentCollect?.unBindCompute(view, component);
    }
    public static bindGraphic(view: View3D, component: IComponent, call: Function): void {
        getCurrentEngine()?.componentCollect?.bindGraphic(view, component, call);
    }
    public static unBindGraphic(view: View3D, component: IComponent): void {
        getCurrentEngine()?.componentCollect?.unBindGraphic(view, component);
    }
    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function): void {
        getCurrentEngine()?.componentCollect?.bindEnablePick(view, component, call);
    }
    public static unBindEnablePick(view: View3D, component: ColliderComponent): void {
        getCurrentEngine()?.componentCollect?.unBindEnablePick(view, component);
    }

    // ------------------------------------------------------------------ //
    // Instance (per-engine) data
    // ------------------------------------------------------------------ //

    public componentsUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>>;
    public componentsComputeList: Map<View3D, Map<IComponent, Function>>;
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>>;
    public graphicComponent: Map<View3D, Map<IComponent, Function>>;

    constructor() {
        this.componentsUpdateList = new Map();
        this.componentsLateUpdateList = new Map();
        this.componentsBeforeUpdateList = new Map();
        this.componentsComputeList = new Map();
        this.componentsEnablePickerList = new Map();
        this.graphicComponent = new Map();
    }

    public bindUpdate(view: View3D, component: IComponent, call: Function): void {
        let list = this.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindUpdate(view: View3D, component: IComponent): void {
        this.componentsUpdateList.get(view)?.delete(component);
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
        this.componentsLateUpdateList.get(view)?.delete(component);
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
        this.componentsBeforeUpdateList.get(view)?.delete(component);
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
        this.componentsComputeList.get(view)?.delete(component);
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
        this.graphicComponent.get(view)?.delete(component);
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
        this.componentsEnablePickerList.get(view)?.delete(component);
    }
}

const _empty: any = new Map();
