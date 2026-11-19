/**
 * Lightweight registry for per-engine-instance state.
 * No complex imports to avoid circular dependencies.
 * @internal
 */

let _activeContext: any = null;
let _activeEngineId: string = 'default';
const _viewContextMap = new Map<any, any>();

export const EngineRegistry = {
    get active(): any {
        return _activeContext;
    },

    setActive(ctx: any) {
        _activeContext = ctx;
        _activeEngineId = ctx?._engineId ?? 'default';
    },

    get activeEngineId(): string {
        return _activeEngineId;
    },

    registerView(view: any, ctx: any) {
        _viewContextMap.set(view, ctx);
    },

    unregisterView(view: any) {
        _viewContextMap.delete(view);
    },

    getByView(view: any): any {
        return _viewContextMap.get(view) ?? null;
    },

    getByScene(scene: any): any {
        if (scene?.view) {
            return _viewContextMap.get(scene.view) ?? null;
        }
        return null;
    },
};
