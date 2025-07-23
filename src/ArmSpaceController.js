import * as THREE from "three";

export class ArmSpaceController {
  constructor(vrm, defaultArmSpace = 0) {
    this.vrm = vrm;
    this.armSpaceOffset = defaultArmSpace;
    // Start disabled to prevent running before the first animation frame
    this.enabled = false;
  }

  /**
   * Enables or disables the controller's update logic.
   * @param {boolean} isEnabled
   */
  setEnabled(isEnabled) {
    this.enabled = isEnabled;
  }

  setArmSpace(value) {
    this.armSpaceOffset = value;
  }

  update() {
    // Guard clause: only run the logic if the controller is enabled
    if (!this.enabled || !this.vrm || !this.vrm.humanoid) return;

    // Get the arm bones
    const leftArm = this.vrm.humanoid.getNormalizedBoneNode("leftUpperArm");
    const rightArm = this.vrm.humanoid.getNormalizedBoneNode("rightUpperArm");

    if (leftArm && rightArm) {
      // Scale down the effect
      const scaledOffset = this.armSpaceOffset * 0.15;

      // Create rotation quaternions for the adjustment
      const leftAdjustment = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, 0, -scaledOffset)
      );
      const rightAdjustment = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, 0, scaledOffset)
      );

      // Apply as an additional rotation on top of the current animation pose
      leftArm.quaternion.multiply(leftAdjustment);
      rightArm.quaternion.multiply(rightAdjustment);
    }
  }
}
