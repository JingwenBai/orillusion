import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/**
 * Manages component lifecycle callbacks (update, lateUpdate, etc.) for a
 * single Engine3D instance.
 *
 * Architecture note
 * -----------------
 * Each Engine3D creates its own ComponentCollect instance so that multiple
 * engine instances on the same page are fully isolated from each other.
 *
 * For backward compatibility the class also exposes a set of **static**
 * methods that mirror the instance API.  These static helpers look up the
 * ComponentCollect that owns the supplied View3D via an internal registry
 * populated by Engine3D.startRenderView / startRenderViews, and then
 * delegate to the matching instance.  Existing component code that calls
 * `ComponentCollect.bindUpdate(view, …)` therefore continues to work without
 * modification.
 *
 * The global `waitStartComponent` queue is intentionally left as a static
 * property because components can be added to an Object3D before it is
 * attached to any scene/engine.  Entity.waitUpdate() filters the queue so
 * that each engine only starts components belonging to its own scenes.
 *
 * @internal
 */
export class ComponentCollect {

    // ------------------------------------------------------------------
    // Static registry  –  View3D → ComponentCollect (per-engine instance)
    // ------------------------------------------------------------------

    private static _viewToCollect = new Map<View3D, ComponentCollect>();

    /**
     * Register a View3D with its owning engine's ComponentCollect.
     * Called by Engine3D when a view is assigned.
     * @internal
     */
    public static registerView(view: View3D, collect: ComponentCollect): void {
        this._viewToCollect.set(view, collect);
    }

    /**
     * Remove a View3D from the registry (e.g. when an engine is destroyed).
     * @internal
     */
    public static unregisterView(view: View3D): void {
        this._viewToCollect.delete(view);
    }

    // ------------------------------------------------------------------
    // Global waiting-to-start queue  (keyed by Object3D, not View3D)
    // ------------------------------------------------------------------

    /**
     * Components queued to call __start() on the next scene update.
     * Kept global because an Object3D may not yet belong to any scene/engine
     * when addComponent() is called.
     * @internal
     */
    public static waitStartComponent: Map<Object3D, IComponent[]> = new Map<Object3D, IComponent[]>();

    public static appendWaitStart(component: IComponent): void {
        let arr = this.waitStartComponent.get(component.object3D);
        if (!arr) {
            this.waitStartComponent.set(component.object3D, [component]);
        } else {
            const index = arr.indexOf(component);
            if (index === -1) {
                arr.push(component);
            }
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent): void {
        const arr = ComponentCollect.waitStartComponent.get(obj);
        if (arr) {
            const index = arr.indexOf(component);
            if (index !== -1) {
                arr.splice(index, 1);
            }
        }
    }

    // ------------------------------------------------------------------
    // Static bridge methods – delegate to the per-engine instance
    // ------------------------------------------------------------------

    public static bindUpdate(view: View3D, component: IComponent, call: Function): void {
        this._viewToCollect.get(view)?.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent): void {
        this._viewToCollect.get(view)?.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function): void {
        this._viewToCollect.get(view)?.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent): void {
        this._viewToCollect.get(view)?.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function): void {
        this._viewToCollect.get(view)?.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent): void {
        this._viewToCollect.get(view)?.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function): void {
        this._viewToCollect.get(view)?.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent): void {
        this._viewToCollect.get(view)?.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function): void {
        this._viewToCollect.get(view)?.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent): void {
        this._viewToCollect.get(view)?.unBindGraphic(view, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function): void {
        this._viewToCollect.get(view)?.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent): void {
        this._viewToCollect.get(view)?.unBindEnablePick(view, component);
    }

    /**
     * Return the collider picker map for a specific View3D.
     * Used by PickFire to iterate colliders during raycasting.
     * @internal
     */
    public static getPickerListForView(view: View3D): Map<ColliderComponent, Function> | undefined {
        return this._viewToCollect.get(view)?.componentsEnablePickerList.get(view);
    }

    // ------------------------------------------------------------------
    // Instance data  –  per-engine lifecycle maps
    // ------------------------------------------------------------------

    /** @internal */
    public componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    /** @internal */
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    /** @internal */
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    /** @internal */
    public componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();
    /** @internal */
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();
    /** @internal */
    public graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();

    // ------------------------------------------------------------------
    // Instance methods
    // ------------------------------------------------------------------

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
