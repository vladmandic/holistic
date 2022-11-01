import * as B from '@babylonjs/core';
import * as M from '@babylonjs/materials';
import '@babylonjs/inspector';

export class Scene {
  engine: B.Engine;
  canvas: HTMLCanvasElement;
  scene: B.Scene;
  materialBone: M.PBRCustomMaterial;
  materialJoint: M.PBRCustomMaterial;
  materialHead: M.PBRCustomMaterial;
  camera: B.ArcRotateCamera;
  light: B.DirectionalLight;
  ambient: B.HemisphericLight;
  shadows: B.ShadowGenerator;
  environment: B.EnvironmentHelper;
  skybox: B.Mesh | undefined;
  ground: B.Mesh | undefined;
  // highlight: B.HighlightLayer;

  constructor(outputCanvas: HTMLCanvasElement) {
    this.canvas = outputCanvas;
    // engine & scene
    this.engine = new B.Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true, disableWebGL2Support: false, doNotHandleContextLost: true });
    this.engine.enableOfflineSupport = false;
    B.Animation.AllowMatricesInterpolation = true;
    this.scene = new B.Scene(this.engine);
    this.scene.clearCachedVertexData();
    // materials
    this.materialHead = new M.PBRCustomMaterial('head', this.scene);
    this.materialHead.metallic = 1.0;
    this.materialHead.roughness = 0.65;
    this.materialHead.alpha = 1.0;
    this.materialHead.albedoColor = B.Color3.FromHexString('#91ECFF');
    this.materialHead.iridescence.isEnabled = true;
    this.materialHead.backFaceCulling = false;
    this.materialBone = new M.PBRCustomMaterial('bone', this.scene);
    this.materialBone.metallic = 1.0;
    this.materialBone.roughness = 0.4;
    this.materialBone.alpha = 1.0;
    this.materialBone.albedoColor = B.Color3.FromHexString('#B1ECFF');
    this.materialBone.iridescence.isEnabled = true;
    this.materialJoint = new M.PBRCustomMaterial('joint', this.scene);
    this.materialJoint.metallic = 1.0;
    this.materialJoint.roughness = 0.0;
    this.materialJoint.alpha = 0.5;
    this.materialJoint.albedoColor = B.Color3.FromHexString('#FFFFFF');
    this.materialJoint.iridescence.isEnabled = true;
    // start scene
    this.engine.runRenderLoop(() => this.scene.render());
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
    if (this.environment.rootMesh?.name) this.environment.rootMesh.name = 'environment';
    if (this.environment.ground?.name) this.environment.ground.name = 'ground';
    if (this.environment.skybox?.name) this.environment.skybox.name = 'skybox';
    // lights
    this.ambient = new B.HemisphericLight('spheric', new B.Vector3(0, 1, 0), this.scene);
    this.ambient.intensity = 0.5;
    this.ambient.specular = B.Color3.Black();
    this.light = new B.DirectionalLight('directional', new B.Vector3(0.3, -0.5, 1), this.scene);
    this.light.position = new B.Vector3(2.5, 5, -5);
    this.shadows = new B.ShadowGenerator(1024, this.light);
    this.shadows.useBlurExponentialShadowMap = true;
    this.shadows.blurKernel = 8;
    this.shadows.depthScale = 60.0;
    // this.highlight = new B.HighlightLayer('highlight', this.scene);
    // @ts-ignore
    window.t = this;
  }
}
