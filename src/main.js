import "./style.css";
import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { loadMixamoAnimation } from "./utils/loadMixamoAnimation.js";

import { ExpressionController } from "./ExpressionController.js";
// IMPORTANT: Import the new environment tools
import { loadEnvironment, availableEnvironments } from "./environment.js";
import { ArmSpaceController } from "./ArmSpaceController.js";
import { LookAtController } from "./utils/LookAtController.js";
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
light.position.set(1.0, 1.0, 0.5).normalize();
scene.add(light);

const defaultModelUrl = "/miku.vrm";

// --- State and Controllers ---
let currentVrm = undefined;
let currentMixer = undefined;
let currentAction = undefined;
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
  // Add environment to params with a default value
  environment: availableEnvironments[0],
};

// --- Animation Management ---
const animations = new Map();
let isLoadingAnimations = false;
const animationFiles = {
  idle: "/animations/idleFemale.fbx",
  idle2: "/animations/idle.fbx",
  idle_happy: "/animations/idle-happy.fbx",
  idle_happy2: "/animations/idle-happy2.fbx",
  acknowledging: "/animations/acknowledging.fbx",
  sad: "/animations/sad.fbx",
  bow: "/animations/bow.fbx",
  bored: "/animations/bored.fbx",
  looking: "/animations/idle-looking.fbx",
};

async function loadAllAnimations() {
  if (!currentVrm || isLoadingAnimations) return;
  isLoadingAnimations = true;
  for (const [name, url] of Object.entries(animationFiles)) {
    try {
      const clip = await loadMixamoAnimation(url, currentVrm);
      animations.set(name, clip);
    } catch (error) {
      console.error(`Failed to load animation ${name}:`, error);
    }
  }
  isLoadingAnimations = false;
  playAnimation("idle", true);
}

function playAnimation(animationName, loop = false, fadeTime = 0.5) {
  if (!currentMixer || !animations.has(animationName)) return;
  const clip = animations.get(animationName);
  const newAction = currentMixer.clipAction(clip);
  newAction.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
  newAction.clampWhenFinished = !loop;

  if (currentAction && currentAction !== newAction) {
    newAction.reset().play();
    currentAction.crossFadeTo(newAction, fadeTime);
  } else {
    newAction.reset().play();
  }
  currentAction = newAction;
  return newAction;
}

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

      currentMixer = new THREE.AnimationMixer(currentVrm.scene);
      expressionController = new ExpressionController(currentVrm);
      armSpaceController = new ArmSpaceController(currentVrm, params.armSpace);
      lookAtController = new LookAtController(currentVrm, camera);

      // --- Load the default environment ---
      loadEnvironment(params.environment, scene);

      // --- Create GUI with new environment controls ---
      gui = setupMainGUI(
        params,
        currentMixer,
        armSpaceController,
        expressionController,
        lookAtController,
        animationFiles,
        playAnimation,
        availableEnvironments,
        (envName) => loadEnvironment(envName, scene) // Pass the loader function
      );

      await loadAllAnimations();

      if (armSpaceController) {
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

  if (currentMixer) {
    currentMixer.update(deltaTime);
  }
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
