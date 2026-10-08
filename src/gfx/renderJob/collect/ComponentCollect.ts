import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

export class ComponentCollect {

    // ---- per-engine instance maps ----
    private _componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    private _componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    private _componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    private _componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();
    private _componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();
    private _graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();

    // ---- static "current engine" maps (reassigned by activate()) ----
    /**
     * @internal
     */
    public static componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();

    /**
     * @internal
     */
    public static componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();

    /**
     * @internal
     */
    public static componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();

    /**
     * @internal
     */
    public static componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();

    /**
     * @internal
     */
    public static componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();

    /**
     * @internal
     */
    public static graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();

    // ---- global pending queue (not per-engine, shared across all engines) ----
    /**
     * @internal
     */
    public static waitStartComponent: Map<Object3D, IComponent[]> = new Map();

    // ---- active instance ----
    /** @internal */
    private static _current: ComponentCollect | null = null;

    /**
     * Activate an instance as the current engine context.
     * All static map references are updated to point to the instance's maps.
     * @internal
     */
    public static activate(instance: ComponentCollect): void {
        this._current = instance;
        this.componentsUpdateList = instance._componentsUpdateList;
        this.componentsLateUpdateList = instance._componentsLateUpdateList;
        this.componentsBeforeUpdateList = instance._componentsBeforeUpdateList;
        this.componentsComputeList = instance._componentsComputeList;
        this.componentsEnablePickerList = instance._componentsEnablePickerList;
        this.graphicComponent = instance._graphicComponent;
    }

    /**
     * Get the active ComponentCollect instance, preferring the engine associated
     * with a view (for correct routing when called outside the render frame).
     * @internal
     */
    public static getActiveCollect(view?: View3D): ComponentCollect | null {
        return (view as any)?.engine?.componentCollect as ComponentCollect ?? this._current ?? null;
    }

    // ---- static delegation methods ----

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        const instance = this.getActiveCollect(view);
        instance?.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        const instance = this.getActiveCollect(view);
        instance?.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        const instance = this.getActiveCollect(view);
        instance?.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        const instance = this.getActiveCollect(view);
        instance?.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        const instance = this.getActiveCollect(view);
        instance?.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        const instance = this.getActiveCollect(view);
        instance?.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        const instance = this.getActiveCollect(view);
        instance?.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        const instance = this.getActiveCollect(view);
        instance?.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        const instance = this.getActiveCollect(view);
        instance?.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        const instance = this.getActiveCollect(view);
        instance?.unBindGraphic(view, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        const instance = this.getActiveCollect(view);
        instance?.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        const instance = this.getActiveCollect(view);
        instance?.unBindEnablePick(view, component);
    }

    // ---- global pending queue static methods (always use the global map) ----

    public static appendWaitStart(component: IComponent) {
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

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = ComponentCollect.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index != -1) {
                arr.splice(index);
            }
        }
    }

    // ---- instance methods ----

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
