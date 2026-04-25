/**
 * Shared mutable context holder used to break circular import dependencies
 * between Engine3D and its subsystem classes (ComponentCollect, GlobalBindGroup, etc.).
 *
 * Because Engine3D imports subsystems and subsystems would need Engine3D,
 * we store the active engine instance here instead of importing Engine3D directly.
 *
 * JavaScript (and TypeScript) is single-threaded, so swapping `current` before
 * each engine's render frame is safe — no two engines can render concurrently.
 */
export const EngineContext: { current: any } = {
    current: null,
};
