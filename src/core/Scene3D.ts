import { Engine3D } from '../Engine3D';
import { Texture } from '../gfx/graphics/webGpu/core/texture/Texture';
import { EntityCollect } from '../gfx/renderJob/collect/EntityCollect';
import { View3D } from './View3D';
import { Object3D } from './entities/Object3D';


/**
 * It represents an independent 3D scene where 3D objects can be created and manipulated.
 * @group Entity
 */
export class Scene3D extends Object3D {
    private _envMap: Texture;
    private skyObject: Object3D;
    public envMapChange: boolean = true;
    public view: View3D;

    /**
     * Per-scene entity collector. Manages render nodes, lights, and probes for this scene.
     */
    public entityCollect: EntityCollect;

    /**
     *
     * @constructor
     */
    constructor() {
        super();
        this.transform.scene3D = this;
        this.entityCollect = new EntityCollect();
        this.skyObject = new Object3D();
        this.addChild(this.skyObject);
        this._isScene3D = true;
        this.envMap ||= Engine3D.res?.defaultSky;
    }

    /**
     *
     * get environment texture
     */
    public get envMap(): Texture {
        return this._envMap;
    }

    /**
     * set environment texture
     */
    public set envMap(value: Texture) {
        if (this._envMap != value) {
            this.envMapChange = true;
        }
        this._envMap = value;
        if (this.entityCollect.sky && `map` in this.entityCollect.sky)
            this.entityCollect.sky.map = value;
    }

    /**
     * Exposure of Sky Box. A larger value produces a sky box with stronger exposure and a brighter appearance.
     *  A smaller value produces a sky box with weaker exposure and a darker appearance.
     */
    public get exposure(): number {
        if (this.entityCollect.sky && `exposure` in this.entityCollect.sky)
            return this.entityCollect.sky.exposure as number;
        return 0;
    }

    /**
     * Set the exposure of the Sky Box.
     */
    public set exposure(value: number) {
        if (this.entityCollect.sky && `exposure` in this.entityCollect.sky) {
            this.entityCollect.sky.exposure = value;
            Engine3D.setting.sky.skyExposure = value;
        }
    }

    /**
     * Get the roughness of the Sky Box.
     */
    public get roughness(): number {
        if (this.entityCollect.sky && `roughness` in this.entityCollect.sky) {
            return this.entityCollect.sky.roughness as number;
        }
    }

    /**
     * Set the roughness of the Sky Box.
     */
    public set roughness(value: number) {
        if (this.entityCollect.sky && `roughness` in this.entityCollect.sky) {
            this.entityCollect.sky.roughness = value;
        }
    }
}
