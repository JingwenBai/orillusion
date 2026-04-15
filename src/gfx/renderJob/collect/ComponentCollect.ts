import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

export class ComponentCollect {

    // ─── Instance state ──────────────────────────────────────────────────────

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
     * Components pending their first start() call (keyed by Object3D, shared globally).
     */
    public static waitStartComponent: Map<Object3D, IComponent[]> = new Map();

    private _init: boolean = false;

    private _initIfNeeded() {
        if (!this._init) {
            this._init = true;
            this.componentsUpdateList = new Map();
            this.componentsLateUpdateList = new Map();
            this.componentsBeforeUpdateList = new Map();
            this.componentsComputeList = new Map();
            this.componentsEnablePickerList = new Map();
            this.graphicComponent = new Map();
        }
    }

    public bindUpdate(view: View3D, component: IComponent, call: Function) {
        this._initIfNeeded();
        let list = this.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindUpdate(view: View3D, component: IComponent) {
        this._initIfNeeded();
        let list = this.componentsUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        this._initIfNeeded();
        let list = this.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindLateUpdate(view: View3D, component: IComponent) {
        this._initIfNeeded();
        let list = this.componentsLateUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        this._initIfNeeded();
        let list = this.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindBeforeUpdate(view: View3D, component: IComponent) {
        this._initIfNeeded();
        let list = this.componentsBeforeUpdateList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindCompute(view: View3D, component: IComponent, call: Function) {
        this._initIfNeeded();
        let list = this.componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindCompute(view: View3D, component: IComponent) {
        this._initIfNeeded();
        let list = this.componentsComputeList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindGraphic(view: View3D, component: IComponent, call: Function) {
        this._initIfNeeded();
        let list = this.graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public unBindGraphic(view: View3D, component: IComponent) {
        this._initIfNeeded();
        let list = this.graphicComponent.get(view);
        if (list) {
            list.delete(component);
        }
    }

    public bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        this._initIfNeeded();
        let list = this.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            this.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindEnablePick(view: View3D, component: ColliderComponent) {
        this._initIfNeeded();
        let list = this.componentsEnablePickerList.get(view);
        if (list) {
            list.delete(component);
        }
    }

    // ─── Active-instance pattern ──────────────────────────────────────────────
    // All existing call-sites (ComponentBase, render passes, etc.) use the
    // static API unchanged.  Engine3D.activateContext() swaps the active
    // instance before every frame, giving each engine its own state.

    /** @internal */
    private static _active: ComponentCollect;

    /** @internal Called by Engine3D to activate this engine's instance */
    public static setActive(instance: ComponentCollect): void {
        this._active = instance;
    }

    // ── Static property proxies ──────────────────────────────────────────────
    public static get componentsUpdateList() { return this._active?.componentsUpdateList; }
    public static get componentsLateUpdateList() { return this._active?.componentsLateUpdateList; }
    public static get componentsBeforeUpdateList() { return this._active?.componentsBeforeUpdateList; }
    public static get componentsComputeList() { return this._active?.componentsComputeList; }
    public static get componentsEnablePickerList() { return this._active?.componentsEnablePickerList; }
    public static get graphicComponent() { return this._active?.graphicComponent; }

    // ── Static method proxies ────────────────────────────────────────────────
    public static bindUpdate(view: View3D, component: IComponent, call: Function) { this._active?.bindUpdate(view, component, call); }
    public static unBindUpdate(view: View3D, component: IComponent) { this._active?.unBindUpdate(view, component); }
    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) { this._active?.bindLateUpdate(view, component, call); }
    public static unBindLateUpdate(view: View3D, component: IComponent) { this._active?.unBindLateUpdate(view, component); }
    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) { this._active?.bindBeforeUpdate(view, component, call); }
    public static unBindBeforeUpdate(view: View3D, component: IComponent) { this._active?.unBindBeforeUpdate(view, component); }
    public static bindCompute(view: View3D, component: IComponent, call: Function) { this._active?.bindCompute(view, component, call); }
    public static unBindCompute(view: View3D, component: IComponent) { this._active?.unBindCompute(view, component); }
    public static bindGraphic(view: View3D, component: IComponent, call: Function) { this._active?.bindGraphic(view, component, call); }
    public static unBindGraphic(view: View3D, component: IComponent) { this._active?.unBindGraphic(view, component); }
    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) { this._active?.bindEnablePick(view, component, call); }
    public static unBindEnablePick(view: View3D, component: ColliderComponent) { this._active?.unBindEnablePick(view, component); }

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
}
