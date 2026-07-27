import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";
import { engineRef } from "../../../EngineRef";

/**
 * Per-Engine3D registry for component lifecycle callbacks.
 * Use the static helper methods for backward compatibility; they delegate to the
 * ComponentCollect instance owned by the caller's engine (via view.engine) or,
 * during frame rendering, via the active engine reference.
 * @internal
 */
export class ComponentCollect {

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

    // ---- instance methods ----

    _bindUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    _unBindUpdate(view: View3D, component: IComponent) {
        this.componentsUpdateList.get(view)?.delete(component);
    }

    _bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    _unBindLateUpdate(view: View3D, component: IComponent) {
        this.componentsLateUpdateList.get(view)?.delete(component);
    }

    _bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    _unBindBeforeUpdate(view: View3D, component: IComponent) {
        this.componentsBeforeUpdateList.get(view)?.delete(component);
    }

    _bindCompute(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    _unBindCompute(view: View3D, component: IComponent) {
        this.componentsComputeList.get(view)?.delete(component);
    }

    _bindGraphic(view: View3D, component: IComponent, call: Function) {
        let list = this.graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            this.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    _unBindGraphic(view: View3D, component: IComponent) {
        this.graphicComponent.get(view)?.delete(component);
    }

    _appendWaitStart(component: IComponent) {
        let arr = this.waitStartComponent.get(component.object3D);
        if (!arr) {
            this.waitStartComponent.set(component.object3D, [component]);
        } else {
            if (arr.indexOf(component) === -1) {
                arr.push(component);
            }
        }
    }

    _removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = this.waitStartComponent.get(obj);
        if (arr) {
            let index = arr.indexOf(component);
            if (index !== -1) {
                arr.splice(index, 1);
            }
        }
    }

    _bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        let list = this.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            this.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    _unBindEnablePick(view: View3D, component: ColliderComponent) {
        this.componentsEnablePickerList.get(view)?.delete(component);
    }

    // ---- private helpers for static delegation ----

    /** Resolve the ComponentCollect for a given view, falling back to the active engine. */
    private static _resolve(view?: View3D): ComponentCollect {
        return (view as any)?.engine?.componentCollect ?? engineRef.active?.componentCollect;
    }

    private static _resolveByObj(obj: Object3D): ComponentCollect {
        const scene = obj?.transform?.scene3D;
        return (scene as any)?.view?.engine?.componentCollect ?? engineRef.active?.componentCollect;
    }

    // ---- static backward-compat API (delegates to per-engine instance) ----

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        this._resolve(view)?._bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        this._resolve(view)?._unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        this._resolve(view)?._bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        this._resolve(view)?._unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        this._resolve(view)?._bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        this._resolve(view)?._unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        this._resolve(view)?._bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        this._resolve(view)?._unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        this._resolve(view)?._bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        this._resolve(view)?._unBindGraphic(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        this._resolveByObj(component.object3D)?._appendWaitStart(component);
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        this._resolveByObj(obj)?._removeWaitStart(obj, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        this._resolve(view)?._bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        this._resolve(view)?._unBindEnablePick(view, component);
    }
}
