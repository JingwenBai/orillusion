/**
 * Global active-engine context used by subsystem static router methods.
 * The currently-executing Engine3D instance sets itself here at the
 * start of every render frame.  Because JavaScript is single-threaded,
 * multiple engine instances never execute concurrently, so this single
 * mutable reference is always consistent inside a given call-stack.
 * @internal
 */
export let activeEngine: any = null;

/**
 * Update the globally-active engine reference.
 * Called by Engine3D at the beginning of each render frame and during init.
 * @internal
 */
export function setActiveEngine(engine: any): void {
    activeEngine = engine;
}
