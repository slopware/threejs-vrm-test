import * as THREE from "three";
import { loadMixamoAnimation } from "./utils/loadMixamoAnimation.js";

/**
 * Manages loading and playback of animations for a VRM model.
 */
export class AnimationController {
  /**
   * @param {object} vrm - The VRM model instance.
   * @param {object} animationFiles - An object mapping animation names to their file paths.
   */
  constructor(vrm, animationFiles) {
    this.vrm = vrm;
    this.animationFiles = animationFiles;
    this.mixer = new THREE.AnimationMixer(vrm.scene);

    this.animations = new Map();
    this.currentAction = null;
    this.currentActionName = null; // To track the name of the current animation

    // --- Idle Loop Properties ---
    this.idleLoopActive = false;
    this.idleTimeout = null;
    // Define which animations are part of the idle cycle
    this.idleAnimations = ['idle', 'idle_happy', 'idle_happy2', 'bored', 'looking'];
  }

  /**
   * Loads all animations defined in the animationFiles object.
   */
  async loadAllAnimations() {
    console.log("AnimationController: Loading all animations...");
    for (const [name, url] of Object.entries(this.animationFiles)) {
      try {
        const clip = await loadMixamoAnimation(url, this.vrm);
        // Store the clip with its original name for reference
        clip.name = name;
        this.animations.set(name, clip);
        console.log(`AnimationController: Loaded animation "${name}"`);
      } catch (error) {
        console.error(`AnimationController: Failed to load animation ${name}:`, error);
      }
    }
    console.log("AnimationController: All animations loaded!");
    this.playAnimation("idle", true, 0); // Start with a default idle
  }

  /**
   * Plays a specific animation by name.
   * @param {string} animationName - The name of the animation to play.
   * @param {boolean} loop - Whether the animation should loop.
   * @param {number} fadeTime - The cross-fade duration.
   */
  playAnimation(animationName, loop = false, fadeTime = 0.5) {
    // If a non-idle animation is played manually, stop the idle loop.
    if (this.idleLoopActive && !this.idleAnimations.includes(animationName)) {
      this.stopIdleLoop();
    }

    if (!this.animations.has(animationName)) {
      console.warn(`AnimationController: Animation "${animationName}" not found.`);
      return;
    }
    
    this.currentActionName = animationName;

    const clip = this.animations.get(animationName);
    const newAction = this.mixer.clipAction(clip);
    newAction.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
    newAction.clampWhenFinished = !loop;

    if (this.currentAction && this.currentAction !== newAction) {
      newAction.reset().play();
      this.currentAction.crossFadeTo(newAction, fadeTime);
    } else {
      newAction.reset().play();
    }

    this.currentAction = newAction;
  }

  /**
   * Starts the randomized idle animation loop.
   */
  startIdleLoop() {
    if (this.idleLoopActive) return; // Already running
    this.idleLoopActive = true;
    console.log("Starting idle loop...");
    this.runIdleLoop();
  }

  /**
   * Stops the idle loop and returns to the default idle animation.
   */
  stopIdleLoop() {
    if (!this.idleLoopActive) return; // Already stopped
    this.idleLoopActive = false;
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
    console.log("Stopping idle loop. Returning to default idle.");
    this.playAnimation('idle', true);
  }

  /**
   * The core logic for the idle loop. Plays a random animation then sets a timeout to run again.
   * @private
   */
  runIdleLoop() {
    if (!this.idleLoopActive) return;

    // Find available idle animations, excluding the current one to avoid repeats
    const possibleAnims = this.idleAnimations.filter(
      name => name !== this.currentActionName && this.animations.has(name)
    );

    // If all have been filtered (e.g., only one idle anim), use the full list
    const animPool = possibleAnims.length > 0 ? possibleAnims : this.idleAnimations.filter(name => this.animations.has(name));
    
    if (animPool.length === 0) {
        console.warn("No idle animations available for loop.");
        this.stopIdleLoop();
        return;
    }

    const nextAnimName = animPool[Math.floor(Math.random() * animPool.length)];

    // Play the chosen animation. We set it to loop, but the timeout will cut it short.
    this.playAnimation(nextAnimName, true);

    // Set a random timeout to transition to the next animation
    const randomInterval = Math.random() * (30000 - 5000) + 5000; // 5 to 30 seconds
    console.log(`Idle loop: playing "${nextAnimName}" for ${Math.round(randomInterval / 1000)}s`);

    this.idleTimeout = setTimeout(() => this.runIdleLoop(), randomInterval);
  }

  /**
   * Updates the animation mixer. Should be called in the main render loop.
   * @param {number} deltaTime - The time elapsed since the last frame.
   */
  update(deltaTime) {
    this.mixer.update(deltaTime);
  }
}
