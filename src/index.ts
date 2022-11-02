import * as controls from '@mediapipe/control_utils';
import * as h from '@mediapipe/holistic';
import { webcam } from './webcam';
import { initDraw2D, draw2D, setDraw2dOptions } from './draw2d';
import { initDraw3D, draw3D, setDraw3dOptions } from './draw3d';

let options = {
  // model options
  modelComplexity: 0,
  smoothLandmarks: true,
  refineFaceLandmarks: true,
  enableFaceGeometry: false,
  minDetectionConfidence: 0.2,
  minTrackingConfidence: 0.5,
  // render options
  showInspector: false,
  renderFace: true,
  connectFace: true,
  smoothFace: false,
  renderBones: true,
  renderJoints: true,
  renderHands: true,
  renderSurface: true,
  connectHands: true,
  deleteDuplicates: true,
  fixedRadius: true,
  lerpAmount: 0,
};

// instance of holistic model
const holistic = new h.Holistic({ locateFile: (file) => `../assets/holistic/${file}` }); // `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`

// all dom elements
const dom = {
  webcam: document.getElementById('input-video') as HTMLVideoElement,
  overlay: document.getElementById('output-overlay') as HTMLCanvasElement,
  mesh: document.getElementById('output-mesh') as HTMLCanvasElement,
  controls: [
    new controls.FPS(),
    new controls.StaticText({ title: 'model' }),
    new controls.Toggle({ title: 'smoothLandmarks', field: 'smoothLandmarks' }),
    new controls.Toggle({ title: 'enableFaceGeometry', field: 'enableFaceGeometry' }),
    new controls.Toggle({ title: 'refineFaceLandmarks', field: 'refineFaceLandmarks' }),
    new controls.Slider({ title: 'minDetectionConfidence', field: 'minDetectionConfidence', range: [0, 1], step: 0.01 }),
    new controls.Slider({ title: 'minTrackingConfidence', field: 'minTrackingConfidence', range: [0, 1], step: 0.01 }),
    new controls.Slider({ title: 'modelComplexity', field: 'modelComplexity', discrete: ['lite', 'full', 'heavy'] }),
    new controls.StaticText({ title: 'render' }),
    new controls.Toggle({ title: 'showInspector', field: 'showInspector' }),
    new controls.Toggle({ title: 'renderFace', field: 'renderFace' }),
    new controls.Toggle({ title: 'smoothFace', field: 'smoothFace' }),
    new controls.Toggle({ title: 'connectFace', field: 'connectFace' }),
    new controls.Toggle({ title: 'renderBones', field: 'renderBones' }),
    new controls.Toggle({ title: 'renderJoints', field: 'renderJoints' }),
    new controls.Toggle({ title: 'renderHands', field: 'renderHands' }),
    new controls.Toggle({ title: 'renderSurface', field: 'renderSurface' }),
    new controls.Toggle({ title: 'connectHands', field: 'connectHands' }),
    new controls.Toggle({ title: 'deleteDuplicates', field: 'deleteDuplicates' }),
    new controls.Toggle({ title: 'fixedRadius', field: 'fixedRadius' }),
    new controls.Slider({ title: 'lerpAmount', field: 'lerpAmount', range: [0, 1], step: 0.01 }),
  ],
};

const log = (...msg) => console.log(...msg); // eslint-disable-line no-console

// send request for processing
function sendRequest() {
  if (!webcam.element || webcam.paused) return;
  (dom.controls[0] as controls.FPS).tick();
  holistic.send({ image: webcam.element });
}

// receive response from processing
function onResults(results: h.Results): void {
  if (options.deleteDuplicates) {
    const duplicateLandmarks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 17, 18, 19, 20, 21, 22];
    for (const duplicate of duplicateLandmarks) delete results.poseLandmarks?.[duplicate]; // temove overlapping landmarks from body/face/hand
  }
  draw2D(results);
  draw3D(results);
  requestAnimationFrame(sendRequest);
}

async function main() {
  const controlsElement = document.getElementsByClassName('control-panel')[0] as HTMLDivElement; // create control panel
  new controls.ControlPanel(controlsElement, options)
    .add(dom.controls)
    .on((values) => {
      log('setOptions', values);
      options = Object.assign(options, values);
      holistic.setOptions(options as h.Options);
      setDraw2dOptions(options);
      setDraw3dOptions(options);
    });

  await initDraw2D(dom.overlay);
  await initDraw3D(dom.mesh, options);
  await holistic.initialize();
  log('holistic', { version: h.VERSION });
  holistic.onResults(onResults); // register callback

  dom.webcam.onplay = () => {
    dom.overlay.width = webcam.width;
    dom.overlay.height = webcam.height;
    dom.mesh.style.left = `${webcam.width}px`;
    dom.mesh.style.width = `${window.innerWidth - webcam.width}px`;
    sendRequest(); // send initial processing request when play starts
  };
  await webcam.start({ element: dom.webcam, crop: true, width: window.innerHeight / 2, height: window.innerHeight / 2 }); // start webcam
}

window.onload = main;
