import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";
import { ActiveEngineContext } from "../../../EngineContext";

export class ComponentCollect {

    // ---- Instance state ----

    public componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();
    public graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();
    public waitStartComponent: Map<Object3D, IComponent[]> = new Map();

    // ---- Instance methods ----

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
            if (arr.indexOf(component) === -1) arr.push(component);
        }
    }

    public removeWaitStart(obj: Object3D, component: IComponent) {
        const arr = this.waitStartComponent.get(obj);
        if (arr) {
            const idx = arr.indexOf(component);
            if (idx !== -1) arr.splice(idx, 1);
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

    // ---- Static backward-compat API ----
    // Routes to the view's engine's collect, falling back to the active engine context.

    private static _resolve(view?: View3D): ComponentCollect {
        const engine = (view as any)?.engine;
        if (engine?.componentCollect instanceof ComponentCollect) return engine.componentCollect;
        if (ActiveEngineContext.componentCollect instanceof ComponentCollect) return ActiveEngineContext.componentCollect;
        if (!ComponentCollect._default) ComponentCollect._default = new ComponentCollect();
        return ComponentCollect._default;
    }

    /** @internal */
    private static _default: ComponentCollect;

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        this._resolve(view).bindUpdate(view, component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        this._resolve(view).unBindUpdate(view, component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        this._resolve(view).bindLateUpdate(view, component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        this._resolve(view).unBindLateUpdate(view, component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        this._resolve(view).bindBeforeUpdate(view, component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        this._resolve(view).unBindBeforeUpdate(view, component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        this._resolve(view).bindCompute(view, component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        this._resolve(view).unBindCompute(view, component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        this._resolve(view).bindGraphic(view, component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        this._resolve(view).unBindGraphic(view, component);
    }

    public static appendWaitStart(component: IComponent) {
        this._resolve().appendWaitStart(component);
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        this._resolve().removeWaitStart(obj, component);
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        this._resolve(view).bindEnablePick(view, component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        this._resolve(view).unBindEnablePick(view, component);
    }

    // ---- Static property accessors for backward compat ----
    // These expose the ACTIVE engine's lists (used by Engine3D.updateFrame and similar).

    /** @internal */
    public static get componentsUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return this._resolve().componentsUpdateList;
    }

    /** @internal */
    public static get componentsLateUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return this._resolve().componentsLateUpdateList;
    }

    /** @internal */
    public static get componentsBeforeUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return this._resolve().componentsBeforeUpdateList;
    }

    /** @internal */
    public static get componentsComputeList(): Map<View3D, Map<IComponent, Function>> {
        return this._resolve().componentsComputeList;
    }

    /** @internal */
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return this._resolve().componentsEnablePickerList;
    }

    /** @internal */
    public static get graphicComponent(): Map<View3D, Map<IComponent, Function>> {
        return this._resolve().graphicComponent;
    }

    /** @internal */
    public static get waitStartComponent(): Map<Object3D, IComponent[]> {
        return this._resolve().waitStartComponent;
    }
}
