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
        this.envMap ||= Engine3D.res?.defaultSky;
    }

    /**
     * Returns the Engine3D instance that owns the view this scene is assigned to.
     * May be null before Engine3D.startRenderView() is called.
     */
    public get engine(): Engine3D | null {
        return this.view?.engine ?? null;
    }

    /**
     * Convenience accessor for the EntityCollect of the owning engine.
     * Falls back to the primary engine's EntityCollect when no engine is assigned yet.
     * @internal
     */
    public get entityCollect(): EntityCollect {
        return this.engine?.entityCollect ?? EntityCollect.instance;
    }

    /**
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
        const sky = this.entityCollect?.sky;
        if (sky && `map` in sky) sky.map = value;
    }

    /**
     * Exposure of Sky Box.
     */
    public get exposure(): number {
        const sky = this.entityCollect?.sky;
        if (sky && `exposure` in sky) return sky.exposure as number;
        return 0;
    }

    public set exposure(value: number) {
        const sky = this.entityCollect?.sky;
        if (sky && `exposure` in sky) {
            sky.exposure = value;
            Engine3D.setting.sky.skyExposure = value;
        }
    }

    /**
     * Get the roughness of the Sky Box.
     */
    public get roughness(): number {
        const sky = this.entityCollect?.sky;
        if (sky && `roughness` in sky) return sky.roughness as number;
        return 0;
    }

    public set roughness(value: number) {
        const sky = this.entityCollect?.sky;
        if (sky && `roughness` in sky) sky.roughness = value;
    }
}
