import "./style.css";
import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { loadMixamoAnimation } from "./loadMixamoAnimation.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

import { createEnvironment } from "./environment.js";

class ArmSpaceController {
  constructor(vrm) {
    this.vrm = vrm;
    this.armSpaceOffset = 0;
  }

  setArmSpace(value) {
    this.armSpaceOffset = value;
  }

  update() {
    if (!this.vrm || !this.vrm.humanoid) return;

    // Get the arm bones
    const leftArm = this.vrm.humanoid.getNormalizedBoneNode("leftUpperArm");
    const rightArm = this.vrm.humanoid.getNormalizedBoneNode("rightUpperArm");

    if (leftArm && rightArm) {
      // Scale down the effect and invert the range
      // Now -1 = arms close to body, 0 = normal, 1 = arms slightly out
      const scaledOffset = this.armSpaceOffset * 0.15; // Scale down significantly

      // Create rotation quaternions for the adjustment
      const leftAdjustment = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, 0, -scaledOffset)
      );
      const rightAdjustment = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, 0, scaledOffset)
      );

      // Apply as additional rotation on top of animation
      leftArm.quaternion.multiply(leftAdjustment);
      rightArm.quaternion.multiply(rightAdjustment);
    }
  }
}

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
camera.position.set(0.0, 1.0, 5.0);

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

// gltf and vrm
let currentVrm = undefined;
let currentAnimationUrl = undefined;
let currentMixer = undefined;
let currentAction = undefined;
let armSpaceController = undefined; // Initialize as undefined

// Animation management
const animations = new Map(); // Store loaded animation clips
let isLoadingAnimations = false;

// Define your animation files
const animationFiles = {
  idle: "/animations/idle.fbx",
  sad: "/animations/sad.fbx",
  happy: "/animations/idle-happy.fbx",
  bow: "/animations/bow.fbx",
  bored: "/animations/bored.fbx",
  dance: "/animations/dance.fbx",
  angry: "/animations/angry.fbx",
};

// Load all animations at startup
async function loadAllAnimations() {
  if (!currentVrm || isLoadingAnimations) return;

  isLoadingAnimations = true;
  console.log("Loading all animations...");

  for (const [name, url] of Object.entries(animationFiles)) {
    try {
      const clip = await loadMixamoAnimation(url, currentVrm);
      animations.set(name, clip);
      console.log(`Loaded animation: ${name}`);
    } catch (error) {
      console.error(`Failed to load animation ${name}:`, error);
    }
  }

  isLoadingAnimations = false;
  console.log("All animations loaded!");

  // Set up animation controls after loading
  setupAnimationControls();

  // Play default animation
  playAnimation("happy", true);
}

// Play a specific animation
function playAnimation(animationName, loop = false, fadeTime = 0.5) {
  if (!currentMixer || !animations.has(animationName)) {
    console.warn(`Animation "${animationName}" not found or mixer not ready`);
    return;
  }

  const clip = animations.get(animationName);
  const newAction = currentMixer.clipAction(clip);

  // Configure the action
  newAction.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
  newAction.clampWhenFinished = !loop;

  // Add debug logging
  console.log(`Playing animation: ${animationName}`);
  console.log("Clip duration:", clip.duration);
  console.log("Action:", newAction);

  // Handle transitions
  if (currentAction && currentAction !== newAction) {
    newAction.reset();
    newAction.play();
    currentAction.crossFadeTo(newAction, fadeTime);
  } else {
    newAction.reset();
    newAction.play();
  }

  currentAction = newAction;

  // Log the mixer state
  console.log("Mixer time:", currentMixer.time);
  console.log("Action time:", newAction.time);
  console.log("Action is playing:", newAction.isRunning());

  // Return action for chaining or event handling
  return newAction;
}

