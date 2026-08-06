/**
 * Sample_MultiInstance — two Engine3D instances, each rendering to its own canvas.
 *
 * Usage: load this sample in a page that has two <canvas> elements with ids
 * "canvas0" and "canvas1".  Each engine runs its own independent render loop,
 * shares the single underlying WebGPU device, and has fully isolated resource
 * namespaces (GBuffer textures, render-target maps, etc.).
 */
import {
    Engine3D, Scene3D, AtmosphericComponent, Object3D,
    MeshRenderer, BoxGeometry, LitMaterial, DirectLight,
    View3D, Camera3D, OrbitController, Color
} from "@orillusion/core";

function buildScene(color: Color) {
    const scene = new Scene3D();
    const sky = scene.addComponent(AtmosphericComponent);
    sky.sunY = 0.6;

    const lightObj = new Object3D();
    lightObj.rotationX = 45;
    lightObj.rotationY = 30;
    const dirLight = lightObj.addComponent(DirectLight);
    dirLight.intensity = 3;
    scene.addChild(lightObj);

    const box = new Object3D();
    const mr = box.addComponent(MeshRenderer);
    mr.geometry = new BoxGeometry(1, 1, 1);
    const mat = new LitMaterial();
    mat.baseColor = color;
    mr.material = mat;
    box.y = 0.5;
    scene.addChild(box);

    const cameraObj = new Object3D();
    const camera = cameraObj.addComponent(Camera3D);
    camera.perspective(45, 1, 0.1, 1000);
    const controller = cameraObj.addComponent(OrbitController);
    controller.setCamera(0, 0, 5);
    scene.addChild(cameraObj);

    return { scene, camera, box };
}

// ---- Engine 1 (blue box) ----
const engine1 = new Engine3D();
await engine1.init({
    canvasConfig: { canvas: document.getElementById('canvas0') as HTMLCanvasElement },
    renderLoop: () => { box1.rotationY += 0.5; }
});
const { scene: scene1, camera: camera1, box: box1 } = buildScene(new Color(0.2, 0.5, 1.0));
const view1 = new View3D();
view1.scene = scene1;
view1.camera = camera1;
engine1.startRenderView(view1);

// ---- Engine 2 (red box) ----
const engine2 = new Engine3D();
await engine2.init({
    canvasConfig: { canvas: document.getElementById('canvas1') as HTMLCanvasElement },
    renderLoop: () => { box2.rotationY -= 0.5; }
});
const { scene: scene2, camera: camera2, box: box2 } = buildScene(new Color(1.0, 0.3, 0.2));
const view2 = new View3D();
view2.scene = scene2;
view2.camera = camera2;
engine2.startRenderView(view2);
