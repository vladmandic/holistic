import '@babylonjs/inspector';
import * as B from '@babylonjs/core';
import * as h from '@mediapipe/holistic';
import { Scene } from './scene';
import { UV468, TRI468 } from './constants';

let t: Scene;
let meshes: Record<string, B.Mesh | B.AbstractMesh> = {};
let faceVertexData: B.VertexData | undefined;
let previousSmooth = false;

let options: Record<string, boolean> = {};

const log = (...msg) => console.log(...msg); // eslint-disable-line no-console

export function initDraw3D(canvasOutput: HTMLCanvasElement, newOptions) {
  if (!t) t = new Scene(canvasOutput);
  for (const mesh of Object.values(meshes)) mesh.dispose();
  meshes = {};
  options = Object.assign(options, newOptions);
  log('initScene', t);
}

export function setDraw3dOptions(newOptions) {
  options = Object.assign(options, newOptions);
  if (!t?.scene) return;
  if (newOptions.showInspector) t.scene.debugLayer.show({ embedMode: true, overlay: true, showExplorer: true, showInspector: true, handleResize: true, enablePopup: false, enableClose: false });
  else t.scene.debugLayer.hide();
  const inspector = document.getElementById('embed-host');
  if (inspector) inspector.style.cssText = 'left: 0; width: fit-content';
}

const pathLength = (path: Array<B.Vector3>): number => Math.abs(B.Vector3.Distance(path[0], path[path.length - 1]) * 0.1);

const drawPath = (parent: string, desc: string, path: Array<B.Vector3>, visibility: number, diameter: number) => {
  if (!options.fixedRadius) diameter = 0.75 * pathLength(path) + 0.01;
  if (!meshes[parent]) meshes[parent] = new B.AbstractMesh(parent, t.scene);
  if (!meshes[parent + desc]) { // pose part seen for the first time
    meshes[parent + desc] = B.MeshBuilder.CreateTube(parent + desc, { path, radius: diameter / 2, updatable: true, cap: 0, sideOrientation: B.Mesh.DOUBLESIDE }, t.scene); // create new tube
    meshes[parent + desc].material = t.materialBone;
    meshes[parent + desc].parent = meshes[parent];
    t.shadows.addShadowCaster(meshes[parent + desc], false); // add shadow to new tube
    for (let i = 0; i < path.length; i++) {
      meshes[parent + desc + i] = B.MeshBuilder.CreateSphere(parent + desc + i, { diameter: 1 }, t.scene); // rounded edge for path // diameter is fixed and we change scale later
      meshes[parent + desc + i].material = t.materialJoint;
      meshes[parent + desc + i].parent = meshes[parent];
      meshes[parent + desc + i].renderingGroupId = 1;
      // t.shadows.addShadowCaster(meshes[parent + desc + i], false);
    }
  }
  if (visibility > 0) meshes[parent + desc] = B.MeshBuilder.CreateTube(parent + desc, { path, radius: diameter / 2, updatable: true, cap: 0, sideOrientation: B.Mesh.DOUBLESIDE, instance: meshes[parent + desc] as B.Mesh }, t.scene); // update existing tube
  meshes[parent + desc].visibility = options.renderBones ? visibility : 0;
  meshes[parent + desc].setEnabled(visibility > 0);
  for (let i = 0; i < path.length; i++) { // update path endpoints
    if (visibility > 0) {
      meshes[parent + desc + i].position = path[i];
      meshes[parent + desc + i].scaling = new B.Vector3(1.1 * diameter, 1.1 * diameter, 1.1 * diameter); // make joints slightly larger than bones
    }
    meshes[parent + desc + i].visibility = options.renderJoints ? visibility : 0;
    meshes[parent + desc + i].setEnabled(visibility > 0);
  }
};

async function drawPolygon(parent: string, desc: string, result: h.NormalizedLandmarkList, idx: [number, number][], visibility: number) {
  if (!meshes[parent]) meshes[parent] = new B.AbstractMesh(parent, t.scene);
  const points: h.NormalizedLandmark[] = [];
  for (const i of idx) {
    const v0 = result?.[i?.[0]] || 0;
    const v1 = result?.[i?.[1]] || 0;
    if (!v0 || !v1) visibility = 0;
    points.push(v0, v1);
  }
  if (idx.length < 3) points.push(...points, ...points, ...points); // create triangles
  const positions = points.map((pt) => [pt.x, 1 - pt.y, pt.z]).flat();
  if (!meshes[parent + desc]) {
    meshes[parent + desc] = new B.Mesh(parent + desc, t.scene);
    meshes[parent + desc].parent = meshes[parent];
    meshes[parent + desc].material = t.materialFlat;
    // t.shadows.addShadowCaster(meshes[parent + desc], false);
    const indices: number[] = [];
    const normals = [];
    for (let i = 0; i < positions.length / 3; i++) indices.push(i);
    const vertexData = new B.VertexData();
    B.VertexData.ComputeNormals(positions, indices, normals);
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.applyToMesh(meshes[parent + desc] as B.Mesh, true);
  }
  meshes[parent + desc].updateVerticesData(B.VertexBuffer.PositionKind, positions, true);
  meshes[parent + desc].visibility = visibility;
  meshes[parent + desc].setEnabled(visibility > 0);
}

async function drawTorso(result: h.NormalizedLandmarkList) {
  const visibility = options.renderBones ? 0.4 : 0;
  drawPolygon('pose', 'torso', result, [h.POSE_CONNECTIONS[22], h.POSE_CONNECTIONS[23]], visibility);
}

