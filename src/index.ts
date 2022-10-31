/* eslint-disable @typescript-eslint/no-non-null-assertion */

import * as controls from '@mediapipe/control_utils';
import * as drawingUtils from '@mediapipe/drawing_utils';
import * as h from '@mediapipe/holistic';

// const config = { locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}` };
const config = { locateFile: (file) => `../assets/holistic/${file}` };
const duplicateLandmarks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 16, 17, 18, 19, 20, 21, 22];
const canvasElement = document.getElementsByClassName('output-canvas')[0] as HTMLCanvasElement;
const ctx = canvasElement.getContext('2d')!;
const fps = new controls.FPS();

function connectHands(connector: [h.NormalizedLandmark, h.NormalizedLandmark]): void {
  const from = connector[0];
  const to = connector[1];
  if (from && to) {
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(from.x * canvasElement.width, from.y * canvasElement.height);
    ctx.lineTo(to.x * canvasElement.width, to.y * canvasElement.height);
    ctx.stroke();
  }
}

function onResults(results: h.Results): void {
  // Remove overlapping landmarks from body/face/hand
  for (const duplicate of duplicateLandmarks) delete results.poseLandmarks?.[duplicate];

  // Update the frame rate.
  fps.tick();

  // Draw the overlays.
  ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  ctx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  // Connect elbows to hands...
  if (results.poseLandmarks && results.rightHandLandmarks) connectHands([results.poseLandmarks[h.POSE_LANDMARKS.RIGHT_ELBOW], results.rightHandLandmarks[0]]);
  if (results.poseLandmarks && results.leftHandLandmarks) connectHands([results.poseLandmarks[h.POSE_LANDMARKS.LEFT_ELBOW], results.leftHandLandmarks[0]]);

  // Pose...
  drawingUtils.drawConnectors(ctx, results.poseLandmarks, h.POSE_CONNECTIONS, { color: 'white' });
  drawingUtils.drawLandmarks(ctx, Object.values(h.POSE_LANDMARKS_LEFT).map((index) => results.poseLandmarks?.[index]), { visibilityMin: 0.65, color: 'rgb(255,138,0)', fillColor: 'rgb(255,138,0)' });
  drawingUtils.drawLandmarks(ctx, Object.values(h.POSE_LANDMARKS_RIGHT).map((index) => results.poseLandmarks?.[index]), { visibilityMin: 0.65, color: 'rgb(0,217,231)', fillColor: 'rgb(0,217,231)' });

  // Hands...
  drawingUtils.drawConnectors(ctx, results.rightHandLandmarks, h.HAND_CONNECTIONS, { color: 'rgb(0,217,231)' });
  drawingUtils.drawLandmarks(ctx, results.rightHandLandmarks, { color: 'rgb(0,217,231)', fillColor: 'rgb(0,217,231)', lineWidth: 2, radius: 8 });
  drawingUtils.drawConnectors(ctx, results.leftHandLandmarks, h.HAND_CONNECTIONS, { color: 'rgb(255,138,0)' });
  drawingUtils.drawLandmarks(ctx, results.leftHandLandmarks, { color: 'rgb(255,138,0)', fillColor: 'rgb(255,138,0)', lineWidth: 2, radius: 8 });

  // Face...
  drawingUtils.drawConnectors(ctx, results.faceLandmarks, h.FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
  drawingUtils.drawConnectors(ctx, results.faceLandmarks, h.FACEMESH_RIGHT_EYE, { color: 'rgb(0,217,231)' });
  drawingUtils.drawConnectors(ctx, results.faceLandmarks, h.FACEMESH_RIGHT_EYEBROW, { color: 'rgb(0,217,231)' });
  drawingUtils.drawConnectors(ctx, results.faceLandmarks, h.FACEMESH_LEFT_EYE, { color: 'rgb(255,138,0)' });
  drawingUtils.drawConnectors(ctx, results.faceLandmarks, h.FACEMESH_LEFT_EYEBROW, { color: 'rgb(255,138,0)' });
  drawingUtils.drawConnectors(ctx, results.faceLandmarks, h.FACEMESH_FACE_OVAL, { color: '#E0E0E0', lineWidth: 5 });
  drawingUtils.drawConnectors(ctx, results.faceLandmarks, h.FACEMESH_LIPS, { color: '#E05050', lineWidth: 5 });
}

async function main() {
  // Resize Canvas...
  canvasElement.width = window.innerWidth;
  canvasElement.height = window.innerHeight;

  // Init Holistic...
  const holistic = new h.Holistic(config);
  await holistic.initialize();
  holistic.onResults(onResults);

  // Create Menu...
  const ctrls = [
    new controls.Toggle({ title: 'smoothLandmarks', field: 'smoothLandmarks' }),
    new controls.Toggle({ title: 'enableFaceGeometry', field: 'enableFaceGeometry' }),
    new controls.Toggle({ title: 'refineFaceLandmarks', field: 'refineFaceLandmarks' }),
    new controls.Slider({ title: 'minDetectionConfidence', field: 'minDetectionConfidence', range: [0, 1], step: 0.01 }),
    new controls.Slider({ title: 'minTrackingConfidence', field: 'minTrackingConfidence', range: [0, 1], step: 0.01 }),
    new controls.Slider({ title: 'modelComplexity', field: 'modelComplexity', discrete: ['Lite', 'Full', 'Heavy'] }),
  ];
  const source = new controls.SourcePicker({
    onSourceChanged: () => holistic.reset(),
    onFrame: (image: controls.InputImage) => holistic.send({ image }),
  });

  const controlsElement = document.getElementsByClassName('control-panel')[0] as HTMLDivElement;
  new controls.ControlPanel(controlsElement, { modelComplexity: 0, smoothLandmarks: true, refineFaceLandmarks: false, enableFaceGeometry: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 })
    .add([fps, source, ...ctrls])
    .on((options) => holistic.setOptions(options as h.Options));
}

window.onload = main;
