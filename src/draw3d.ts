import * as B from '@babylonjs/core';
import * as h from '@mediapipe/holistic';
import { Scene } from './scene';
import { UV468, TRI468 } from './constants';
import '@babylonjs/inspector';

let t: Scene;
let meshes: Record<string, B.Mesh | B.AbstractMesh> = {};
let faceVertexData: B.VertexData | undefined;
let previousSmooth = false;

export function initScene(canvasOutput: HTMLCanvasElement) {
  if (!t) t = new Scene(canvasOutput);
  for (const mesh of Object.values(meshes)) mesh.dispose();
  meshes = {};
  t.scene.debugLayer.show();
}

const pathLength = (path: Array<B.Vector3>): number => Math.abs(B.Vector3.Distance(path[0], path[path.length - 1]) * 0.1);

const drawPath = (parent: string, desc: string, path: Array<B.Vector3>, visibilty: number) => {
  const diameter = 0.75 * pathLength(path) + 0.01;
  if (!meshes[parent]) meshes[parent] = new B.AbstractMesh(parent, t.scene);
  if (!meshes[parent + desc]) { // pose part seen for the first time
    meshes[parent + desc] = B.MeshBuilder.CreateTube(parent + desc, { path, radius: diameter / 2, updatable: true, cap: 3, sideOrientation: B.Mesh.DOUBLESIDE }, t.scene); // create new tube
    meshes[parent + desc].material = t.materialBone;
    meshes[parent + desc].parent = meshes[parent];
    t.shadows.addShadowCaster(meshes[parent + desc], false); // add shadow to new tube
    for (let i = 0; i < path.length; i++) {
      meshes[parent + desc + i] = B.MeshBuilder.CreateSphere(parent + desc + i, { diameter: 1 }, t.scene); // rounded edge for path // diameter is fixed and we change scale later
      meshes[parent + desc + i].material = t.materialJoint;
      meshes[parent + desc + i].parent = meshes[parent];
      t.shadows.addShadowCaster(meshes[parent + desc + i], false);
    }
  }
  if (visibilty > 0) meshes[parent + desc] = B.MeshBuilder.CreateTube(parent + desc, { path, radius: diameter / 2, updatable: true, cap: 3, sideOrientation: B.Mesh.DOUBLESIDE, instance: meshes[parent + desc] as B.Mesh }, t.scene); // update existing tube
  meshes[parent + desc].visibility = visibilty;
  for (let i = 0; i < path.length; i++) { // update path endpoints
    if (visibilty > 0) {
      meshes[parent + desc + i].position = path[i];
      meshes[parent + desc + i].scaling = new B.Vector3(1.1 * diameter, 1.1 * diameter, 1.1 * diameter); // make joints slightly larger than bones
    }
    meshes[parent + desc + i].visibility = visibilty;
  }
};

async function drawPose(result: h.NormalizedLandmarkList) {
  for (let i = 0; i < h.POSE_CONNECTIONS.length; i++) {
    const v0 = result?.[h.POSE_CONNECTIONS[i]?.[0]];
    const v1 = result?.[h.POSE_CONNECTIONS[i]?.[1]];
    const path = [new B.Vector3(v0?.x || 0, 1 - (v0?.y || 0), v0?.z || 0), new B.Vector3(v1?.x || 0, 1 - (v1?.y || 0), v1?.z || 0)];
    const visibility = Math.min(v0?.visibility || 0, v1?.visibility || 0);
    drawPath('pose', `-${i}-`, path, visibility);
  }
}

async function connectHands(results: h.Results) {
  let v0 = results.poseLandmarks?.[h.POSE_LANDMARKS.RIGHT_ELBOW];
  let v1 = results.rightHandLandmarks?.[0];
  let path = [new B.Vector3(v0?.x || 0, 1 - (v0?.y || 0), v0?.z || 0), new B.Vector3(v1?.x || 0, 1 - (v1?.y || 0), v1?.z || 0)];
  let visibility = results.poseLandmarks?.[h.POSE_LANDMARKS.RIGHT_ELBOW] && results.rightHandLandmarks?.[0] ? v0?.visibility || 0 : 0;
  drawPath('connect', 'right', path, visibility);
  v0 = results.poseLandmarks?.[h.POSE_LANDMARKS.LEFT_ELBOW];
  v1 = results.leftHandLandmarks?.[0];
  path = [new B.Vector3(v0?.x || 0, 1 - (v0?.y || 0), v0?.z || 0), new B.Vector3(v1?.x || 0, 1 - (v1?.y || 0), v1?.z || 0)];
  visibility = results.poseLandmarks?.[h.POSE_LANDMARKS.LEFT_ELBOW] && results.leftHandLandmarks?.[0] ? v0?.visibility || 0 : 0;
  drawPath('connect', 'left', path, visibility);
}

async function drawHand(result: h.NormalizedLandmarkList, which: 'left' | 'right') {
  for (let i = 0; i < h.HAND_CONNECTIONS.length; i++) {
    const v0 = result?.[h.HAND_CONNECTIONS[i]?.[0]];
    const v1 = result?.[h.HAND_CONNECTIONS[i]?.[1]];
    const path = [new B.Vector3(v0?.x || 0, 1 - (v0?.y || 0), v0?.z || 0), new B.Vector3(v1?.x || 0, 1 - (v1?.y || 0), v1?.z || 0)];
    const visibility = (v0 && v1) ? 1 : 0;
    drawPath(`hand-${which}`, `-${i}-`, path, visibility);
  }
}

export async function drawFace(result: h.NormalizedLandmarkList, smooth = true) {
  if (!result || result.length < 468) {
    if (meshes.face && !meshes.face.isDisposed()) meshes.face.visibility = 0;
    return;
  }
  if (previousSmooth !== smooth) {
    if (meshes.face && !meshes.face.isDisposed()) meshes.face.dispose();
    previousSmooth = smooth;
  }
  if (!meshes.face || meshes.face.isDisposed()) { // create new face
    meshes.face = new B.Mesh('face', t.scene);
    meshes.face.material = t.materialHead;
    meshes.face.material['roughness'] = smooth ? 0.25 : 0.65;
    meshes.face.material['metallic'] = smooth ? 1.0 : 0.65;
    faceVertexData = undefined;
  }
  meshes.face.visibility = 1;

  // use fixed size since iris does not have defined uvmap
  const positions = new Float32Array(3 * 468);
  for (let i = 0; i < 468; i++) { // flatten and invert-y
    positions[3 * i + 0] = result[i].x; // x
    positions[3 * i + 1] = 1 - result[i].y; // y
    positions[3 * i + 2] = result[i].z; // z
  }

  // create vertex buffer if on first access
  if (!faceVertexData) {
    faceVertexData = new B.VertexData();
    faceVertexData.positions = positions;
    faceVertexData.indices = TRI468;
    faceVertexData.uvs = UV468.flat();
    if (smooth) {
      const normals: number[] = [];
      B.VertexData.ComputeNormals(positions, TRI468, normals);
      faceVertexData.normals = normals;
    } else {
      faceVertexData.normals = null;
    }
    faceVertexData.applyToMesh(meshes.face as B.Mesh, true);
  }
  meshes.face.updateVerticesData(B.VertexBuffer.PositionKind, positions, true);
}

export async function draw3D(results: h.Results) {
  connectHands(results);
  drawPose(results.poseLandmarks);
  drawHand(results.leftHandLandmarks, 'left');
  drawHand(results.rightHandLandmarks, 'right');
  drawFace(results.faceLandmarks);
}
