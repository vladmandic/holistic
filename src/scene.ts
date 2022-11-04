import * as B from '@babylonjs/core';
import * as M from '@babylonjs/materials';
import { log, sleep } from './util';

export class Scene {
  engine: B.Engine;
  canvas: HTMLCanvasElement;
  scene: B.Scene;
  material: M.PBRCustomMaterial;
  pipeline: B.DefaultRenderingPipeline;
  camera: B.ArcRotateCamera;
  light: B.DirectionalLight;
  ambient: B.HemisphericLight;
  shadows: B.ShadowGenerator;
  environment: B.EnvironmentHelper;
  skybox: B.Mesh | undefined;
  ground: B.Mesh | undefined;
  // highlight: B.HighlightLayer;

  async inspector(showInspector: boolean) {
    if (!this.scene) return;
    B.DebugLayer.InspectorURL = '../dist/inspector.js';
    if (showInspector) this.scene.debugLayer.show({ embedMode: true, overlay: true, showExplorer: true, showInspector: true, handleResize: true, enablePopup: false, enableClose: false });
    else this.scene.debugLayer.hide();
    await sleep(500);
    const inspector = document.getElementById('embed-host');
    if (inspector) inspector.style.cssText = 'left: 0; width: fit-content';
  }

  constructor(outputCanvas: HTMLCanvasElement) {
    this.canvas = outputCanvas;
    // engine & scene
    this.engine = new B.Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      disableWebGL2Support: false,
      doNotHandleContextLost: true,
      autoEnableWebVR: false,
      audioEngine: false,
      useHighPrecisionFloats: false,
      useHighPrecisionMatrix: false,
      failIfMajorPerformanceCaveat: false,
    });
    this.engine.enableOfflineSupport = false;
    B.Animation.AllowMatricesInterpolation = true;
    this.scene = new B.Scene(this.engine);
    this.scene.clearCachedVertexData();
    this.material = new M.PBRCustomMaterial('material', this.scene);
    this.material.metallic = 1.0;
    this.material.roughness = 0.15;
    this.material.alpha = 1.0;
    this.material.metallicF0Factor = 0;
    this.material.albedoColor = B.Color3.FromHexString('#FFF4B8');
    this.material.useRadianceOcclusion = false;
    this.material.directIntensity = 0;
    // this.materialJoint.freeze();
    // camera
    this.camera = new B.ArcRotateCamera('camera', 0, 0, 1, new B.Vector3(1, 0, 0), this.scene);
    this.camera.attachControl(this.canvas, false);
    this.camera.lowerRadiusLimit = 0.001;
    this.camera.upperRadiusLimit = 200;
    this.camera.wheelDeltaPercentage = 0.01;
    this.camera.position = new B.Vector3(1, 0.5, -6);
    this.camera.fov = 0.4;
    // environment
    this.environment = this.scene.createDefaultEnvironment({
      environmentTexture: '../assets/scene-environment.env',
      createSkybox: true,
      skyboxTexture: '../assets/scene-skybox.dds',
      skyboxColor: new B.Color3(0.0, 0.0, 0.0),
      skyboxSize: 100,
      createGround: true,
      groundColor: new B.Color3(1.0, 1.0, 1.0),
      groundSize: 10,
      groundShadowLevel: 0.1,
      groundTexture: '../assets/scene-ground.png',
      enableGroundShadow: true,
    }) as B.EnvironmentHelper;
    if (this.environment.rootMesh) this.environment.rootMesh.name = 'environment';
    if (this.environment.ground) this.environment.ground.name = 'ground';
    if (this.environment.skybox) this.environment.skybox.name = 'skybox';
    if (this.environment.ground?.material) this.environment.ground.material.name = 'ground';
    if (this.environment.skybox?.material) this.environment.skybox.material.name = 'skybox';
    if (this.environment.ground?.material) this.environment.ground.material['primaryColor'] = B.Color3.FromHexString('#640015');
    // lights & shadows
    this.ambient = new B.HemisphericLight('spheric', new B.Vector3(0, 1, 0), this.scene);
    this.ambient.intensity = 0.5;
    this.ambient.specular = B.Color3.Black();
    this.light = new B.DirectionalLight('directional', new B.Vector3(1, -1, 2), this.scene);
    this.light.shadowMinZ = 0;
    this.light.shadowMaxZ = 100;
    this.light.position = new B.Vector3(0, 2, -10);
    this.shadows = new B.ShadowGenerator(1024, this.light);
    this.shadows.useBlurExponentialShadowMap = true;
    this.shadows.useKernelBlur = true;
    this.shadows.blurKernel = 20;
    this.shadows.blurScale = 1;
    this.shadows.depthScale = 60.0;
    this.shadows.transparencyShadow = true;
    // rendering pipeline
    // this.highlight = new B.HighlightLayer('highlight', this.scene);
    this.pipeline = new B.DefaultRenderingPipeline('pipeline', true, this.scene, [this.camera], true);
    this.scene.performancePriority = B.ScenePerformancePriority.BackwardCompatible;
    this.scene.autoClear = false;
    // start scene
    this.engine.runRenderLoop(() => this.scene.render());
    // @ts-ignore
    window.t = this;
    // @ts-ignore
    log('babylonjs', { version: B.Engine.Version, engine: this.engine.name, renderer: this.engine._glRenderer.toLowerCase(), gpu: B.GPUParticleSystem.IsSupported }); // eslint-disable-line no-underscore-dangle
  }
}
