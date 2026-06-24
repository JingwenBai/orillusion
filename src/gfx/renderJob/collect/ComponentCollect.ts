import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";
import { EngineContext } from "../../../core/EngineContext";

/**
 * Per-engine component collection state.
 * An instance of this class is stored on each Engine3D and accessed via View3D.engine.
 * @internal
 */
export class ComponentCollectInstance {
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

    bindUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsUpdateList.get(view);
        if (!list) { list = new Map(); this.componentsUpdateList.set(view, list); }
        list.set(component, call);
    }

    unBindUpdate(view: View3D, component: IComponent) {
        this.componentsUpdateList.get(view)?.delete(component);
    }

    bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsLateUpdateList.get(view);
        if (!list) { list = new Map(); this.componentsLateUpdateList.set(view, list); }
        list.set(component, call);
    }

    unBindLateUpdate(view: View3D, component: IComponent) {
        this.componentsLateUpdateList.get(view)?.delete(component);
    }

    bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsBeforeUpdateList.get(view);
        if (!list) { list = new Map(); this.componentsBeforeUpdateList.set(view, list); }
        list.set(component, call);
    }

    unBindBeforeUpdate(view: View3D, component: IComponent) {
        this.componentsBeforeUpdateList.get(view)?.delete(component);
    }

    bindCompute(view: View3D, component: IComponent, call: Function) {
        let list = this.componentsComputeList.get(view);
        if (!list) { list = new Map(); this.componentsComputeList.set(view, list); }
        list.set(component, call);
    }

    unBindCompute(view: View3D, component: IComponent) {
        this.componentsComputeList.get(view)?.delete(component);
    }

    bindGraphic(view: View3D, component: IComponent, call: Function) {
        let list = this.graphicComponent.get(view);
        if (!list) { list = new Map(); this.graphicComponent.set(view, list); }
        list.set(component, call);
    }

    unBindGraphic(view: View3D, component: IComponent) {
        this.graphicComponent.get(view)?.delete(component);
    }

    bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        let list = this.componentsEnablePickerList.get(view);
        if (!list) { list = new Map(); this.componentsEnablePickerList.set(view, list); }
        list.set(component, call);
    }

    unBindEnablePick(view: View3D, component: ColliderComponent) {
        this.componentsEnablePickerList.get(view)?.delete(component);
    }
}

/**
 * Global component start queue (shared across engines — processed per-scene each frame).
 * @internal
 */
const _waitStartComponent: Map<Object3D, IComponent[]> = new Map();

/**
 * Static API for component lifecycle registration.
 * Methods route to the owning engine's ComponentCollectInstance via view.engine,
 * falling back to EngineContext.current when no view is available.
 * @internal
 */
export class ComponentCollect {

    /** Global queue of components waiting to call start(). Shared across engines. */
    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return _waitStartComponent;
    }

    private static _resolveInstance(view: View3D): ComponentCollectInstance | null {
        const engine = view?.engine ?? EngineContext.current;
        return engine?._componentCollect ?? null;
    }

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        this._resolveInstance(view)?.bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        this._resolveInstance(view)?.unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        this._resolveInstance(view)?.bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        this._resolveInstance(view)?.unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        this._resolveInstance(view)?.bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        this._resolveInstance(view)?.unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        this._resolveInstance(view)?.bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        this._resolveInstance(view)?.unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        this._resolveInstance(view)?.bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        this._resolveInstance(view)?.unBindGraphic(view, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        this._resolveInstance(view)?.bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        this._resolveInstance(view)?.unBindEnablePick(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        let arr = _waitStartComponent.get(component.object3D);
        if (!arr) {
            _waitStartComponent.set(component.object3D, [component]);
        } else {
            if (arr.indexOf(component) === -1) {
                arr.push(component);
            }
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        let arr = _waitStartComponent.get(obj);
        if (arr) {
            const index = arr.indexOf(component);
            if (index !== -1) arr.splice(index, 1);
        }
    }
}
