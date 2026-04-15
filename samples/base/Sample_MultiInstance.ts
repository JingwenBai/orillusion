/**
 * Sample_MultiInstance.ts
 *
 * Demonstrates multi-instance support: two Engine3D instances run
 * independently on separate canvases rendered side by side.
 *
 * Left  canvas  – red  box,  rotates on Y axis
 * Right canvas  – blue sphere, rotates on X axis
 */
import {
    Engine3D,
    Scene3D,
    Object3D,
    Camera3D,
    View3D,
    DirectLight,
    AtmosphericComponent,
    HoverCameraController,
    MeshRenderer,
    BoxGeometry,
    SphereGeometry,
    LitMaterial,
    Color,
    ComponentBase,
} from "@orillusion/core";

// ── helper: auto-rotate component ────────────────────────────────────────────
class AutoRotate extends ComponentBase {
    public speedX: number = 0;
    public speedY: number = 0;

    onUpdate() {
        this.object3D.rotationX += this.speedX;
        this.object3D.rotationY += this.speedY;
    }
}

// ── helper: build one complete scene ─────────────────────────────────────────
function buildScene(engine: Engine3D, color: Color, speedX: number, speedY: number) {
    const scene = new Scene3D();

    // sky
    const sky = scene.addComponent(AtmosphericComponent);
    sky.sunY = 0.6;

    // directional light
    const lightObj = new Object3D();
    lightObj.rotationX = 45;
    lightObj.rotationY = 60;
    const dirLight = lightObj.addComponent(DirectLight);
    dirLight.intensity = 3;
    scene.addChild(lightObj);

    // camera
    const cameraObj = new Object3D();
    const camera = cameraObj.addComponent(Camera3D);
    camera.perspective(60, engine.aspect, 0.1, 5000);
    const ctrl = cameraObj.addComponent(HoverCameraController);
    ctrl.setCamera(0, 0, 8);
    scene.addChild(cameraObj);

    // mesh (box on left, sphere on right)
    const meshObj = new Object3D();
    const mr = meshObj.addComponent(MeshRenderer);
    mr.geometry = speedY !== 0 ? new BoxGeometry(2, 2, 2) : new SphereGeometry(1.2, 32, 32);
    const mat = new LitMaterial();
    mat.baseColor = color;
    mr.material = mat;
    const rot = meshObj.addComponent(AutoRotate);
    rot.speedX = speedX;
    rot.speedY = speedY;
    scene.addChild(meshObj);

    // view
    const view = new View3D();
    view.scene = scene;
    view.camera = camera;
    return view;
}

// ── create two side-by-side canvases ─────────────────────────────────────────
const wrapper = document.createElement('div');
Object.assign(wrapper.style, {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    gap: '4px',
    background: '#111',
    boxSizing: 'border-box',
    padding: '4px',
});
document.body.style.margin = '0';
document.body.appendChild(wrapper);

function makeCanvas(label: string): HTMLCanvasElement {
    const container = document.createElement('div');
    Object.assign(container.style, {
        flex: '1',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '8px',
    });

    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, { width: '100%', height: '100%' });
    canvas.width  = Math.floor(window.innerWidth / 2 - 6);
    canvas.height = window.innerHeight - 8;
    container.appendChild(canvas);

    const badge = document.createElement('div');
    Object.assign(badge.style, {
        position: 'absolute',
        top: '12px', left: '12px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '14px',
        background: 'rgba(0,0,0,.5)',
        padding: '4px 10px',
        borderRadius: '4px',
        pointerEvents: 'none',
    });
    badge.textContent = label;
    container.appendChild(badge);

    wrapper.appendChild(container);
    return canvas;
}

const canvasL = makeCanvas('Engine3D  #1 — red box (Y-rotate)');
const canvasR = makeCanvas('Engine3D  #2 — blue sphere (X-rotate)');

// ── boot both engines independently ──────────────────────────────────────────
const engine1 = new Engine3D();
await engine1.init({ canvasConfig: { canvas: canvasL } });
const view1 = buildScene(engine1, new Color(0.9, 0.2, 0.2), 0, 0.5);
engine1.startRenderView(view1);

const engine2 = new Engine3D();
await engine2.init({ canvasConfig: { canvas: canvasR } });
const view2 = buildScene(engine2, new Color(0.2, 0.4, 0.9), 0.5, 0);
engine2.startRenderView(view2);

console.log('Both engines running — each with its own WebGPU context, scene, and render loop.');
