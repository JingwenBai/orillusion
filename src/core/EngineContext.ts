/**
 * Holds the currently active Engine3D instance.
 * Uses `any` to avoid circular import between Engine3D and subsystems.
 * @internal
 */
export let activeEngine: any = null;

export function setActiveEngine(engine: any): void {
    activeEngine = engine;
}
