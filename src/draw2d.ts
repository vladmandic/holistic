import * as drawingUtils from '@mediapipe/drawing_utils';
import * as h from '@mediapipe/holistic';

let canvas: HTMLCanvasElement;
let options: Record<string, boolean> = {};

function connectHands(ctx, connector: [h.NormalizedLandmark, h.NormalizedLandmark], width: number, height: number): void {
  const from = connector[0];
  const to = connector[1];
  if (from && to) {
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(from.x * width, from.y * height);
    ctx.lineTo(to.x * width, to.y * height);
    ctx.stroke();
  }
}

export function initDraw2D(outputCanvas: HTMLCanvasElement) {
  canvas = outputCanvas;
}

export function setDraw2dOptions(newOptions) {
  options = Object.assign(options, newOptions);
}

export function draw2D(results: h.Results): void {
  // Draw the overlays.
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.save();
  ctx.fillStyle = '#FFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'luminosity';
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Connect elbows to hands...
  if (results.poseLandmarks && results.rightHandLandmarks) connectHands(ctx, [results.poseLandmarks[h.POSE_LANDMARKS.RIGHT_ELBOW], results.rightHandLandmarks[0]], canvas.width, canvas.height);
  if (results.poseLandmarks && results.leftHandLandmarks) connectHands(ctx, [results.poseLandmarks[h.POSE_LANDMARKS.LEFT_ELBOW], results.leftHandLandmarks[0]], canvas.width, canvas.height);

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
