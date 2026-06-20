let _currentId: number = 0;
let _nextId: number = 1;

export function newEngineId(): number {
    return _nextId++;
}

export function setCurrentEngineId(id: number): void {
    _currentId = id;
}

export function getCurrentEngineId(): number {
    return _currentId;
}
