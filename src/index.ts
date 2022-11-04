import * as controls from '@mediapipe/control_utils';
import * as h from '@mediapipe/holistic';
import { options } from './options';
import { log } from './util';
import { video } from './video';
import { initDraw2D, draw2D, setDraw2dOptions } from './draw2d';
import { initDraw3D, draw3D, setDraw3dOptions } from './draw3d';

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

// send request for processing
let lastRequestTime = -1;
function sendRequest() {
  if ((dom.input.readyState < 2) || (dom.input.videoWidth === 0)) return; // not ready
  if (dom.input.paused && (lastRequestTime === dom.input.currentTime)) return; // no change
  (dom.controls[0] as controls.FPS).tick();
  lastRequestTime = dom.input.currentTime;
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

function resizeOutput() {
  dom.output2D.width = video.element?.offsetWidth || video.width;
  dom.output2D.height = video.element?.offsetHeight || video.height;
  dom.output3D.width = window.innerWidth - dom.output2D.width;
  initDraw2D(dom.output2D);
  initDraw3D(dom.output3D, options);
}

async function startSource(src: string) {
  dom.input.onplay = () => {
    log('play', { source: options.activeSource, resolution: [dom.input.width, dom.input.height], time: dom.input.currentTime });
    resizeOutput();
    sendRequest(); // send initial processing request when play starts
  };
  dom.input.onseeked = () => {
    log('seek', { time: dom.input.currentTime });
    sendRequest();
  };
  await video.stop();
  await initDraw2D(dom.output2D);
  await initDraw3D(dom.output3D, options);
  log('startSource', { source: src });
  if (src.includes('.webm') || src.includes('.mp4')) await video.start({ element: dom.input, width: window.innerHeight / 2, height: window.innerHeight / 2, src });
  else if (src.includes('webcam')) await video.start({ element: dom.input, crop: true, width: window.innerHeight / 2, height: window.innerHeight / 2, src: undefined });
}

async function warmup() {
  return new Promise((resolve) => {
    const ms = new Date().getTime();
    const image = document.createElement('canvas') as HTMLCanvasElement;
    image.width = 100;
    image.height = 100;
    holistic.onResults(() => resolve(new Date().getTime() - ms));
    holistic.send({ image });
  });
}

async function main() {
  const controlsElement = document.getElementsByClassName('control-panel')[0] as HTMLDivElement; // create control panel
  new controls.ControlPanel(controlsElement, options)
    .add(dom.controls)
    .on((values) => {
      log('setOptions', values, values.source, options.activeSource);
      if (values.source !== options.activeSource) startSource(values.source as string);
      Object.assign(options, values);
      options.activeSource = values['source'] as string;
      holistic.setOptions(options as h.Options);
      setDraw2dOptions(options);
      setDraw3dOptions(options);
    });
  resizeOutput();
  await holistic.initialize();
  log('holistic', { version: h.VERSION });
  const time = await warmup();
  log('holistic', { warmup: time });
  holistic.onResults(onResults); // register callback
  window.onresize = () => resizeOutput();
}

window.onload = main;
