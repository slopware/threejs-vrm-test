import * as THREE from "three";

export class LookAtController {
  constructor(vrm, camera) {
    this.vrm = vrm;
    this.camera = camera;
    
    // Configuration
    this.enabled = true;
    this.eyeIntensity = 1.0; // 0-1 range for eye movement
    this.headIntensity = 0.3; // 0-1 range for head movement
    this.smoothing = 0.1; // Smoothing factor (0-1, lower = smoother)
    this.headSmoothingMultiplier = 0.8; // Head smoothing relative to eye smoothing
    this.verticalOffset = 0; // Offset to adjust where to look on the camera
    
    // Create a target object that the VRM can look at
    this.targetObject = new THREE.Object3D();
    this.targetObject.position.copy(camera.position);
    
    // Internal state for smoothing
    this.currentTarget = new THREE.Vector3();
    this.smoothedEyeTarget = new THREE.Vector3();
    
    // Separate smoothing for head rotation (store angles, not quaternions)
    this.targetHeadRotationX = 0;
    this.targetHeadRotationY = 0;
    this.smoothedHeadRotationX = 0;
    this.smoothedHeadRotationY = 0;
    
    // Separate smoothing for neck rotation
    this.targetNeckRotationX = 0;
    this.targetNeckRotationY = 0;
    this.smoothedNeckRotationX = 0;
    this.smoothedNeckRotationY = 0;
    
    // Store initial camera position as default eye target
    this.defaultEyeTarget = new THREE.Vector3();
    if (camera) {
      this.defaultEyeTarget.copy(camera.position);
      this.smoothedEyeTarget.copy(camera.position);
    }
    
    // Debug
    console.log("LookAtController initialized");
    console.log("VRM:", vrm);
    console.log("VRM lookAt:", vrm?.lookAt);
    console.log("Camera:", camera);
    console.log("Default eye target:", this.defaultEyeTarget);
  }
  

  
  setEnabled(enabled) {
    this.enabled = enabled;
    // Don't immediately reset - let the update method handle smooth transition
  }
  
  setEyeIntensity(value) {
    this.eyeIntensity = Math.max(0, Math.min(1, value));
  }
  
  setHeadIntensity(value) {
    this.headIntensity = Math.max(0, Math.min(1, value));
  }
  
  setSmoothing(value) {
    this.smoothing = Math.max(0, Math.min(1, value));
  }
  
  setVerticalOffset(value) {
    this.verticalOffset = value;
  }
  
