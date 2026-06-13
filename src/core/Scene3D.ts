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
    /** The Engine3D instance that manages this scene. Set automatically when assigned to a View3D. */
    public engine: Engine3D;

    /**
     * Returns the EntityCollect for this scene's engine, falling back to the
     * globally current one so single-engine setups continue to work.
     */
    private get _entityCollect(): EntityCollect {
        return (this.engine as any)?.entityCollect ?? EntityCollect.instance;
    }

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
        this.envMap ||= Engine3D.res.defaultSky;
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
        const collect = this._entityCollect;
        if (collect?.sky && `map` in collect.sky)
            collect.sky.map = value;

        // let reflection = new Object3D();
        // let ref = reflection.addComponent(SphereReflection);
        // ref.autoUpdate = true;
        // ref.debug(0, 5);
        // reflection.x = 0;
        // reflection.y = 300;
        // reflection.z = 0;
        // this.addChild(reflection);
    }

    /**
     * Exposure of Sky Box. A larger value produces a sky box with stronger exposure and a brighter appearance.
     *  A smaller value produces a sky box with weaker exposure and a darker appearance.
     */
    public get exposure(): number {
        const collect = this._entityCollect;
        if (collect?.sky && `exposure` in collect.sky)
            return collect.sky.exposure as number;
        return 0;
    }

    /**
     * Set the exposure of the Sky Box.
     */
    public set exposure(value: number) {
        const collect = this._entityCollect;
        if (collect?.sky && `exposure` in collect.sky) {
            collect.sky.exposure = value;
            Engine3D.setting.sky.skyExposure = value;
        }
    }

    /**
     * Get the roughness of the Sky Box.
     */
    public get roughness(): number {
        const collect = this._entityCollect;
        if (collect?.sky && `roughness` in collect.sky) {
            return collect.sky.roughness as number;
        }
    }

    /**
     * Set the roughness of the Sky Box.
     */
    public set roughness(value: number) {
        const collect = this._entityCollect;
        if (collect?.sky && `roughness` in collect.sky) {
            collect.sky.roughness = value;
        }
    }
}
