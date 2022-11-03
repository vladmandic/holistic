import * as controls from '@mediapipe/control_utils';
import * as h from '@mediapipe/holistic';
import { video } from './video';
import { initDraw2D, draw2D, setDraw2dOptions } from './draw2d';
import { initDraw3D, draw3D, setDraw3dOptions } from './draw3d';

let options = {
  // model options
  useCpuInference: false,
  modelComplexity: 0,
  smoothLandmarks: true,
  refineFaceLandmarks: true,
  enableFaceGeometry: false,
  minDetectionConfidence: 0.1,
  minTrackingConfidence: 0.3,
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
  baseRadius: 0.04,
  lerpAmount: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 0.5,
  continousFocus: true,
  // sources
  activeSource: 'none',
  sources: [
    { name: 'none', value: 'none' },
    { name: 'webcam', value: 'webcam' },
    { name: 'face', value: '../assets/samples/face.webm' },
    { name: 'streching', value: '../assets/samples/streching.webm' },
    { name: 'yoga', value: '../assets/samples/yoga.webm' },
    { name: 'swimwear', value: '../assets/samples/swimwear.webm' },
  ],
};

// instance of holistic model
const holistic = new h.Holistic({ locateFile: (file) => `../assets/holistic/${file}` }); // `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`

// all dom elements
const dom = {
  input: document.getElementById('input-video') as HTMLVideoElement,
  output2D: document.getElementById('output-overlay') as HTMLCanvasElement,
  output3D: document.getElementById('output-mesh') as HTMLCanvasElement,
  controls: [
    new controls.FPS(),
    new controls.DropDownControl({ title: 'source', field: 'source', options: options.sources }),
    new controls.StaticText({ title: 'model' }),
    new controls.Toggle({ title: 'useCpuInference', field: 'useCpuInference' }),
    new controls.Toggle({ title: 'smoothLandmarks', field: 'smoothLandmarks' }),
    new controls.Toggle({ title: 'enableFaceGeometry', field: 'enableFaceGeometry' }),
    new controls.Toggle({ title: 'refineFaceLandmarks', field: 'refineFaceLandmarks' }),
    new controls.Slider({ title: 'minDetectionConfidence', field: 'minDetectionConfidence', range: [0, 1], step: 0.01 }),
    new controls.Slider({ title: 'minTrackingConfidence', field: 'minTrackingConfidence', range: [0, 1], step: 0.01 }),
    new controls.Slider({ title: 'modelComplexity', field: 'modelComplexity', discrete: ['lite', 'full', 'heavy'] }),
    new controls.StaticText({ title: 'render' }),
    new controls.Toggle({ title: 'continousFocus', field: 'continousFocus' }),
    new controls.Toggle({ title: 'showInspector', field: 'showInspector' }),
    new controls.Toggle({ title: 'renderFace', field: 'renderFace' }),
    new controls.Toggle({ title: 'smoothFace', field: 'smoothFace' }),
    new controls.Toggle({ title: 'connectFace', field: 'connectFace' }),
    new controls.Toggle({ title: 'renderBones', field: 'renderBones' }),
    new controls.Toggle({ title: 'renderJoints', field: 'renderJoints' }),
    new controls.Toggle({ title: 'renderHands', field: 'renderHands' }),
    new controls.Toggle({ title: 'connectHands', field: 'connectHands' }),
    new controls.Toggle({ title: 'renderSurface', field: 'renderSurface' }),
    new controls.Toggle({ title: 'deleteDuplicates', field: 'deleteDuplicates' }),
    new controls.Toggle({ title: 'fixedRadius', field: 'fixedRadius' }),
    new controls.Slider({ title: 'baseRadius', field: 'baseRadius', range: [0.01, 0.20], step: 0.01 }),
    new controls.Slider({ title: 'scaleX', field: 'scaleX', range: [0.1, 2.0], step: 0.01 }),
    new controls.Slider({ title: 'scaleY', field: 'scaleY', range: [0.1, 2.0], step: 0.01 }),
    new controls.Slider({ title: 'scaleZ', field: 'scaleZ', range: [0.1, 2.0], step: 0.01 }),
    new controls.Slider({ title: 'lerpAmount', field: 'lerpAmount', range: [0.0, 1.0], step: 0.01 }),
  ],
};

const log = (...msg) => console.log(...msg); // eslint-disable-line no-console

// send request for processing
function sendRequest() {
  if (dom.input.paused) return;
  (dom.controls[0] as controls.FPS).tick();
  holistic.send({ image: dom.input });
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

async function startSource(src: string) {
  dom.input.onplay = () => {
    dom.output2D.width = video.element?.offsetWidth || video.width;
    dom.output2D.height = video.element?.offsetHeight || video.height;
    dom.output3D.width = window.innerWidth - dom.output2D.width;
    sendRequest(); // send initial processing request when play starts
  };
  await video.stop();
  await initDraw2D(dom.output2D);
  await initDraw3D(dom.output3D, options);
  if (src.includes('.webm') || src.includes('.mp4')) await video.start({ element: dom.input, src });
  else if (src.includes('webcam')) await video.start({ element: dom.input, crop: true, width: window.innerHeight / 2, height: window.innerHeight / 2, src: undefined });
  log('startSource', { source: src });
}

async function main() {
  const controlsElement = document.getElementsByClassName('control-panel')[0] as HTMLDivElement; // create control panel
  new controls.ControlPanel(controlsElement, options)
    .add(dom.controls)
    .on((values) => {
      log('setOptions', values, values.source, options.activeSource);
      if (values.source !== options.activeSource) startSource(values.source as string);
      options = Object.assign(options, values);
      options.activeSource = values['source'] as string;
      holistic.setOptions(options as h.Options);
      setDraw2dOptions(options);
      setDraw3dOptions(options);
    });

  await holistic.initialize();
  log('holistic', { version: h.VERSION });
  holistic.onResults(onResults); // register callback
}

window.onload = main;
