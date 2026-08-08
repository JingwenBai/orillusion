import { View3D } from "..";
import { Ray } from "../math/Ray";
import { Vector3 } from "../math/Vector3";
import { ComponentBase } from "./ComponentBase";
import { BoxColliderShape } from "./shape/BoxColliderShape";
import { ColliderShape, HitInfo } from "./shape/ColliderShape";

/**
 * collider component
 * @group Components
 */
export class ColliderComponent extends ComponentBase {
    private _shape: ColliderShape;

    constructor() {
        super();
        this._shape = new BoxColliderShape();
    }
    /**
     * @internal
     */
    public start(): void {
        const engine = this.transform?.view3D?.engine;
        const pickMode = engine?.setting?.pick?.mode ?? 'bound';
        if (pickMode === `pixel`) {
            this.transform.scene3D.view.pickFire.mouseEnableMap.set(this.transform.worldMatrix.index, this);
        }
    }

    public onEnable(view?: View3D) {
        view?.engine?.componentCollect?.bindEnablePick(view, this, null);
    }

    public onDisable(view?: View3D) {
        view?.engine?.componentCollect?.unBindEnablePick(view, this);
    }

    /**
     * Returns the shape of collider
     */
    public get shape(): ColliderShape {
        return this._shape;
    }

    /**
     * Set the shape of collider
     */
    public set shape(value: ColliderShape) {
        this._shape = value;
    }

    /**
     * @internal
     * @param ray
     * @returns
     */
    public rayPick(ray: Ray): HitInfo {
        if (this._enable) {
            return this._shape.rayPick(ray, this.transform.worldMatrix);
        }
        return null;
    }

    public beforeDestroy(force?: boolean) {
        const engine = this.transform?.view3D?.engine ?? this.transform?.scene3D?.view?.engine;
        if (engine?.setting?.pick?.mode == `pixel`) {
            this.transform.scene3D.view.pickFire.mouseEnableMap.delete(this.transform.worldMatrix.index);
        }
        super.beforeDestroy(force);
    }

}
