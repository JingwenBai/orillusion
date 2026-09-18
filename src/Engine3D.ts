import { CanvasConfig } from './gfx/graphics/webGpu/CanvasConfig';
import { EngineSetting } from './setting/EngineSetting';
import { createDefaultEngineSetting } from './setting/DefaultSettings';
import { View3D } from './core/View3D';
import { RendererJob } from './gfx/renderJob/jobs/RendererJob';
import { Res } from './assets/Res';
import { InputSystem } from './io/InputSystem';
import { EngineCore } from './EngineCore';
import { EngineContext } from './EngineContext';

/**
 * Orillusion 3D Engine — static facade for backward compatibility.
 *
 * Single-instance usage (unchanged from previous API):
 * ```typescript
 * await Engine3D.init({ canvasConfig: ... });
 * Engine3D.startRenderView(myView);
 * ```
 *
 * Multi-instance usage (new):
 * ```typescript
 * const engine1 = Engine3D.create();
 * await engine1.init({ canvasConfig: { canvas: canvas1 } });
 * engine1.startRenderView(view1);
 *
 * const engine2 = Engine3D.create();
 * await engine2.init({ canvasConfig: { canvas: canvas2 } });
 * engine2.startRenderView(view2);
 * ```
 *
 * @group engine3D
 */
export class Engine3D {

    /** @internal - the default engine created by Engine3D.init() */
    private static _default: EngineCore | null = null;

    /** All active engine instances. */
    private static _instances: EngineCore[] = [];

    /**
     * Pre-init settings accumulator.
     * Mutations before init() are preserved here and copied into the EngineCore on init().
     */
    private static _preInitSetting: EngineSetting = createDefaultEngineSetting();

    // ─── Static getters / setters delegating to _default ───────────────────────

    /** Resource manager of the default engine instance. */
    public static get res(): Res {
        return Engine3D._default?.res;
    }

    /** Input system of the default engine instance. */
    public static get inputSystem(): InputSystem {
        return Engine3D._default?.inputSystem;
    }

    /** Active render views of the default engine instance. */
    public static get views(): View3D[] {
        return Engine3D._default?.views;
    }

    /**
     * @internal
     * Render jobs of the default engine instance.
     */
    public static get renderJobs(): Map<View3D, RendererJob> {
        return Engine3D._default?.renderJobs;
    }

    /**
     * Engine settings.
     *
     * Before init(): mutations accumulate in _preInitSetting and are applied on init().
     * After init(): delegates to the default EngineCore instance.
     */
    public static get setting(): EngineSetting {
        // During a render frame EngineContext.current is set; prefer it so that
        // renderer code (e.g. RendererJob) reads the correct per-engine setting.
        return (EngineContext.current as EngineCore)?.setting
            ?? Engine3D._default?.setting
            ?? Engine3D._preInitSetting;
    }

    public static set setting(v: EngineSetting) {
        if (Engine3D._default) {
            Engine3D._default.setting = v;
        } else {
            Engine3D._preInitSetting = v;
        }
    }

    // ─── Derived getters ────────────────────────────────────────────────────────

    /** Target frame rate for the default engine. */
    public static get frameRate(): number {
        return Engine3D._default?.frameRate ?? 360;
    }

    public static set frameRate(value: number) {
        if (Engine3D._default) {
            Engine3D._default.frameRate = value;
        }
    }

    /** Presentation size [width, height] of the default engine's canvas. */
    public static get size(): number[] {
        return Engine3D._default?.size ?? [0, 0];
    }

    /** Aspect ratio of the default engine's canvas. */
    public static get aspect(): number {
        return Engine3D._default?.aspect ?? 1;
    }

    /** Width in physical pixels of the default engine's canvas. */
    public static get width(): number {
        return Engine3D._default?.width ?? 0;
    }

    /** Height in physical pixels of the default engine's canvas. */
    public static get height(): number {
        return Engine3D._default?.height ?? 0;
    }

    // ─── Static API (single-instance, backward compatible) ──────────────────────

    /**
     * Initialize the default engine instance.
     * Creates an EngineCore, copies any pre-init setting mutations, then calls init().
     */
    public static async init(descriptor: {
        canvasConfig?: CanvasConfig;
        beforeRender?: Function;
        renderLoop?: Function;
        lateRender?: Function;
        engineSetting?: EngineSetting;
    } = {}): Promise<void> {
        Engine3D._default = new EngineCore();
        Engine3D._instances.push(Engine3D._default);

        // Carry over any mutations made to Engine3D.setting before init()
        Engine3D._default.setting = {
            ...Engine3D._preInitSetting,
            ...(descriptor.engineSetting ?? {}),
        };

        // Pass descriptor without engineSetting (already merged above)
        const { engineSetting: _, ...rest } = descriptor;
        return Engine3D._default.init(rest);
    }

    /**
     * Set a single render view and start the render loop on the default engine.
     */
    public static startRenderView(view: View3D): RendererJob {
        return Engine3D._default?.startRenderView(view);
    }

    /**
     * Set multiple render views and start the render loop on the default engine.
     */
    public static startRenderViews(views: View3D[]): void {
        Engine3D._default?.startRenderViews(views);
    }

    /**
     * Get the RendererJob for a view on the default engine.
     */
    public static getRenderJob(view: View3D): RendererJob {
        return Engine3D._default?.getRenderJob(view);
    }

    /**
     * Pause the default engine's render loop.
     */
    public static pause(): void {
        Engine3D._default?.pause();
    }

    /**
     * Resume the default engine's render loop.
     */
    public static resume(): void {
        Engine3D._default?.resume();
    }

    // ─── Multi-instance factory ─────────────────────────────────────────────────

    /**
     * Create a new independent EngineCore instance.
     * Use this to run multiple 3D scenes on separate canvases simultaneously.
     *
     * @returns A new EngineCore instance ready to be initialized.
     */
    public static create(): EngineCore {
        const instance = new EngineCore();
        Engine3D._instances.push(instance);
        return instance;
    }

    /**
     * All active engine instances (including the default one created by init()).
     */
    public static get instances(): readonly EngineCore[] {
        return Engine3D._instances;
    }
}
