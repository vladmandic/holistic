import * as B from '@babylonjs/core';
import '@babylonjs/loaders';
import type { Scene } from './scene';

let mesh: B.Mesh;
let animation: B.Animatable;

export async function showLoader(scene: Scene) {
  if (!scene.scene) return;
  if (!mesh) {
    const root = await B.SceneLoader.ImportMeshAsync('Cube_lambert1_0', '../assets/', 'male-body.glb', scene.scene);
    mesh = root.meshes[1] as B.Mesh;
    mesh.parent = null;
    root.meshes[0].dispose();
    mesh.name = 'skeleton';
    mesh.visibility = 0;
    mesh.scaling = new B.Vector3(0.5, 0.5, 0.5);
    mesh.position = new B.Vector3(0.5, 0.52, 0);
    mesh.rotation = new B.Vector3(-Math.PI / 2, Math.PI / 2, 0);
    if (mesh.material) mesh.material.dispose();
    mesh.material = scene.material;
    scene.shadows.addShadowCaster(mesh, false); // add shadow to new tube
  }
  mesh.setEnabled(true);
  scene.camera.setTarget(mesh);
  scene.camera.useFramingBehavior = true;
  const bounds = mesh.getBoundingInfo();
  scene.camera.framingBehavior?.zoomOnBoundingInfo(bounds.boundingBox.minimumWorld, bounds.boundingBox.maximumWorld);
  if (!animation) animation = B.Animation.CreateAndStartAnimation('loader', mesh, 'rotation.z', 30, 60, 0, 2 * Math.PI, 1, new B.SineEase()) as B.Animatable;
  else animation.restart();
  B.Animation.CreateAndStartAnimation('loader', mesh, 'visibility', 30, 60, 0, 1, 0, new B.SineEase()) as B.Animatable;
  animation.speedRatio = 0.5;
}

export async function hideLoader() {
  if (animation) animation.pause();
  if (mesh && mesh.isEnabled()) {
    mesh.visibility = 0;
    mesh.setEnabled(false);
  }
}
