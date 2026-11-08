import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";
import { getCurrentEngine } from "../../../util/EngineHolder";

export class ComponentCollect {

    // ─── per-instance maps ────────────────────────────────────────────────────

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

    constructor() {
        this.componentsUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsLateUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsBeforeUpdateList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsComputeList = new Map<View3D, Map<IComponent, Function>>();
        this.componentsEnablePickerList = new Map<View3D, Map<ColliderComponent, Function>>();
        this.graphicComponent = new Map<View3D, Map<IComponent, Function>>();
    }

    // ─── global (pre-engine) wait-start queue ────────────────────────────────

    /**
     * @internal
     * Components queued to start before they have been assigned to a view/engine.
     * Intentionally global so Object3D.addComponent() can queue components even
     * before Engine3D.init() is called.
     */
    public static readonly waitStartComponent: Map<Object3D, IComponent[]> = new Map<Object3D, IComponent[]>();

    // ─── static facade helpers ───────────────────────────────────────────────

    private static get _current(): ComponentCollect {
        const engine = getCurrentEngine();
        return engine?.componentCollect ?? ComponentCollect._global;
    }

    /** Fallback instance used when no engine is set as current. */
    private static readonly _global: ComponentCollect = new ComponentCollect();

    // ─── static property accessors (backward-compatible) ─────────────────────

    /** @internal Access the current engine's update list directly (read-only iteration). */
    public static get componentsUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._current.componentsUpdateList;
    }
    public static get componentsLateUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._current.componentsLateUpdateList;
    }
    public static get componentsBeforeUpdateList(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._current.componentsBeforeUpdateList;
    }
    public static get componentsComputeList(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._current.componentsComputeList;
    }
    public static get componentsEnablePickerList(): Map<View3D, Map<ColliderComponent, Function>> {
        return ComponentCollect._current.componentsEnablePickerList;
    }
    public static get graphicComponent(): Map<View3D, Map<IComponent, Function>> {
        return ComponentCollect._current.graphicComponent;
    }

    // ─── static facade API (backward-compatible) ─────────────────────────────

    public static bindUpdate(view: View3D, component: IComponent, call: Function) {
        const c = ComponentCollect._current;
        let list = c.componentsUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            c.componentsUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindUpdate(view: View3D, component: IComponent) {
        const list = ComponentCollect._current.componentsUpdateList.get(view);
        if (list) list.delete(component);
    }

    public static bindLateUpdate(view: View3D, component: IComponent, call: Function) {
        const c = ComponentCollect._current;
        let list = c.componentsLateUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            c.componentsLateUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindLateUpdate(view: View3D, component: IComponent) {
        const list = ComponentCollect._current.componentsLateUpdateList.get(view);
        if (list) list.delete(component);
    }

    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function) {
        const c = ComponentCollect._current;
        let list = c.componentsBeforeUpdateList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            c.componentsBeforeUpdateList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindBeforeUpdate(view: View3D, component: IComponent) {
        const list = ComponentCollect._current.componentsBeforeUpdateList.get(view);
        if (list) list.delete(component);
    }

    public static bindCompute(view: View3D, component: IComponent, call: Function) {
        const c = ComponentCollect._current;
        let list = c.componentsComputeList.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            c.componentsComputeList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindCompute(view: View3D, component: IComponent) {
        const list = ComponentCollect._current.componentsComputeList.get(view);
        if (list) list.delete(component);
    }

    public static bindGraphic(view: View3D, component: IComponent, call: Function) {
        const c = ComponentCollect._current;
        let list = c.graphicComponent.get(view);
        if (!list) {
            list = new Map<IComponent, Function>();
            c.graphicComponent.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindGraphic(view: View3D, component: IComponent) {
        const list = ComponentCollect._current.graphicComponent.get(view);
        if (list) list.delete(component);
    }

    public static appendWaitStart(component: IComponent) {
        const arr = ComponentCollect.waitStartComponent.get(component.object3D);
        if (!arr) {
            ComponentCollect.waitStartComponent.set(component.object3D, [component]);
        } else {
            if (arr.indexOf(component) === -1) {
                arr.push(component);
            }
        }
    }

    public static removeWaitStart(obj: Object3D, component: IComponent) {
        const arr = ComponentCollect.waitStartComponent.get(obj);
        if (arr) {
            const index = arr.indexOf(component);
            if (index !== -1) arr.splice(index, 1);
        }
    }

    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function) {
        const c = ComponentCollect._current;
        let list = c.componentsEnablePickerList.get(view);
        if (!list) {
            list = new Map<ColliderComponent, Function>();
            c.componentsEnablePickerList.set(view, list);
        }
        list.set(component, call);
    }

    public static unBindEnablePick(view: View3D, component: ColliderComponent) {
        const list = ComponentCollect._current.componentsEnablePickerList.get(view);
        if (list) list.delete(component);
    }
}
