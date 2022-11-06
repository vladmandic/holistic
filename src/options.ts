export const options = {
  // model options
  useCpuInference: false,
  cameraFar: 0,
  cameraNear: 0,
  cameraVerticalFovDegrees: 0,
  modelComplexity: 0,
  smoothLandmarks: false,
  refineFaceLandmarks: false,
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
  extendPath: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 0.35,
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

export type Options = typeof options;
