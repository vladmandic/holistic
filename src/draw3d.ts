import '@babylonjs/inspector';
import * as B from '@babylonjs/core';
import * as h from '@mediapipe/holistic';
import { Scene } from './scene';
import { UV468, TRI468 } from './constants';

let t: Scene;
let meshes: Record<string, B.Mesh | B.AbstractMesh> = {};
let faceVertexData: B.VertexData | undefined;
let previousSmooth = false;

let options: Record<string, boolean | number> = {};

class Data {
  pos: Record<string, B.Vector3> = {};
  newPos: Record<string, B.Vector3> = {};
  path: Record<string, B.Vector3[]> = {};
  newPath: Record<string, B.Vector3[]> = {};
  radius: Record<string, number> = {};

  interpolate() {
    for (const key of Object.keys(this.newPos)) {
      if ((options.lerpAmount === 0) || !this.pos[key]) this.pos[key] = this.newPos[key];
      else this.pos[key] = B.Vector3.Lerp(this.pos[key], this.newPos[key], (options.lerpAmount as number));
    }
    for (const key of Object.keys(this.newPath)) {
      if ((options.lerpAmount === 0) || !this.path[key]) this.path[key] = this.newPath[key];
      else {
        for (let i = 0; i < this.newPath[key].length; i++) {
          this.path[key][i] = B.Vector3.Lerp(this.path[key][i], this.newPath[key][i], (options.lerpAmount as number));
        }
      }
    }
  }

  draw() {
    for (const key of Object.keys(this.path)) {
      meshes[key] = B.MeshBuilder.CreateTube(key, { path: this.path[key], radius: this.radius[key], updatable: true, cap: 0, sideOrientation: B.Mesh.DOUBLESIDE, instance: meshes[key] as B.Mesh }, t.scene);
    }
    for (const key of Object.keys(this.pos)) {
      meshes[key].position = this.pos[key];
    }
  }
}
const data = new Data();

const log = (...msg) => console.log(...msg); // eslint-disable-line no-console

const vec = (landmark: h.NormalizedLandmark) => new B.Vector3(landmark?.x || 0, 1 - (landmark?.y || 0), landmark?.z || 0);

const pathLength = (path: Array<B.Vector3>): number => Math.abs(B.Vector3.Distance(path[0], path[path.length - 1]) * 0.1);

const drawPath = (parent: string, desc: string, newPath: B.Vector3[], visibility: number, diameter: number) => {
  if (!meshes[parent]) meshes[parent] = new B.AbstractMesh(parent, t.scene);
  const createBone = (name: string) => {
    meshes[name] = B.MeshBuilder.CreateTube(name, { path: newPath, radius: diameter / 2, updatable: true, cap: 0, sideOrientation: B.Mesh.DOUBLESIDE }, t.scene); // create new tube
    meshes[name].material = t.materialBone;
    meshes[name].parent = meshes[parent];
    t.shadows.addShadowCaster(meshes[parent + desc], false); // add shadow to new tube
  };
  const createJoint = (name: string) => {
    meshes[name] = B.MeshBuilder.CreateSphere(name, { diameter: 1 }, t.scene); // rounded edge for path // diameter is fixed and we change scale later
    meshes[name].material = t.materialJoint;
    meshes[name].parent = meshes[parent];
    meshes[name].renderingGroupId = 1;
    meshes[name].scaling = new B.Vector3(1.1 * diameter, 1.1 * diameter, 1.1 * diameter); // make joints slightly larger than bones
  };

  data.newPath[parent + desc] = newPath;
  const path = data.path[parent + desc] || data.newPath[parent + desc];

  data.radius[parent + desc] = (!options.fixedRadius ? diameter = 0.75 * pathLength(path) + 0.01 : diameter) / 2;
  if (!meshes[parent + desc]) { // pose part seen for the first time
    createBone(parent + desc);
    for (let i = 0; i < path.length; i++) createJoint(parent + desc + i);
  }
  meshes[parent + desc].visibility = visibility;
  meshes[parent + desc].setEnabled(options.renderJoints ? (visibility > 0) : false);
  for (let i = 0; i < path.length; i++) { // update path endpoints
    const jointName = parent + desc + i;
    data.newPos[jointName] = path[i];
    meshes[jointName].visibility = visibility;
    meshes[jointName].setEnabled(options.renderJoints ? (visibility > 0) : false);
  }
};

async function drawRibbon(parent: string, desc: string, path: B.Vector3[][], visibility: number) {
  if (!meshes[parent]) meshes[parent] = new B.AbstractMesh(parent, t.scene);
  const name = parent + '-' + desc;
  if (!meshes[name]) {
    meshes[name] = B.MeshBuilder.CreateRibbon(name, { pathArray: path, closeArray: false, closePath: false, updatable: true, sideOrientation: B.Mesh.DOUBLESIDE }, t.scene);
    meshes[name].parent = meshes[parent];
    meshes[name].material = t.materialBone;
    meshes[name].receiveShadows = true;
    t.shadows.addShadowCaster(meshes[name], false);
  }
  meshes[name] = B.MeshBuilder.CreateRibbon(name, { pathArray: path, closeArray: false, closePath: false, updatable: true, sideOrientation: B.Mesh.DOUBLESIDE, instance: meshes[name] as B.Mesh }, t.scene);
  meshes[name].visibility = visibility;
  meshes[name].setEnabled(options.renderSurface ? (visibility > 0) : false);
}

