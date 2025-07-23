import "./style.css";
import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

// Import all the controllers
import { AnimationController } from "./AnimationController.js";
import { ExpressionController } from "./ExpressionController.js";
import { ArmSpaceController } from "./ArmSpaceController.js";
import { LookAtController } from "./utils/LookAtController.js";

import { loadEnvironment, availableEnvironments } from "./environment.js";
import { setupMainGUI } from "./gui.js";

// renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// camera
const camera = new THREE.PerspectiveCamera(
  30.0,
  window.innerWidth / window.innerHeight,
  0.1,
  20.0
);
camera.position.set(0.0, 1.5, 3.5);

// camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.screenSpacePanning = true;
controls.target.set(0.0, 1.0, 0.0);
controls.update();

// scene
const scene = new THREE.Scene();

// light
const light = new THREE.DirectionalLight(0xffffff, Math.PI);
light.position.set(1.0, 1.0, 1.0).normalize();
scene.add(light);

const defaultModelUrl = "/miku.vrm";

// --- State and Controllers ---
// The main file now just holds references to the VRM and the controllers.
let currentVrm = undefined;
let animationController = undefined;
let armSpaceController = undefined;
let expressionController = undefined;
let lookAtController = undefined;
let gui = undefined;

// --- Parameters ---
const params = {
  timeScale: 1.0,
  armSpace: 1.5,
  lookAtEnabled: true,
  eyeIntensity: 1.0,
  headIntensity: 0.3,
  lookAtSmoothing: 0.1,
  lookAtVerticalOffset: 0,
  environment: availableEnvironments[0],
};

// --- Animation Files Configuration ---
// This can stay here as a central configuration object.
const animationFiles = {
  idle: "/animations/idleFemale.fbx",
  idle_happy: "/animations/idle-happy.fbx",
  idle_happy2: "/animations/idle-happy2.fbx",
  idle_bored: "/animations/bored.fbx",
  acknowledging: "/animations/acknowledging.fbx",
  sad: "/animations/sad.fbx",
  bow: "/animations/bow.fbx",
  looking: "/animations/idle-looking.fbx",
};

// The old animation functions (loadAllAnimations, playAnimation) have been removed.

function loadVRM(modelUrl) {
  const loader = new GLTFLoader();
  loader.crossOrigin = "anonymous";
  loader.register(
    (parser) => new VRMLoaderPlugin(parser, { autoUpdateHumanBones: true })
  );

  loader.load(
    modelUrl,
    async (gltf) => {
      const vrm = gltf.userData.vrm;
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.combineSkeletons(gltf.scene);
      VRMUtils.combineMorphs(vrm);

      if (currentVrm) {
        scene.remove(currentVrm.scene);
        VRMUtils.deepDispose(currentVrm.scene);
      }
      if (gui) {
        gui.destroy();
      }

      currentVrm = vrm;
      scene.add(vrm.scene);
      vrm.scene.traverse((obj) => {
        obj.frustumCulled = false;
      });
      VRMUtils.rotateVRM0(vrm);

      // --- Initialize ALL controllers ---
      animationController = new AnimationController(currentVrm, animationFiles);
      expressionController = new ExpressionController(currentVrm);
      armSpaceController = new ArmSpaceController(currentVrm, params.armSpace);
      lookAtController = new LookAtController(currentVrm, camera);

      // --- Load the default environment ---
      loadEnvironment(params.environment, scene);

      // --- Create GUI, passing it the new animationController ---
      gui = setupMainGUI(
        params,
        animationController, // Pass the new controller
        armSpaceController,
        expressionController,
        lookAtController,
        availableEnvironments,
        (envName) => loadEnvironment(envName, scene)
      );

      // --- Load animations using the controller ---
      // We await this to ensure animations are ready before enabling other controllers.
      await animationController.loadAllAnimations();

      if (armSpaceController) {
        // This delay is still useful to prevent the arm-snap on the first frame.
        setTimeout(() => armSpaceController.setEnabled(true), 100);
      }
    },
    (progress) =>
      console.log(
        "Loading model...",
        100.0 * (progress.loaded / progress.total),
        "%"
      ),
    (error) => console.error(error)
  );
}

loadVRM(defaultModelUrl);

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();
  const currentTime = clock.elapsedTime;

  // Update all controllers that need it
  if (animationController) animationController.update(deltaTime);

  if (currentVrm) {
    if (expressionController)
      expressionController.update(currentTime, deltaTime);
    if (armSpaceController) armSpaceController.update();
    if (lookAtController) lookAtController.update(deltaTime);
    currentVrm.update(deltaTime);
  }
  renderer.render(scene, camera);
}
animate();
