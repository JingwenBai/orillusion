/**
 * Global registry for the currently active WebGPU context.
 * Uses `any` to avoid circular dependency with Context3D.
 * @internal
 */
let _activeContext: any = null;

export function setActiveContext(ctx: any): void {
    _activeContext = ctx;
}

export function getActiveContext(): any {
    return _activeContext;
}
