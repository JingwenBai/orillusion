import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/**
 * Per-engine-instance component update list manager.
 * Instance methods hold per-engine state; static methods are backward-compat shims.
 * @internal
 */
export class ComponentCollect {

    // --- Instance state ---

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
        this.componentsUpdateList = new Map();
        this.componentsLateUpdateList = new Map();
        this.componentsBeforeUpdateList = new Map();
        this.componentsComputeList = new Map();
        this.componentsEnablePickerList = new Map();
        this.graphicComponent = new Map();
        this.waitStartComponent = new Map();
    }

    // --- Instance methods ---

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

    public appendWaitStart(component: IComponent): void {
        let arr = this.waitStartComponent.get(component.object3D);
        if (!arr) {
            this.waitStartComponent.set(component.object3D, [component]);
        } else {
            if (arr.indexOf(component) === -1) {
                arr.push(component);
            }
        }
    }

    public removeWaitStart(obj: Object3D, component: IComponent): void {
        const arr = this.waitStartComponent.get(obj);
        if (arr) {
            const index = arr.indexOf(component);
            if (index !== -1) arr.splice(index, 1);
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
        this.componentsEnablePickerList.get(view)?.delete(component);
    }

    // --- Static backward-compat shims ---
    // These delegate to the currently active Engine3D instance's componentCollect.
    // They are resolved lazily via Engine3D.current to avoid a circular import.

    private static _getInstance(): ComponentCollect | null {
        const Engine3D = (globalThis as any).__Engine3D__;
        return Engine3D?.current?.componentCollect ?? null;
    }

    // Static property getters for maps accessed directly by external code
    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return ComponentCollect._getInstance()?.waitStartComponent;
    }

    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return ComponentCollect._getInstance()?.componentsEnablePickerList;
    }

    public static bindUpdate(view: View3D, component: IComponent, call: Function): void {
        const instance = view?.engine?.componentCollect ?? ComponentCollect._getInstance();
        instance?.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent): void {
        const instance = view?.engine?.componentCollect ?? ComponentCollect._getInstance();
        instance?.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function): void {
        const instance = view?.engine?.componentCollect ?? ComponentCollect._getInstance();
        instance?.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent): void {
        const instance = view?.engine?.componentCollect ?? ComponentCollect._getInstance();
        instance?.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function): void {
        const instance = view?.engine?.componentCollect ?? ComponentCollect._getInstance();
        instance?.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent): void {
        const instance = view?.engine?.componentCollect ?? ComponentCollect._getInstance();
        instance?.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function): void {
        const instance = view?.engine?.componentCollect ?? ComponentCollect._getInstance();
        instance?.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent): void {
        const instance = view?.engine?.componentCollect ?? ComponentCollect._getInstance();
        instance?.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function): void {
        const instance = view?.engine?.componentCollect ?? ComponentCollect._getInstance();
        instance?.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent): void {
        const instance = view?.engine?.componentCollect ?? ComponentCollect._getInstance();
        instance?.unBindGraphic(view, component);
    }

    public static appendWaitStart(component: IComponent): void {
        ComponentCollect._getInstance()?.appendWaitStart(component);
    }

    public static removeWaitStart(obj: Object3D, component: IComponent): void {
        ComponentCollect._getInstance()?.removeWaitStart(obj, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function): void {
        const instance = view?.engine?.componentCollect ?? ComponentCollect._getInstance();
        instance?.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent): void {
        const instance = view?.engine?.componentCollect ?? ComponentCollect._getInstance();
        instance?.unBindEnablePick(view, component);
    }
}
