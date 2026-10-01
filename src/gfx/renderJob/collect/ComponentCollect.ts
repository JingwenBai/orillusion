import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";
import { EngineContext } from "../../../core/EngineContext";

/**
 * @internal
 * Per-engine-instance component lifecycle registry.
 *
 * The static methods are backward-compatible proxy facades: they route to the
 * correct per-engine `ComponentCollect` instance via `view.engineContext`
 * (primary) or `EngineContext.getCurrent()` (fallback for callers that do
 * not have a `View3D` reference at hand).
 *
 * The global `waitStartComponent` queue (pending `__start()` calls) stays
 * static so that `Object3D.addComponent` can enqueue without engine context,
 * but `Entity.waitUpdate()` now filters entries by scene to avoid cross-engine
 * contamination.
 */
export class ComponentCollect {

    // ------------------------------------------------------------------ //
    //  STATIC global pending-start queue (one process-wide queue is fine; //
    //  filtering in Entity.waitUpdate keeps it per-scene/per-engine).     //
    // ------------------------------------------------------------------ //

    /**
     * @internal
     * Components queued for `__start()` — populated by `Object3D.addComponent`.
     */
    public static waitStartComponent: Map<Object3D, IComponent[]> = new Map();

    public static appendWaitStart(component: IComponent) {
        let arr = ComponentCollect.waitStartComponent.get(component.object3D);
        if (!arr) {
            ComponentCollect.waitStartComponent.set(component.object3D, [component]);
        } else {
            if (arr.indexOf(component) === -1) arr.push(component);
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = ComponentCollect.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index !== -1) arr.splice(index, 1);
        }
    }

    // ------------------------------------------------------------------ //
    //  STATIC PROXY methods (backward compat — route to the right         //
    //  per-engine ComponentCollect instance via view.engineContext).      //
    // ------------------------------------------------------------------ //

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        _resolve(view)?.bindUpdate(view, component, call);
    }
    public static unBindUpdate(view: View3D, component: IComponent) {
        _resolve(view)?.unBindUpdate(view, component);
    }
    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        _resolve(view)?.bindLateUpdate(view, component, call);
    }
    public static unBindLateUpdate(view: View3D, component: IComponent) {
        _resolve(view)?.unBindLateUpdate(view, component);
    }
    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        _resolve(view)?.bindBeforeUpdate(view, component, call);
    }
    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        _resolve(view)?.unBindBeforeUpdate(view, component);
    }
    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        _resolve(view)?.bindCompute(view, component, call);
    }
    public static unBindCompute(view: View3D, component: IComponent) {
        _resolve(view)?.unBindCompute(view, component);
    }
    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        _resolve(view)?.bindGraphic(view, component, call);
    }
    public static unBindGraphic(view: View3D, component: IComponent) {
        _resolve(view)?.unBindGraphic(view, component);
    }
    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        _resolve(view)?.bindEnablePick(view, component, call);
    }
    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        _resolve(view)?.unBindEnablePick(view, component);
    }

    // ------------------------------------------------------------------ //
    //  INSTANCE DATA (per-engine-instance)                                //
    // ------------------------------------------------------------------ //

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

    private _init: boolean = false;

    private _initMaps() {
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

    // ------------------------------------------------------------------ //
    //  INSTANCE METHODS                                                   //
    // ------------------------------------------------------------------ //

    public bindUpdate(view: View3D, component: IComponent, call: Function) {
        this._initMaps();
        let list = this.componentsUpdateList.get(view);
        if (!list) {
            list = new Map();
            this.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindUpdate(view: View3D, component: IComponent) {
        this._initMaps();
        this.componentsUpdateList.get(view)?.delete(component);
    }

    public bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        this._initMaps();
        let list = this.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map();
            this.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindLateUpdate(view: View3D, component: IComponent) {
        this._initMaps();
        this.componentsLateUpdateList.get(view)?.delete(component);
    }

    public bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        this._initMaps();
        let list = this.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map();
            this.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindBeforeUpdate(view: View3D, component: IComponent) {
        this._initMaps();
        this.componentsBeforeUpdateList.get(view)?.delete(component);
    }

    public bindCompute(view: View3D, component: IComponent, call: Function) {
        this._initMaps();
        let list = this.componentsComputeList.get(view);
        if (!list) {
            list = new Map();
            this.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindCompute(view: View3D, component: IComponent) {
        this._initMaps();
        this.componentsComputeList.get(view)?.delete(component);
    }

    public bindGraphic(view: View3D, component: IComponent, call: Function) {
        this._initMaps();
        let list = this.graphicComponent.get(view);
        if (!list) {
            list = new Map();
            this.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public unBindGraphic(view: View3D, component: IComponent) {
        this._initMaps();
        this.graphicComponent.get(view)?.delete(component);
    }

    public bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        this._initMaps();
        let list = this.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            this.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public unBindEnablePick(view: View3D, component: ColliderComponent) {
        this._initMaps();
        this.componentsEnablePickerList.get(view)?.delete(component);
    }
}

/** Route static proxy calls to the right per-engine ComponentCollect instance. */
function _resolve(view: View3D): ComponentCollect | null {
    return (view as any)?.engineContext?.componentCollect
        ?? EngineContext.getCurrent()?.componentCollect
        ?? null;
}