function loadVRM(modelUrl) {
  const loader = new GLTFLoader();
  loader.crossOrigin = "anonymous";

  loader.register((parser) => {
    return new VRMLoaderPlugin(parser, {
      autoUpdateHumanBones: true,
    });
  });

  loader.load(
    // URL of the VRM you want to load
    modelUrl,

    // called when the resource is loaded
    async (gltf) => {
      const vrm = gltf.userData.vrm;

      // calling this function greatly improves the performance
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.combineSkeletons(gltf.scene);
      VRMUtils.combineMorphs(vrm);

      if (currentVrm) {
        scene.remove(currentVrm.scene);
        VRMUtils.deepDispose(currentVrm.scene);
      }

      // put the model to the scene
      currentVrm = vrm;
      scene.add(vrm.scene);

      // create AnimationMixer for VRM
      currentMixer = new THREE.AnimationMixer(currentVrm.scene);

      // Create arm space controller AFTER currentVrm is set
      armSpaceController = new ArmSpaceController(currentVrm);

      // Load all animations after VRM is ready
      await loadAllAnimations();

      // Disable frustum culling
      vrm.scene.traverse((obj) => {
        obj.frustumCulled = false;
      });

      if (currentAnimationUrl) {
        loadFBX(currentAnimationUrl);
      }

      // rotate if the VRM is VRM0.0
      VRMUtils.rotateVRM0(vrm);

      console.log(vrm);

      //set default arm space
      if (armSpaceController) {
        armSpaceController.setArmSpace(1.5);
        console.log("Arm space set to: 1.5 (default)");
      }
    },

    // called while loading is progressing
    (progress) =>
      console.log(
        "Loading model...",
        100.0 * (progress.loaded / progress.total),
        "%"
      ),

    // called when loading has errors
    (error) => console.error(error)
  );
}

loadVRM(defaultModelUrl);

createEnvironment(scene);

// Blinking state variables
let nextBlinkTime = 0;
let blinkStartTime = -1;
let isBlinking = false;

// Blinking parameters
const BLINK_DURATION = 0.1; // Duration of a blink in seconds
const MIN_BLINK_INTERVAL = 5.0; // Minimum time between blinks
const MAX_BLINK_INTERVAL = 15.0; // Maximum time between blinks

// animate
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  const currentTime = clock.elapsedTime;

  // Update animation mixer first
  if (currentMixer) {
    currentMixer.update(deltaTime);
  }

  if (currentVrm) {
    // Handle blinking
    if (!isBlinking && currentTime >= nextBlinkTime) {
      // Start a blink
      isBlinking = true;
      blinkStartTime = currentTime;

      // Schedule next blink at random interval
      nextBlinkTime =
        currentTime +
        MIN_BLINK_INTERVAL +
        Math.random() * (MAX_BLINK_INTERVAL - MIN_BLINK_INTERVAL);
    }

    let blinkValue = 0;

    if (isBlinking) {
      const blinkProgress = (currentTime - blinkStartTime) / BLINK_DURATION;

      if (blinkProgress >= 1.0) {
        // Blink finished
        isBlinking = false;
        blinkValue = 0;
      } else {
        // Smooth blink animation using sine curve
        // Goes from 0 to 1 and back to 0
        blinkValue = Math.sin(blinkProgress * Math.PI);
      }
    }

    currentVrm.expressionManager.setValue("blink", blinkValue);

    // Apply arm space adjustment BEFORE VRM update but AFTER animation
    if (armSpaceController) {
      armSpaceController.update();
    }

    // Update VRM (this applies IK and other systems)
    currentVrm.update(deltaTime);
  }

  renderer.render(scene, camera);
}

animate();

// GUI setup
const gui = new GUI();

const params = {
  timeScale: 1.0,
  armSpace: 1.5,
};

gui.add(params, "timeScale", 0.0, 2.0, 0.001).onChange((value) => {
  if (currentMixer) currentMixer.timeScale = value;
});

// Add arm space control with better range
gui
  .add(params, "armSpace", -1.0, 3.0, 0.01)
  .name("Arm Space")
  .onChange((value) => {
    if (armSpaceController) {
      armSpaceController.setArmSpace(value);
      console.log("Arm space set to:", value);
    }
  });

// Add animation controls
function setupAnimationControls() {
  const animFolder = gui.addFolder("Animations");

  // Add button for each animation
  Object.keys(animationFiles).forEach((animName) => {
    animFolder.add(
      {
        [animName]: () => {
          console.log(`Playing animation: ${animName}`);
          playAnimation(animName, true);
        },
      },
      animName
    );
  });

  animFolder.open();
}
