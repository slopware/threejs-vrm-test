import "./style.css";
import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { loadMixamoAnimation } from "./utils/loadMixamoAnimation.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

import { ExpressionController } from "./ExpressionController.js";
import { createEnvironment } from "./environment.js";
import { ArmSpaceController } from "./ArmSpaceController.js";
import { LookAtController } from "./utils/LookAtController.js";

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

// controllers
let currentVrm = undefined;
let currentAnimationUrl = undefined;
let currentMixer = undefined;
let currentAction = undefined;
let armSpaceController = undefined;
let expressionController = undefined;
let lookAtController = undefined;

// Animation management
const animations = new Map(); // Store loaded animation clips
let isLoadingAnimations = false;

// Define your animation files
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
  // angry: "/animations/angry.fbx",
  // excited: "/animations/excited.fbx",
  // excited2: "/animations/excited2.fbx",
  // jump_for_joy: "/animations/Joyful Jump.fbx",
  // spin_combo: "/animations/Northern Soul Spin Combo.fbx",
  // spin: "/animations/Northern Soul Spin.fbx",
  // praying: "/animations/praying.fbx",
  // punching_bag: "/animations/Punching Bag.fbx",
  // square_up: "/animations/square up.fbx",
  // talking: "/animations/talking.fbx",
  // telling_secret: "/animations/talkingTellingSecret.fbx",
  // yelling: "/animations/talkingYelling.fbx",
  // taunt: "/animations/Taunt.fbx",
  // threaten: "/animations/throat.fbx",
  // victory: "/animations/victory.fbx",
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
  playAnimation("idle", true);
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

      // Create expression controller
      expressionController = new ExpressionController(currentVrm);

      // Load all animations after VRM is ready
      await loadAllAnimations();

      // Create arm space controller AFTER currentVrm is set
      armSpaceController = new ArmSpaceController(currentVrm, 1.5);

      lookAtController = new LookAtController(currentVrm, camera);

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

// animate
const clock = new THREE.Clock();

requestAnimationFrame(() => {
  if (lookAtController) {
    lookAtController.storeDefaultState();
  }
});

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  const currentTime = clock.elapsedTime;

  // Update animation mixer first
  if (currentMixer) {
    currentMixer.update(deltaTime);
  }

  if (currentVrm) {
    // Update expressions (handles all blinking and emotions)
    if (expressionController) {
      expressionController.update(currentTime, deltaTime);
    }

    // Apply arm space adjustment BEFORE VRM update but AFTER animation
    if (armSpaceController) {
      armSpaceController.update();
    }

    if (lookAtController) {
      lookAtController.update(deltaTime);
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
  // Add these new parameters
  lookAtEnabled: true,
  eyeIntensity: 1.0,
  headIntensity: 0.3,
  lookAtSmoothing: 0.1,
  lookAtVerticalOffset: 0,
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
      //console.log("Arm space set to:", value);
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

  animFolder.close();
}

// GUI setup additions
function setupExpressionControls() {
  //const expressionFolder = gui.addFolder("Expressions");

  // Blink controls
  const blinkFolder = gui.addFolder("Blinking");
  const blinkConfig = {
    blinkInterval: 10.0,
    doubleBlinkChance: 0.1,
    blinkSpeed: 1.0,
  };

  blinkFolder.add(blinkConfig, "blinkInterval", 1, 30).onChange((value) => {
    if (expressionController) {
      expressionController.blinkController.setConfig({
        minInterval: value / 2,
        maxInterval: value,
      });
    }
  });

  blinkFolder
    .add(blinkConfig, "doubleBlinkChance", 0, 0.5)
    .onChange((value) => {
      if (expressionController) {
        expressionController.blinkController.setConfig({
          doubleBlinkChance: value,
        });
      }
    });
  blinkFolder.close();
  // Emotion controls
  const emotionFolder = gui.addFolder("Emotions");
  const emotions = ["happy", "angry", "sad", "relaxed", "surprised", "neutral"];

  emotions.forEach((emotion) => {
    emotionFolder.add(
      {
        [emotion]: () => {
          if (expressionController) {
            expressionController.emotionController.setEmotion(emotion, 1.0);
          }
        },
      },
      emotion
    );
  });

  emotionFolder.close();
}

// Call this after loading animations
setupExpressionControls();
//gui.close();
const lookAtFolder = gui.addFolder("Look At Camera");

lookAtFolder
  .add(params, "lookAtEnabled")
  .name("Enabled")
  .onChange((value) => {
    if (lookAtController) {
      lookAtController.setEnabled(value);
    }
  });

lookAtFolder
  .add(params, "eyeIntensity", 0.0, 1.0, 0.01)
  .name("Eye Intensity")
  .onChange((value) => {
    if (lookAtController) {
      lookAtController.setEyeIntensity(value);
    }
  });

lookAtFolder
  .add(params, "headIntensity", 0.0, 1.0, 0.01)
  .name("Head Intensity")
  .onChange((value) => {
    if (lookAtController) {
      lookAtController.setHeadIntensity(value);
    }
  });

lookAtFolder
  .add(params, "lookAtSmoothing", 0.0, 1.0, 0.01)
  .name("Smoothing")
  .onChange((value) => {
    if (lookAtController) {
      lookAtController.setSmoothing(value);
    }
  });

lookAtFolder.close();
