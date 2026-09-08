import type { Engine3D } from '../Engine3D';

let _current: Engine3D | null = null;

export function setCurrentEngine(engine: Engine3D | null): void {
    _current = engine;
}

export function getCurrentEngine(): Engine3D | null {
    return _current;
}