async function drawTorso(result: h.NormalizedLandmarkList) {
  const visibility = options.renderBones ? 0.8 : 0;
  const verticals = [ // torso
    [vec(result?.[h.POSE_LANDMARKS.LEFT_SHOULDER]), vec(result?.[h.POSE_LANDMARKS.LEFT_HIP])],
    [vec(result?.[h.POSE_LANDMARKS.RIGHT_SHOULDER]), vec(result?.[h.POSE_LANDMARKS.RIGHT_HIP])],
  ];
  drawRibbon('pose', 'torso', verticals, visibility);
}

async function createPose(result: h.NormalizedLandmarkList) {
  for (let i = 0; i < h.POSE_CONNECTIONS.length; i++) {
    const v0 = result?.[h.POSE_CONNECTIONS[i]?.[0]];
    const v1 = result?.[h.POSE_CONNECTIONS[i]?.[1]];
    const path = [vec(v0), vec(v1)];
    const visibility = Math.min(v0?.visibility || 0, v1?.visibility || 0);
    drawPath('pose', `-${i}-`, path, visibility, 0.08);
  }
}

async function drawPalm(result: h.NormalizedLandmarkList, which: 'left' | 'right') {
  const visibility = (options.renderHands && result?.[0] && result?.[5] && result?.[17]) ? 0.4 : 0;
  const verticals = [ // palm triangle
    [vec(result?.[0]), vec(result?.[5])],
    [vec(result?.[0]), vec(result?.[17])],
  ];
  drawRibbon(`hand-${which}`, 'palm', verticals, visibility);
}

async function createHand(result: h.NormalizedLandmarkList, which: 'left' | 'right') {
  for (let i = 0; i < h.HAND_CONNECTIONS.length; i++) {
    const v0 = result?.[h.HAND_CONNECTIONS[i]?.[0]];
    const v1 = result?.[h.HAND_CONNECTIONS[i]?.[1]];
    const path = [vec(v0), vec(v1)];
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
    previousSmooth = options.smoothFace as boolean;
  }
  if (!meshes.face || meshes.face.isDisposed()) { // create new face
    meshes.face = new B.Mesh('face', t.scene);
    meshes.face.renderingGroupId = 2;
    meshes.face.material = t.materialHead;
    meshes.face.material['roughness'] = options.smoothFace ? 0.25 : 0.65;
    meshes.face.material['metallic'] = options.smoothFace ? 1.0 : 0.65;
    meshes.face.alwaysSelectAsActiveMesh = true;
    faceVertexData = undefined;
  }
  meshes.face.visibility = 1;

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
    data.newPos['hand-right'] = options.connectHands ? new B.Vector3(0, 0, wrist?.z || 0) : new B.Vector3(0, 0, 0);
  }
  if (meshes['hand-left']) {
    const wrist = result?.[h.POSE_LANDMARKS.LEFT_WRIST];
    data.newPos['hand-left'] = options.connectHands ? new B.Vector3(0, 0, wrist?.z || 0) : new B.Vector3(0, 0, 0);
  }
}

async function repositionFace(result: h.NormalizedLandmarkList) {
  const nose = result?.[h.POSE_LANDMARKS.NOSE];
  if (!meshes['face'] || !meshes['pose-9-'] || !nose) return;
  const noseVec = new B.Vector3(nose.x || 0, 1 - (nose.y || 0), nose.z || 0);
  const centerShouldersVec = meshes['pose-9-'].getBoundingInfo().boundingBox.center;
  noseVec.addInPlace(centerShouldersVec);
  noseVec.divideInPlace(new B.Vector3(2, 2, 4));
  data.newPos['face'] = new B.Vector3(0, 0, options.connectFace ? noseVec.z : 0);
  drawPath('neck', 'line', [noseVec, centerShouldersVec], 1, 0.1);
}

function performRender() {
  data.interpolate();
  data.draw();
}

export function setDraw3dOptions(newOptions) {
  options = Object.assign(options, newOptions);
  if (!t?.scene) return;
  if (newOptions.showInspector) t.scene.debugLayer.show({ embedMode: true, overlay: true, showExplorer: true, showInspector: true, handleResize: true, enablePopup: false, enableClose: false });
  else t.scene.debugLayer.hide();
  const inspector = document.getElementById('embed-host');
  if (inspector) inspector.style.cssText = 'left: 0; width: fit-content';
}

export function initDraw3D(canvasOutput: HTMLCanvasElement, newOptions) {
  if (!t) t = new Scene(canvasOutput);
  for (const mesh of Object.values(meshes)) mesh.dispose();
  meshes = {};
  setDraw3dOptions(newOptions);
  t.scene.registerBeforeRender(() => performRender());
  log('initScene', t);
  setInterval(() => log('rendering', { averageFps: t.engine.performanceMonitor.averageFPS }), 5000);
  // setInterval(() => t.scene.render(), 200);
}

export async function draw3D(results: h.Results) {
  createPose(results.poseLandmarks);
  drawTorso(results.poseLandmarks);
  createHand(results.leftHandLandmarks, 'left');
  createHand(results.rightHandLandmarks, 'right');
  drawPalm(results.leftHandLandmarks, 'left');
  drawPalm(results.rightHandLandmarks, 'right');
  repositionHands(results.poseLandmarks);
  drawFace(results.faceLandmarks);
  repositionFace(results.poseLandmarks);
}
