import { Engine3D } from '../Engine3D';
import { SphereReflection } from '../components/renderer/SphereReflection';
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
     *
     * @constructor
     */
    constructor() {
        super();
        this.transform.scene3D = this;
        this.skyObject = new Object3D();
        this.addChild(this.skyObject);
        this._isScene3D = true;
        this.envMap ||= Engine3D.res?.defaultSky;
    }

    /** Returns the EntityCollect for this scene's engine, or the active one. */
    private get _entityCollect(): import('../gfx/renderJob/collect/EntityCollect').EntityCollect {
        return this.view?.engine?.entityCollect ?? EntityCollect.instance;
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
        const ec = this._entityCollect;
        if (ec?.sky && `map` in ec.sky)
            ec.sky.map = value;
    }

    /**
     * Exposure of Sky Box. A larger value produces a sky box with stronger exposure and a brighter appearance.
     *  A smaller value produces a sky box with weaker exposure and a darker appearance.
     */
    public get exposure(): number {
        const ec = this._entityCollect;
        if (ec?.sky && `exposure` in ec.sky)
            return ec.sky.exposure as number;
        return 0;
    }

    /**
     * Set the exposure of the Sky Box.
     */
    public set exposure(value: number) {
        const ec = this._entityCollect;
        if (ec?.sky && `exposure` in ec.sky) {
            ec.sky.exposure = value;
            const setting = this.view?.engine?.setting ?? Engine3D.setting;
            if (setting) setting.sky.skyExposure = value;
        }
    }

    /**
     * Get the roughness of the Sky Box.
     */
    public get roughness(): number {
        const ec = this._entityCollect;
        if (ec?.sky && `roughness` in ec.sky) {
            return ec.sky.roughness as number;
        }
    }

    /**
     * Set the roughness of the Sky Box.
     */
    public set roughness(value: number) {
        const ec = this._entityCollect;
        if (ec?.sky && `roughness` in ec.sky) {
            ec.sky.roughness = value;
        }
    }
}
