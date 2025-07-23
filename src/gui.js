import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

/**
 * Creates and configures the main application GUI.
 * This function should be called only after the VRM and all its controllers are initialized.
 * @param {object} params - The object holding controllable parameters.
 * @param {THREE.AnimationMixer} mixer - The animation mixer.
 * @param {ArmSpaceController} armSpaceController - The controller for arm spacing.
 * @param {ExpressionController} expressionController - The controller for facial expressions.
 * @param {LookAtController} lookAtController - The controller for camera look-at behavior.
 * @param {object} animationFiles - An object mapping animation names to their file paths.
 * @param {function} playAnimationCallback - A callback function to play an animation by name.
 * @returns {GUI} The configured lil-gui instance.
 */
export function setupMainGUI(
  params,
  mixer,
  armSpaceController,
  expressionController,
  lookAtController,
  animationFiles,
  playAnimationCallback
) {
  const gui = new GUI();

  // --- General Controls ---
  gui
    .add(params, "timeScale", 0.0, 2.0, 0.001)
    .name("Time Scale")
    .onChange((value) => {
      if (mixer) mixer.timeScale = value;
    });

  gui
    .add(params, "armSpace", -1.0, 3.0, 0.01)
    .name("Arm Space")
    .onChange((value) => {
      if (armSpaceController) {
        armSpaceController.setArmSpace(value);
      }
    });

  // --- Animations Folder ---
  const animFolder = gui.addFolder("Animations");
  Object.keys(animationFiles).forEach((animName) => {
    animFolder.add({ [animName]: () => playAnimationCallback(animName, true) }, animName);
  });
  animFolder.close();

  // --- Expressions Folder ---
  const expressionFolder = gui.addFolder("Expressions");

  // Blinking Sub-folder
  const blinkFolder = expressionFolder.addFolder("Blinking");
  const blinkConfig = { blinkInterval: 10.0, doubleBlinkChance: 0.1 };
  blinkFolder.add(blinkConfig, "blinkInterval", 1, 30).onChange((value) => {
    if (expressionController) {
      expressionController.blinkController.setConfig({ minInterval: value / 2, maxInterval: value });
    }
  });
  blinkFolder.add(blinkConfig, "doubleBlinkChance", 0, 0.5).onChange((value) => {
    if (expressionController) {
      expressionController.blinkController.setConfig({ doubleBlinkChance: value });
    }
  });
  blinkFolder.close();

  // Emotions Sub-folder
  const emotionFolder = expressionFolder.addFolder("Emotions");
  const emotions = ["happy", "angry", "sad", "relaxed", "surprised", "neutral"];
  emotions.forEach((emotion) => {
    emotionFolder.add({ [emotion]: () => {
        if (expressionController) {
          expressionController.emotionController.setEmotion(emotion, 1.0);
        }
      }},
      emotion
    );
  });
  emotionFolder.close();
  expressionFolder.close();

  // --- Look At Folder ---
  const lookAtFolder = gui.addFolder("Look At Camera");
  lookAtFolder.add(params, "lookAtEnabled").name("Enabled").onChange((value) => {
    if (lookAtController) lookAtController.setEnabled(value);
  });
  lookAtFolder.add(params, "eyeIntensity", 0.0, 1.0, 0.01).name("Eye Intensity").onChange((value) => {
    if (lookAtController) lookAtController.setEyeIntensity(value);
  });
  lookAtFolder.add(params, "headIntensity", 0.0, 1.0, 0.01).name("Head Intensity").onChange((value) => {
    if (lookAtController) lookAtController.setHeadIntensity(value);
  });
  lookAtFolder.add(params, "lookAtSmoothing", 0.0, 1.0, 0.01).name("Smoothing").onChange((value) => {
    if (lookAtController) lookAtController.setSmoothing(value);
  });
  lookAtFolder.close();

  return gui;
}