  update(deltaTime) {
    if (!this.vrm || !this.vrm.lookAt || !this.camera) {
      if (!this.vrm?.lookAt) {
        console.warn("VRM lookAt not available");
      }
      return;
    }
    
    // Calculate frame-rate independent smoothing factor
    const eyeSmoothingFactor = 1.0 - Math.pow(1.0 - this.smoothing, deltaTime * 60);
    const headSmoothingFactor = eyeSmoothingFactor * this.headSmoothingMultiplier;
    
    if (this.enabled) {
      // Normal tracking behavior
      // Get camera position with vertical offset
      this.currentTarget.copy(this.camera.position);
      this.currentTarget.y += this.verticalOffset;
      
      // Smooth eye target position
      this.smoothedEyeTarget.lerp(this.currentTarget, eyeSmoothingFactor);
      
      // Update the target object position for eyes
      this.targetObject.position.copy(this.smoothedEyeTarget);
      
      // Set the lookAt target for eyes with intensity
      if (this.eyeIntensity > 0) {
        this.vrm.lookAt.target = this.targetObject;
        this.vrm.lookAt.autoUpdate = true;
      }
      
      // Handle head and neck rotation
      if (this.headIntensity > 0) {
        const headBone = this.vrm.humanoid?.getNormalizedBoneNode('head');
        const neckBone = this.vrm.humanoid?.getNormalizedBoneNode('neck');
        
        if (headBone) {
          // Get head world position
          const headWorldPos = new THREE.Vector3();
          headBone.getWorldPosition(headWorldPos);
          
          // Calculate direction from head to CURRENT target (not smoothed)
          const direction = new THREE.Vector3();
          direction.subVectors(this.currentTarget, headWorldPos).normalize();
          
          // Calculate rotation angles
          const horizontal = Math.atan2(direction.x, direction.z);
          const vertical = Math.asin(Math.max(-1, Math.min(1, direction.y)));
          
          // Apply intensity and clamp angles
          const maxHorizontal = Math.PI * 0.5; // 90 degrees
          const maxVertical = Math.PI * 0.4; // 72 degrees
          
          // Calculate target rotations with intensity
          this.targetHeadRotationY = THREE.MathUtils.clamp(
            horizontal * this.headIntensity * 2.0, 
            -maxHorizontal, 
            maxHorizontal
          );
          this.targetHeadRotationX = THREE.MathUtils.clamp(
            vertical * this.headIntensity * 2.0, 
            -maxVertical, 
            maxVertical
          );
          
          // Smooth the rotation angles
          this.smoothedHeadRotationX = THREE.MathUtils.lerp(
            this.smoothedHeadRotationX,
            this.targetHeadRotationX,
            headSmoothingFactor
          );
          this.smoothedHeadRotationY = THREE.MathUtils.lerp(
            this.smoothedHeadRotationY,
            this.targetHeadRotationY,
            headSmoothingFactor
          );
          
          // Apply smoothed rotation to head
          const headQuaternion = new THREE.Quaternion();
          headQuaternion.setFromEuler(new THREE.Euler(
            this.smoothedHeadRotationX,
            this.smoothedHeadRotationY,
            0,
            'YXZ'
          ));
          headBone.quaternion.copy(headQuaternion);
          
          // Handle neck rotation (activates after 50% head intensity)
          if (neckBone && this.headIntensity > 0.5) {
            const neckIntensity = (this.headIntensity - 0.5) * 0.5;
            const neckSmoothingFactor = headSmoothingFactor * 0.7;
            
            // Calculate target neck rotations
            this.targetNeckRotationX = this.targetHeadRotationX * neckIntensity * 0.3;
            this.targetNeckRotationY = this.targetHeadRotationY * neckIntensity * 0.3;
            
            // Smooth neck rotations
            this.smoothedNeckRotationX = THREE.MathUtils.lerp(
              this.smoothedNeckRotationX,
              this.targetNeckRotationX,
              neckSmoothingFactor
            );
            this.smoothedNeckRotationY = THREE.MathUtils.lerp(
              this.smoothedNeckRotationY,
              this.targetNeckRotationY,
              neckSmoothingFactor
            );
            
            // Apply smoothed rotation to neck
            const neckQuaternion = new THREE.Quaternion();
            neckQuaternion.setFromEuler(new THREE.Euler(
              this.smoothedNeckRotationX,
              this.smoothedNeckRotationY,
              0,
              'YXZ'
            ));
            neckBone.quaternion.copy(neckQuaternion);
          }
        }
      }
    } else {
      // Smoothly return to default position when disabled
      
      // For eyes: Move target to the stored default camera position
      this.smoothedEyeTarget.lerp(this.defaultEyeTarget, eyeSmoothingFactor);
      this.targetObject.position.copy(this.smoothedEyeTarget);
      
      // Keep the lookAt active but pointing at default position
      this.vrm.lookAt.target = this.targetObject;
      this.vrm.lookAt.autoUpdate = true;
      
      // For head/neck: Smoothly return to zero rotation
      this.targetHeadRotationX = 0;
      this.targetHeadRotationY = 0;
      this.targetNeckRotationX = 0;
      this.targetNeckRotationY = 0;
      
      // Smooth the rotation angles toward zero
      this.smoothedHeadRotationX = THREE.MathUtils.lerp(
        this.smoothedHeadRotationX,
        0,
        headSmoothingFactor
      );
      this.smoothedHeadRotationY = THREE.MathUtils.lerp(
        this.smoothedHeadRotationY,
        0,
        headSmoothingFactor
      );
      this.smoothedNeckRotationX = THREE.MathUtils.lerp(
        this.smoothedNeckRotationX,
        0,
        headSmoothingFactor * 0.7
      );
      this.smoothedNeckRotationY = THREE.MathUtils.lerp(
        this.smoothedNeckRotationY,
        0,
        headSmoothingFactor * 0.7
      );
      
      // Apply the smoothed rotations
      const headBone = this.vrm.humanoid?.getNormalizedBoneNode('head');
      const neckBone = this.vrm.humanoid?.getNormalizedBoneNode('neck');
      
      if (headBone) {
        const headQuaternion = new THREE.Quaternion();
        headQuaternion.setFromEuler(new THREE.Euler(
          this.smoothedHeadRotationX,
          this.smoothedHeadRotationY,
          0,
          'YXZ'
        ));
        headBone.quaternion.copy(headQuaternion);
      }
      
      if (neckBone) {
        const neckQuaternion = new THREE.Quaternion();
        neckQuaternion.setFromEuler(new THREE.Euler(
          this.smoothedNeckRotationX,
          this.smoothedNeckRotationY,
          0,
          'YXZ'
        ));
        neckBone.quaternion.copy(neckQuaternion);
      }
      
      // Once everything is close enough to default, fully reset
      const threshold = 0.001;
      const eyeDiff = this.smoothedEyeTarget.distanceTo(this.defaultEyeTarget);
      
      if (Math.abs(this.smoothedHeadRotationX) < threshold &&
          Math.abs(this.smoothedHeadRotationY) < threshold &&
          Math.abs(this.smoothedNeckRotationX) < threshold &&
          Math.abs(this.smoothedNeckRotationY) < threshold &&
          eyeDiff < 0.01) {
        // Now we can safely remove the lookAt target
        this.vrm.lookAt.target = null;
        this.vrm.lookAt.autoUpdate = true;
      }
    }
  }
  
