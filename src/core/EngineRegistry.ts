/**
 * Lightweight registry that tracks the currently active Engine3D instance and
 * its per-engine resources.  Using `any` avoids circular-import issues between
 * Engine3D, Context3D, GBufferFrame and RTResourceMap.
 * @internal
 */

let _activeEngine: any = null;
let _activeContext: any = null;
let _gBufferMap: Map<string, any> = new Map();
let _rtTextureMap: Map<string, any> = new Map();
let _rtViewQuad: Map<string, any> = new Map();
let _outlinePostData: any = null;
let _outlinePostManager: any = null;

/**
 * Called by Engine3D at the start of init() and before each render cycle to
 * make this engine's resources visible to all subsystems.
 */
export function setActiveEngine(engine: any): void {
    _activeEngine = engine;
    _activeContext = engine.context;
    _gBufferMap = engine._gBufferMap;
    _rtTextureMap = engine._rtTextureMap;
    _rtViewQuad = engine._rtViewQuad;
    _outlinePostData = engine._outlinePostData;
    _outlinePostManager = engine._outlinePostManager;
}

/** Called by Engine3D after its Context3D is created and before subsystems initialise. */
export function setActiveContext(context: any): void {
    _activeContext = context;
    if (_activeEngine) {
        _activeEngine.context = context;
    }
}

export function getActiveEngine(): any { return _activeEngine; }
export function getActiveContext(): any { return _activeContext; }
export function getActiveGBufferMap(): Map<string, any> { return _gBufferMap; }
export function getActiveRTTextureMap(): Map<string, any> { return _rtTextureMap; }
export function getActiveRTViewQuad(): Map<string, any> { return _rtViewQuad; }
export function getActiveOutlinePostData(): any { return _outlinePostData; }
export function getActiveOutlinePostManager(): any { return _outlinePostManager; }
