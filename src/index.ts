import * as controls from '@mediapipe/control_utils';
import * as h from '@mediapipe/holistic';
import { webcam } from './webcam';
import { draw2D } from './draw2d';
import { initScene, draw3D } from './draw3d';

const holisticOptions = { modelComplexity: 0, smoothLandmarks: true, refineFaceLandmarks: false, enableFaceGeometry: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 };

const duplicateLandmarks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 16, 17, 18, 19, 20, 21, 22];
const assetResolver = { locateFile: (file) => `../assets/holistic/${file}` }; // `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
const holistic = new h.Holistic(assetResolver);
const dom = {
  webcam: document.getElementById('input-video') as HTMLVideoElement,
  overlay: document.getElementById('output-overlay') as HTMLCanvasElement,
  mesh: document.getElementById('output-mesh') as HTMLCanvasElement,
  fps: new controls.FPS(),
  controls: [
    new controls.Toggle({ title: 'smoothLandmarks', field: 'smoothLandmarks' }),
    new controls.Toggle({ title: 'enableFaceGeometry', field: 'enableFaceGeometry' }),
    new controls.Toggle({ title: 'refineFaceLandmarks', field: 'refineFaceLandmarks' }),
    new controls.Slider({ title: 'minDetectionConfidence', field: 'minDetectionConfidence', range: [0, 1], step: 0.01 }),
    new controls.Slider({ title: 'minTrackingConfidence', field: 'minTrackingConfidence', range: [0, 1], step: 0.01 }),
    new controls.Slider({ title: 'modelComplexity', field: 'modelComplexity', discrete: ['Lite', 'Full', 'Heavy'] }),
  ],
};

function sendRequest() {
  if (!webcam.element || webcam.paused) return;
  dom.fps.tick();
  holistic.send({ image: webcam.element });
}

function onResults(results: h.Results): void {
  // Remove overlapping landmarks from body/face/hand
  for (const duplicate of duplicateLandmarks) delete results.poseLandmarks?.[duplicate];
  draw2D(dom.overlay, results);
  draw3D(results);
  requestAnimationFrame(sendRequest);
}

async function main() {
  await initScene(dom.mesh);
  await holistic.initialize();
  holistic.onResults(onResults);

  const controlsElement = document.getElementsByClassName('control-panel')[0] as HTMLDivElement;
  new controls.ControlPanel(controlsElement, holisticOptions)
    .add([dom.fps, ...dom.controls])
    .on((options) => holistic.setOptions(options as h.Options));

  dom.webcam.onplay = () => {
    dom.overlay.width = webcam.width;
    dom.overlay.height = webcam.height;
    dom.mesh.style.left = `${webcam.width}px`;
    dom.mesh.style.width = `${window.innerWidth - webcam.width}px`;
    // holistic.reset();
    sendRequest();
  };
  await webcam.start({ element: dom.webcam, crop: true, width: window.innerHeight / 2, height: window.innerHeight / 2 });
}

window.onload = main;
