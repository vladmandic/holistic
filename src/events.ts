import * as B from '@babylonjs/core';
import { log } from './util';
import type { Scene } from './scene';

let registered = false;
let activeMesh: B.Mesh | undefined;
let original: { enabled: boolean, color: B.Color3 };
const overlay = B.Color3.FromHexString('#FF1010');

function pointerDown(pointerInfo: B.PointerInfo) {
  if (!pointerInfo.pickInfo?.pickedMesh) return;
  activeMesh = pointerInfo.pickInfo?.pickedMesh as B.Mesh;
  let select = false;
  if (!overlay.equals(activeMesh.overlayColor) || !activeMesh.overlayColor) {
    select = true;
    original = { enabled: activeMesh.renderOverlay, color: activeMesh.overlayColor };
    activeMesh.overlayColor = overlay;
    activeMesh.renderOverlay = true;
  } else if (original) {
    activeMesh.overlayColor = original.color;
    activeMesh.renderOverlay = original.enabled;
  }
  const vec = activeMesh.getBoundingInfo().boundingBox.vectors;
  const angle = B.Vector3.PitchYawRollToMoveBetweenPoints(vec[0], vec[7]); // tbd which vectors to pick
  log('pointer', { select, type: pointerInfo.type, mesh: pointerInfo.pickInfo?.pickedMesh?.name, angle });
}

export async function initEvents(scene: Scene) {
  if (registered) return;
  registered = true;
  scene.scene.onPointerObservable.add((pointerInfo) => {
    switch (pointerInfo.type) {
      case B.PointerEventTypes.POINTERDOWN: pointerDown(pointerInfo); break;
      // case B.PointerEventTypes.POINTERDOUBLETAP: pointerDoubleTap(); break;
      // case B.PointerEventTypes.POINTERUP: pointerUp(); break;
      // case B.PointerEventTypes.POINTERMOVE: pointerMove(pointerInfo); break;
      // case B.PointerEventTypes.POINTERWHEEL: pointerWheel(pointerInfo); break;
      default: break;
    }
  });
}
