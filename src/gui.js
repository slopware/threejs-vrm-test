import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

/**
 * Creates and configures the main application GUI.
 * @param {object} params - The object holding controllable parameters.
 * @param {AnimationController} animationController - The new controller for animations.
 * @param {ArmSpaceController} armSpaceController - The controller for arm spacing.
 * @param {ExpressionController} expressionController - The controller for facial expressions.
 * @param {LookAtController} lookAtController - The controller for camera look-at behavior.
 * @param {string[]} availableEnvironments - An array of environment names.
 * @param {function} loadEnvironmentCallback - A callback to load an environment by name.
 * @returns {GUI} The configured lil-gui instance.
 */
export function setupMainGUI(
  params,
  animationController,
  armSpaceController,
  expressionController,
  lookAtController,
  availableEnvironments,
  loadEnvironmentCallback
) {
  const gui = new GUI();

  // --- Environment Folder ---
  const envFolder = gui.addFolder("Environment");
  envFolder
    .add(params, "environment", availableEnvironments)
    .name("Select")
    .onChange((value) => {
      loadEnvironmentCallback(value);
    });
  envFolder.close();

  // --- Custom Idle Loop Folder ---
  const loopFolder = gui.addFolder("Custom Idle Loop");
  loopFolder
    .add({ start: () => animationController.startIdleLoop() }, "start")
    .name("Start Loop");
  loopFolder
    .add({ stop: () => animationController.stopIdleLoop() }, "stop")
    .name("Stop Loop");
  loopFolder.close();

  // --- General Controls ---
  gui
    .add(params, "timeScale", 0.0, 2.0, 0.001)
    .name("Time Scale")
    .onChange((value) => {
      if (animationController) animationController.mixer.timeScale = value;
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
  // Get animation names directly from the controller's config
  Object.keys(animationController.animationFiles).forEach((animName) => {
    animFolder.add(
      { [animName]: () => animationController.playAnimation(animName, true) },
      animName
    );
  });
  animFolder.close();

  // --- Expressions Folder ---
  const expressionFolder = gui.addFolder("Expressions");
  const blinkFolder = expressionFolder.addFolder("Blinking");
  const blinkConfig = { blinkInterval: 10.0, doubleBlinkChance: 0.1 };
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
  const emotionFolder = expressionFolder.addFolder("Emotions");
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
  expressionFolder.close();

  // --- Look At Folder ---
  const lookAtFolder = gui.addFolder("Look At Camera");
  lookAtFolder
    .add(params, "lookAtEnabled")
    .name("Enabled")
    .onChange((value) => {
      if (lookAtController) lookAtController.setEnabled(value);
    });
  lookAtFolder
    .add(params, "eyeIntensity", 0.0, 1.0, 0.01)
    .name("Eye Intensity")
    .onChange((value) => {
      if (lookAtController) lookAtController.setEyeIntensity(value);
    });
  lookAtFolder
    .add(params, "headIntensity", 0.0, 1.0, 0.01)
    .name("Head Intensity")
    .onChange((value) => {
      if (lookAtController) lookAtController.setHeadIntensity(value);
    });
  lookAtFolder
    .add(params, "lookAtSmoothing", 0.0, 1.0, 0.01)
    .name("Smoothing")
    .onChange((value) => {
      if (lookAtController) lookAtController.setSmoothing(value);
    });
  lookAtFolder.close();

  return gui;
}