  // Helper method to look at a specific point immediately
  lookAtPoint(point) {
    if (!this.enabled || !this.vrm || !this.vrm.lookAt) return;
    
    this.currentTarget.copy(point);
    // Skip smoothing for immediate look
    this.smoothedEyeTarget.copy(point);
    this.targetObject.position.copy(point);
    this.vrm.lookAt.target = this.targetObject;
    this.vrm.lookAt.update(0);
    
    // Also update head immediately if enabled
    if (this.headIntensity > 0) {
      const headBone = this.vrm.humanoid?.getNormalizedBoneNode('head');
      if (headBone) {
        const headWorldPos = new THREE.Vector3();
        headBone.getWorldPosition(headWorldPos);
        
        const direction = new THREE.Vector3();
        direction.subVectors(point, headWorldPos).normalize();
        
        const horizontal = Math.atan2(direction.x, direction.z);
        const vertical = Math.asin(Math.max(-1, Math.min(1, direction.y)));
        
        this.targetHeadRotationY = horizontal * this.headIntensity;
        this.targetHeadRotationX = vertical * this.headIntensity;
        this.smoothedHeadRotationX = this.targetHeadRotationX;
        this.smoothedHeadRotationY = this.targetHeadRotationY;
      }
    }
  }
  
  // Reset look direction
  reset() {
    if (!this.vrm || !this.vrm.lookAt) return;
    
    // Don't immediately reset - let the update method handle it smoothly
    // Just ensure tracking is disabled
    this.enabled = false;
  }
  
  // Get debug info
  getDebugInfo() {
    return {
      currentTarget: this.currentTarget.clone(),
      smoothedEyeTarget: this.smoothedEyeTarget.clone(),
      targetHeadRotation: {
        x: THREE.MathUtils.radToDeg(this.targetHeadRotationX),
        y: THREE.MathUtils.radToDeg(this.targetHeadRotationY)
      },
      smoothedHeadRotation: {
        x: THREE.MathUtils.radToDeg(this.smoothedHeadRotationX),
        y: THREE.MathUtils.radToDeg(this.smoothedHeadRotationY)
      }
    };
  }
}