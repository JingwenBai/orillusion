/**
 * Thin reference holder used to break circular imports between Engine3D and its subsystems.
 * All subsystems that need access to the active Engine3D instance import from here.
 * Engine3D writes to `engineRef.active` on construction and before each frame.
 * @internal
 */
export const engineRef: { active: any } = { active: null };
