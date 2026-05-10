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

    constructor() {
        super();
        this.transform.scene3D = this;
        this.skyObject = new Object3D();
        this.addChild(this.skyObject);
        this._isScene3D = true;
        // Defer default sky assignment: Engine3D.res is available via the static
        // getter which delegates to Engine3D._current (set after engine.init()).
        if (Engine3D.res) {
            this._envMap ||= Engine3D.res.defaultSky;
        }
    }

    /**
     * get environment texture
     */
    public get envMap(): Texture {
        // Lazily resolve default sky texture if not yet assigned
        if (!this._envMap && Engine3D.res) {
            this._envMap = Engine3D.res.defaultSky;
        }
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
        const collect = this.view?.engine?.entityCollect ?? EntityCollect.instance;
        if (collect?.sky && `map` in collect.sky)
            collect.sky.map = value;
    }

    /**
     * Exposure of Sky Box.
     */
    public get exposure(): number {
        const collect = this.view?.engine?.entityCollect ?? EntityCollect.instance;
        if (collect?.sky && `exposure` in collect.sky)
            return collect.sky.exposure as number;
        return 0;
    }

    public set exposure(value: number) {
        const collect = this.view?.engine?.entityCollect ?? EntityCollect.instance;
        if (collect?.sky && `exposure` in collect.sky) {
            collect.sky.exposure = value;
            Engine3D.setting.sky.skyExposure = value;
        }
    }

    /**
     * Get the roughness of the Sky Box.
     */
    public get roughness(): number {
        const collect = this.view?.engine?.entityCollect ?? EntityCollect.instance;
        if (collect?.sky && `roughness` in collect.sky) {
            return collect.sky.roughness as number;
        }
    }

    /**
     * Set the roughness of the Sky Box.
     */
    public set roughness(value: number) {
        const collect = this.view?.engine?.entityCollect ?? EntityCollect.instance;
        if (collect?.sky && `roughness` in collect.sky) {
            collect.sky.roughness = value;
        }
    }
}
