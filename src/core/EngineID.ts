let _activeId: string = 'default';

export function setActiveEngineId(id: string): void {
    _activeId = id;
}

export function getActiveEngineId(): string {
    return _activeId;
}
