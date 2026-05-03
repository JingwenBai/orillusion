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
     * The EntityCollect instance for this scene, provided by the owning Engine3D.
     * Populated when the scene is assigned to a View3D whose engine has been set.
     */
    public entityCollect: EntityCollect = null;

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
        // Defer envMap init: Engine3D.res may not be ready yet when the scene is
        // created before an engine instance exists.  The first entity (sky etc.)
        // will trigger the normal flow once a Res is available.
        if (Engine3D.res) {
            this.envMap ||= Engine3D.res.defaultSky;
        }
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
        const sky = this.entityCollect?.sky ?? null;
        if (sky && `map` in sky)
            (sky as any).map = value;
    }

    /**
     * Exposure of Sky Box.
     */
    public get exposure(): number {
        const sky = this.entityCollect?.sky ?? null;
        if (sky && `exposure` in sky)
            return (sky as any).exposure as number;
        return 0;
    }

    /**
     * Set the exposure of the Sky Box.
     */
    public set exposure(value: number) {
        const sky = this.entityCollect?.sky ?? null;
        if (sky && `exposure` in sky) {
            (sky as any).exposure = value;
            // Keep engine setting in sync if there is a default engine
            if (Engine3D.res) Engine3D.setting.sky.skyExposure = value;
        }
    }

    /**
     * Get the roughness of the Sky Box.
     */
    public get roughness(): number {
        const sky = this.entityCollect?.sky ?? null;
        if (sky && `roughness` in sky) {
            return (sky as any).roughness as number;
        }
    }

    /**
     * Set the roughness of the Sky Box.
     */
    public set roughness(value: number) {
        const sky = this.entityCollect?.sky ?? null;
        if (sky && `roughness` in sky) {
            (sky as any).roughness = value;
        }
    }
}
