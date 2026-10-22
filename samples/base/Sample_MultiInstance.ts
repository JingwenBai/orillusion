import { Engine3D, Scene3D, AtmosphericComponent, HoverCameraController, Object3D, MeshRenderer, BoxGeometry, LitMaterial, DirectLight, View3D, Camera3D, GridObject, Color } from "@orillusion/core";

/**
 * Demonstrates running two independent Engine3D instances on the same page,
 * each with its own canvas, scene, camera, and render loop.
 */

// Create two canvas elements side by side
const container = document.createElement('div');
container.style.cssText = 'display:flex;width:100%;height:100vh;';

const canvas1 = document.createElement('canvas');
canvas1.style.cssText = 'flex:1;';
canvas1.id = 'canvas1';

const canvas2 = document.createElement('canvas');
canvas2.style.cssText = 'flex:1;';
canvas2.id = 'canvas2';

container.appendChild(canvas1);
container.appendChild(canvas2);
document.body.style.margin = '0';
document.body.appendChild(container);

async function createEngine(canvas: HTMLCanvasElement, boxColor: Color, rotY: number): Promise<Engine3D> {
    const engine = new Engine3D();
    await engine.init({ canvas });

    const scene = new Scene3D();

    const sky = scene.addComponent(AtmosphericComponent);
    sky.sunY = 0.6;

    const cameraObj = new Object3D();
    const camera = cameraObj.addComponent(Camera3D);
    camera.perspective(45, engine.aspect, 1, 5000.0);

    const controller = cameraObj.addComponent(HoverCameraController);
    controller.setCamera(0, 0, 30);
    scene.addChild(cameraObj);

    const light = new Object3D();
    light.rotationX = 45;
    light.rotationY = 30;
    const dirLight = light.addComponent(DirectLight);
    dirLight.intensity = 3;
    scene.addChild(light);

    const box = new Object3D();
    const mr = box.addComponent(MeshRenderer);
    mr.geometry = new BoxGeometry(3, 3, 3);
    const mat = new LitMaterial();
    mat.baseColor = boxColor;
    mr.material = mat;
    box.rotationY = rotY;
    box.y = 1.5;
    scene.addChild(box);

    const grid = new GridObject(1000, 100);
    scene.addChild(grid);

    const view = new View3D();
    view.scene = scene;
    view.camera = camera;
    engine.startRenderView(view);

    return engine;
}

// Launch both engines concurrently
const [engine1, engine2] = await Promise.all([
    createEngine(canvas1, new Color(1, 0.3, 0.3, 1), 0),
    createEngine(canvas2, new Color(0.3, 0.3, 1, 1), 45),
]);

console.log('Two Engine3D instances running:', engine1, engine2);
