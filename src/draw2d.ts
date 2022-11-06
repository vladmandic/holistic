import * as drawingUtils from '@mediapipe/drawing_utils';
import * as h from '@mediapipe/holistic';
import type { Options } from './options';

let canvas: HTMLCanvasElement;
let options: Options;

export function initDraw2D(outputCanvas: HTMLCanvasElement) {
  canvas = outputCanvas;
}

export function setDraw2dOptions(newOptions) {
  options = newOptions;
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

  // Pose...
  if (options.renderBones) {
    drawingUtils.drawConnectors(ctx, results.poseLandmarks, h.POSE_CONNECTIONS, { color: 'white' });
  }
  if (options.renderJoints) {
    drawingUtils.drawLandmarks(ctx, Object.values(h.POSE_LANDMARKS_LEFT).map((index) => results.poseLandmarks?.[index]), { visibilityMin: 0.65, color: 'rgb(255,138,0)', fillColor: 'rgb(255,138,0)' });
    drawingUtils.drawLandmarks(ctx, Object.values(h.POSE_LANDMARKS_RIGHT).map((index) => results.poseLandmarks?.[index]), { visibilityMin: 0.65, color: 'rgb(0,217,231)', fillColor: 'rgb(0,217,231)' });
  }

  // Hands...
  if (options.renderHands) {
    drawingUtils.drawConnectors(ctx, results.rightHandLandmarks, h.HAND_CONNECTIONS, { color: 'rgb(0,217,231)' });
    drawingUtils.drawLandmarks(ctx, results.rightHandLandmarks, { color: 'rgb(0,217,231)', fillColor: 'rgb(0,217,231)', lineWidth: 2, radius: 8 });
    drawingUtils.drawConnectors(ctx, results.leftHandLandmarks, h.HAND_CONNECTIONS, { color: 'rgb(255,138,0)' });
    drawingUtils.drawLandmarks(ctx, results.leftHandLandmarks, { color: 'rgb(255,138,0)', fillColor: 'rgb(255,138,0)', lineWidth: 2, radius: 8 });
  }

  // Face...
  if (options.renderFace) {
    drawingUtils.drawConnectors(ctx, results.faceLandmarks, h.FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
    drawingUtils.drawConnectors(ctx, results.faceLandmarks, h.FACEMESH_RIGHT_EYE, { color: 'rgb(0,217,231)' });
    drawingUtils.drawConnectors(ctx, results.faceLandmarks, h.FACEMESH_RIGHT_EYEBROW, { color: 'rgb(0,217,231)' });
    drawingUtils.drawConnectors(ctx, results.faceLandmarks, h.FACEMESH_LEFT_EYE, { color: 'rgb(255,138,0)' });
    drawingUtils.drawConnectors(ctx, results.faceLandmarks, h.FACEMESH_LEFT_EYEBROW, { color: 'rgb(255,138,0)' });
    drawingUtils.drawConnectors(ctx, results.faceLandmarks, h.FACEMESH_FACE_OVAL, { color: '#E0E0E0', lineWidth: 5 });
    drawingUtils.drawConnectors(ctx, results.faceLandmarks, h.FACEMESH_LIPS, { color: '#E05050', lineWidth: 5 });
  }
}
