import { ColliderComponent } from "../../../components/ColliderComponent";
import { IComponent } from "../../../components/IComponent";
import { activeEngine } from "../../../core/EngineContext";
import { View3D } from "../../../core/View3D";
import { Object3D } from "../../../core/entities/Object3D";

/**
 * Per-Engine3D component lifecycle tracker.
 * Static methods delegate to the currently active Engine3D instance.
 * @internal
 */
export class ComponentCollect {

    // ─── Instance state ───────────────────────────────────────────────────────

    public componentsUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsLateUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsBeforeUpdateList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsComputeList: Map<View3D, Map<IComponent, Function>> = new Map();
    public componentsEnablePickerList: Map<View3D, Map<ColliderComponent, Function>> = new Map();
    public graphicComponent: Map<View3D, Map<IComponent, Function>> = new Map();
    public waitStartComponent: Map<Object3D, IComponent[]> = new Map();

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
            if (arr.indexOf(component) === -1) arr.push(component);
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

    // ─── Static delegates → active engine's componentCollect ─────────────────

    /** @deprecated Use engine.componentCollect directly for multi-instance setups. */
    public static bindUpdate(view: View3D, component: IComponent, call: Function): void {
        activeEngine?.componentCollect?.bindUpdate(view, component, call);
    }

    /** @deprecated Use engine.componentCollect directly for multi-instance setups. */
    public static unBindUpdate(view: View3D, component: IComponent): void {
        activeEngine?.componentCollect?.unBindUpdate(view, component);
    }

    /** @deprecated Use engine.componentCollect directly for multi-instance setups. */
    public static bindLateUpdate(view: View3D, component: IComponent, call: Function): void {
        activeEngine?.componentCollect?.bindLateUpdate(view, component, call);
    }

    /** @deprecated Use engine.componentCollect directly for multi-instance setups. */
    public static unBindLateUpdate(view: View3D, component: IComponent): void {
        activeEngine?.componentCollect?.unBindLateUpdate(view, component);
    }

    /** @deprecated Use engine.componentCollect directly for multi-instance setups. */
    public static bindBeforeUpdate(view: View3D, component: IComponent, call: Function): void {
        activeEngine?.componentCollect?.bindBeforeUpdate(view, component, call);
    }

    /** @deprecated Use engine.componentCollect directly for multi-instance setups. */
    public static unBindBeforeUpdate(view: View3D, component: IComponent): void {
        activeEngine?.componentCollect?.unBindBeforeUpdate(view, component);
    }

    /** @deprecated Use engine.componentCollect directly for multi-instance setups. */
    public static bindCompute(view: View3D, component: IComponent, call: Function): void {
        activeEngine?.componentCollect?.bindCompute(view, component, call);
    }

    /** @deprecated Use engine.componentCollect directly for multi-instance setups. */
    public static unBindCompute(view: View3D, component: IComponent): void {
        activeEngine?.componentCollect?.unBindCompute(view, component);
    }

    /** @deprecated Use engine.componentCollect directly for multi-instance setups. */
    public static bindGraphic(view: View3D, component: IComponent, call: Function): void {
        activeEngine?.componentCollect?.bindGraphic(view, component, call);
    }

    /** @deprecated Use engine.componentCollect directly for multi-instance setups. */
    public static unBindGraphic(view: View3D, component: IComponent): void {
        activeEngine?.componentCollect?.unBindGraphic(view, component);
    }

    /** @deprecated Use engine.componentCollect directly for multi-instance setups. */
    public static appendWaitStart(component: IComponent): void {
        activeEngine?.componentCollect?.appendWaitStart(component);
    }

    /** @deprecated Use engine.componentCollect directly for multi-instance setups. */
    public static removeWaitStart(obj: Object3D, component: IComponent): void {
        activeEngine?.componentCollect?.removeWaitStart(obj, component);
    }

    /** @deprecated Use engine.componentCollect directly for multi-instance setups. */
    public static bindEnablePick(view: View3D, component: ColliderComponent, call: Function): void {
        activeEngine?.componentCollect?.bindEnablePick(view, component, call);
    }

    /** @deprecated Use engine.componentCollect directly for multi-instance setups. */
    public static unBindEnablePick(view: View3D, component: ColliderComponent): void {
        activeEngine?.componentCollect?.unBindEnablePick(view, component);
    }

    // For backward compat: expose instance lists as static getters.

    /** @deprecated Use engine.componentCollect.componentsBeforeUpdateList */
    public static get componentsBeforeUpdateList() {
        return activeEngine?.componentCollect?.componentsBeforeUpdateList;
    }
    /** @deprecated Use engine.componentCollect.componentsComputeList */
    public static get componentsComputeList() {
        return activeEngine?.componentCollect?.componentsComputeList;
    }
    /** @deprecated Use engine.componentCollect.componentsUpdateList */
    public static get componentsUpdateList() {
        return activeEngine?.componentCollect?.componentsUpdateList;
    }
    /** @deprecated Use engine.componentCollect.graphicComponent */
    public static get graphicComponent() {
        return activeEngine?.componentCollect?.graphicComponent;
    }
    /** @deprecated Use engine.componentCollect.componentsLateUpdateList */
    public static get componentsLateUpdateList() {
        return activeEngine?.componentCollect?.componentsLateUpdateList;
    }
    /** @deprecated Use engine.componentCollect.componentsEnablePickerList */
    public static get componentsEnablePickerList() {
        return activeEngine?.componentCollect?.componentsEnablePickerList;
    }
    /** @deprecated Use engine.componentCollect.waitStartComponent */
    public static get waitStartComponent() {
        return activeEngine?.componentCollect?.waitStartComponent;
    }
}
