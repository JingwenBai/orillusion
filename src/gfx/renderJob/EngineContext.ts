/**
 * Module-level active engine context used by rendering systems
 * that need per-engine state but cannot receive an explicit engine reference.
 * Set at the start of each engine's init() and render frame.
 * @internal
 */
export let activeEngine: any = null;

export function setActiveEngine(engine: any): void {
    activeEngine = engine;
}