async function drawPose(result: h.NormalizedLandmarkList) {
  for (let i = 0; i < h.POSE_CONNECTIONS.length; i++) {
    const v0 = result?.[h.POSE_CONNECTIONS[i]?.[0]];
    const v1 = result?.[h.POSE_CONNECTIONS[i]?.[1]];
    const path = [new B.Vector3(v0?.x || 0, 1 - (v0?.y || 0), v0?.z || 0), new B.Vector3(v1?.x || 0, 1 - (v1?.y || 0), v1?.z || 0)];
    const visibility = Math.min(v0?.visibility || 0, v1?.visibility || 0);
    drawPath('pose', `-${i}-`, path, visibility, 0.08);
  }
}

async function drawPalm(result: h.NormalizedLandmarkList, which: 'left' | 'right') {
  const visibility = options.renderHands ? 0.4 : 0;
  drawPolygon(`hand-${which}`, 'palm', result, [h.HAND_CONNECTIONS[4], h.HAND_CONNECTIONS[17]], visibility);
}

async function drawHand(result: h.NormalizedLandmarkList, which: 'left' | 'right') {
  for (let i = 0; i < h.HAND_CONNECTIONS.length; i++) {
    const v0 = result?.[h.HAND_CONNECTIONS[i]?.[0]];
    const v1 = result?.[h.HAND_CONNECTIONS[i]?.[1]];
    const path = [new B.Vector3(v0?.x || 0, 1 - (v0?.y || 0), v0?.z || 0), new B.Vector3(v1?.x || 0, 1 - (v1?.y || 0), v1?.z || 0)];
    const visibility = (v0 && v1 && options.renderHands) ? 1 : 0;
    drawPath(`hand-${which}`, `-${i}-`, path, visibility, 0.04);
  }
}

async function drawFace(result: h.NormalizedLandmarkList) {
  if (!result || (result.length < 468) || !options.renderFace) {
    if (meshes.face && !meshes.face.isDisposed()) meshes.face.visibility = 0;
    return;
  }
  if (previousSmooth !== options.smoothFace) {
    if (meshes.face && !meshes.face.isDisposed()) meshes.face.dispose();
    previousSmooth = options.smoothFace;
  }
  if (!meshes.face || meshes.face.isDisposed()) { // create new face
    meshes.face = new B.Mesh('face', t.scene);
    meshes.face.renderingGroupId = 2;
    meshes.face.material = t.materialHead;
    meshes.face.material['roughness'] = options.smoothFace ? 0.25 : 0.65;
    meshes.face.material['metallic'] = options.smoothFace ? 1.0 : 0.65;
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
    if (options.smoothFace) {
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

async function repositionHands(result: h.NormalizedLandmarkList) {
  if (meshes['hand-right']) {
    const wrist = result?.[h.POSE_LANDMARKS.RIGHT_WRIST];
    meshes['hand-right'].position = new B.Vector3(0, 0, options.connectHands ? (wrist?.z || 0) : 0);
  }
  if (meshes['hand-left']) {
    const wrist = result?.[h.POSE_LANDMARKS.LEFT_WRIST];
    meshes['hand-left'].position = new B.Vector3(0, 0, options.connectHands ? (wrist?.z || 0) : 0);
  }
  /*
  let v0 = results.poseLandmarks?.[h.POSE_LANDMARKS.RIGHT_ELBOW];
  let v1 = results.rightHandLandmarks?.[0];
  let path = [new B.Vector3(v0?.x || 0, 1 - (v0?.y || 0), v0?.z || 0), new B.Vector3(v1?.x || 0, 1 - (v1?.y || 0), v1?.z || 0 + meshes['hand-right'].position.z)];
  let visibility = results.poseLandmarks?.[h.POSE_LANDMARKS.RIGHT_ELBOW] && results.rightHandLandmarks?.[0] ? v0?.visibility || 0 : 0;
  drawPath('connect', 'right', path, visibility, 0.1);
  v0 = results.poseLandmarks?.[h.POSE_LANDMARKS.LEFT_ELBOW];
  v1 = results.leftHandLandmarks?.[0];
  path = [new B.Vector3(v0?.x || 0, 1 - (v0?.y || 0), v0?.z || 0), new B.Vector3(v1?.x || 0, 1 - (v1?.y || 0), v1?.z || 0)];
  visibility = results.poseLandmarks?.[h.POSE_LANDMARKS.LEFT_ELBOW] && results.leftHandLandmarks?.[0] ? v0?.visibility || 0 : 0;
  drawPath('connect', 'left', path, visibility, 0.06);
  */
}

async function repositionFace(result: h.NormalizedLandmarkList) {
  const nose = result?.[h.POSE_LANDMARKS.NOSE];
  if (!meshes['face'] || !meshes['pose-9-'] || !nose) return;
  const noseVec = new B.Vector3(nose.x || 0, 1 - (nose.y || 0), nose.z || 0);
  const centerShouldersVec = meshes['pose-9-'].getBoundingInfo().boundingBox.center;
  noseVec.addInPlace(centerShouldersVec);
  noseVec.divideInPlace(new B.Vector3(2, 2, 4));
  meshes['face'].position = new B.Vector3(0, 0, options.connectFace ? noseVec.z : 0);
  drawPath('neck', 'line', [noseVec, centerShouldersVec], 1, 0.1);
}

export async function draw3D(results: h.Results) {
  drawPose(results.poseLandmarks);
  drawTorso(results.poseLandmarks);
  drawHand(results.leftHandLandmarks, 'left');
  drawHand(results.rightHandLandmarks, 'right');
  drawPalm(results.leftHandLandmarks, 'left');
  drawPalm(results.rightHandLandmarks, 'right');
  repositionHands(results.poseLandmarks);
  drawFace(results.faceLandmarks);
  repositionFace(results.poseLandmarks);
}
