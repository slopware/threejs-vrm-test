import * as THREE from 'three';

export class ArmSpaceController {
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