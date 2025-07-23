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

    // The mixer is now managed internally by this controller
    this.mixer = new THREE.AnimationMixer(vrm.scene);

    this.animations = new Map();
    this.currentAction = null;
    this.isLoading = false;
  }

  /**
   * Loads all animations defined in the animationFiles object.
   */
  async loadAllAnimations() {
    if (this.isLoading) return;
    this.isLoading = true;
    console.log("AnimationController: Loading all animations...");

    for (const [name, url] of Object.entries(this.animationFiles)) {
      try {
        const clip = await loadMixamoAnimation(url, this.vrm);
        this.animations.set(name, clip);
        console.log(`AnimationController: Loaded animation "${name}"`);
      } catch (error) {
        console.error(`AnimationController: Failed to load animation ${name}:`, error);
      }
    }

    this.isLoading = false;
    console.log("AnimationController: All animations loaded!");

    // Automatically play a default animation once loaded
    this.playAnimation("idle", true, 0); // No fade-in for the first animation
  }

  /**
   * Plays a specific animation by name.
   * @param {string} animationName - The name of the animation to play.
   * @param {boolean} loop - Whether the animation should loop.
   * @param {number} fadeTime - The cross-fade duration from the previous animation.
   */
  playAnimation(animationName, loop = false, fadeTime = 0.5) {
    if (!this.animations.has(animationName)) {
      console.warn(`AnimationController: Animation "${animationName}" not found.`);
      return;
    }

    const clip = this.animations.get(animationName);
    const newAction = this.mixer.clipAction(clip);
    newAction.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
    newAction.clampWhenFinished = !loop;

    // Transition from the old action to the new one
    if (this.currentAction && this.currentAction !== newAction) {
      newAction.reset().play();
      this.currentAction.crossFadeTo(newAction, fadeTime);
    } else {
      newAction.reset().play();
    }

    this.currentAction = newAction;
  }

  /**
   * Updates the animation mixer. Should be called in the main render loop.
   * @param {number} deltaTime - The time elapsed since the last frame.
   */
  update(deltaTime) {
    this.mixer.update(deltaTime);
  }
}
