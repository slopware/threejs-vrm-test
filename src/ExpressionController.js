// src/controllers/ExpressionController.js
import * as THREE from "three";

export class ExpressionController {
  constructor(vrm) {
    this.vrm = vrm;
    this.activeExpressions = new Map();
    this.blinkController = new BlinkController();
    this.emotionController = new EmotionController();
  }

  update(currentTime, deltaTime) {
    if (!this.vrm || !this.vrm.expressionManager) return;

    // Update blink
    const blinkValue = this.blinkController.update(currentTime, deltaTime);
    this.vrm.expressionManager.setValue("blink", blinkValue);

    // Update emotions
    const emotions = this.emotionController.getActiveEmotions();
    for (const [emotion, weight] of emotions) {
      this.vrm.expressionManager.setValue(emotion, weight);
    }

    // Update any other active expressions
    for (const [expression, data] of this.activeExpressions) {
      if (data.update) {
        const value = data.update(currentTime, deltaTime);
        this.vrm.expressionManager.setValue(expression, value);
      } else {
        this.vrm.expressionManager.setValue(expression, data.value);
      }
    }
  }

  setExpression(name, value, options = {}) {
    if (options.duration) {
      // Animated expression
      const startTime = performance.now() / 1000;
      const startValue = this.getExpressionValue(name);

      this.activeExpressions.set(name, {
        update: (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / options.duration, 1);
          const eased = options.easing ? options.easing(progress) : progress;
          return startValue + (value - startValue) * eased;
        },
      });
    } else {
      // Static expression
      this.activeExpressions.set(name, { value });
    }
  }

  getExpressionValue(name) {
    return this.vrm.expressionManager?.getValue(name) || 0;
  }

  // List all available expressions
  getAvailableExpressions() {
    if (!this.vrm?.expressionManager) return [];
    return Object.keys(this.vrm.expressionManager.expressions);
  }
}

// Dedicated blink controller
class BlinkController {
  constructor() {
    this.nextBlinkTime = 0;
    this.blinkStartTime = -1;
    this.isBlinking = false;
    this.blinkSpeed = 1.0;
    this.doubleBlinkActive = false;
    this.doubleBlinkCount = 0;

    // Configuration
    this.config = {
      duration: 0.1,
      minInterval: 5.0,
      maxInterval: 15.0,
      doubleBlinkChance: 0.1,
      speedVariation: 0.4,
    };
  }

  update(currentTime, deltaTime) {
    // Start blink if it's time
    if (!this.isBlinking && currentTime >= this.nextBlinkTime) {
      this.startBlink(currentTime);
    }

    // Calculate blink value
    if (this.isBlinking) {
      return this.calculateBlinkValue(currentTime);
    }

    return 0;
  }

  startBlink(currentTime) {
    this.isBlinking = true;
    this.blinkStartTime = currentTime;
    this.blinkSpeed =
      1.0 -
      this.config.speedVariation / 2 +
      Math.random() * this.config.speedVariation;

    // Chance for double blink
    if (
      !this.doubleBlinkActive &&
      Math.random() < this.config.doubleBlinkChance
    ) {
      this.doubleBlinkActive = true;
      this.doubleBlinkCount = 0;
    }
  }

  calculateBlinkValue(currentTime) {
    const adjustedDuration = this.config.duration / this.blinkSpeed;
    const blinkProgress =
      (currentTime - this.blinkStartTime) / adjustedDuration;

    if (blinkProgress >= 1.0) {
      this.endBlink(currentTime);
      return 0;
    }

    // Smooth sine curve for natural blink
    return Math.sin(blinkProgress * Math.PI);
  }

  endBlink(currentTime) {
    this.isBlinking = false;

    if (this.doubleBlinkActive && this.doubleBlinkCount < 1) {
      // Quick second blink
      this.doubleBlinkCount++;
      this.nextBlinkTime = currentTime + 0.1;
    } else {
      // Normal scheduling
      this.doubleBlinkActive = false;
      this.nextBlinkTime =
        currentTime +
        this.config.minInterval +
        Math.random() * (this.config.maxInterval - this.config.minInterval);
    }
  }

  // Allow dynamic configuration
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Emotion controller for managing facial expressions
class EmotionController {
  constructor() {
    this.currentEmotion = null;
    this.emotionWeight = 0;
    this.targetWeight = 0;
    this.transitionSpeed = 2.0; // Units per second
  }

  setEmotion(emotion, weight = 1.0, immediate = false) {
    // Clear previous emotion
    if (this.currentEmotion && this.currentEmotion !== emotion) {
      this.targetWeight = 0;
      // Will switch to new emotion once faded out
      this.pendingEmotion = emotion;
      this.pendingWeight = weight;
    } else {
      this.currentEmotion = emotion;
      this.targetWeight = weight;
      if (immediate) {
        this.emotionWeight = weight;
      }
    }
  }

  getActiveEmotions() {
    const emotions = new Map();

    if (this.currentEmotion && this.emotionWeight > 0) {
      emotions.set(this.currentEmotion, this.emotionWeight);
    }

    // Update weight
    if (this.emotionWeight !== this.targetWeight) {
      const delta = this.targetWeight - this.emotionWeight;
      const change = Math.sign(delta) * this.transitionSpeed * 0.016; // Assume ~60fps

      if (Math.abs(delta) < Math.abs(change)) {
        this.emotionWeight = this.targetWeight;
      } else {
        this.emotionWeight += change;
      }

      // Switch to pending emotion if fully faded out
      if (this.emotionWeight === 0 && this.pendingEmotion) {
        this.currentEmotion = this.pendingEmotion;
        this.targetWeight = this.pendingWeight;
        this.pendingEmotion = null;
      }
    }

    return emotions;
  }

  //   clearEmotion() {
  //     this.targetWeight = 0;
  //   }
}

// Utility functions for common animations
export const ExpressionAnimations = {
  // Easing functions
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOut: (t) => 1 - (1 - t) * (1 - t),

  // Preset animations
  surprise: (controller) => {
    controller.setExpression("surprised", 1.0, {
      duration: 0.2,
      easing: ExpressionAnimations.easeOut,
    });
    setTimeout(() => {
      controller.setExpression("surprised", 0, { duration: 0.5 });
    }, 1000);
  },

  talking: (controller, duration = 2) => {
    const startTime = performance.now() / 1000;
    controller.activeExpressions.set("a", {
      update: (currentTime) => {
        const elapsed = currentTime - startTime;
        if (elapsed > duration) {
          controller.activeExpressions.delete("a");
          return 0;
        }
        // Simulate talking with sine wave
        return Math.abs(Math.sin(elapsed * 8)) * 0.3;
      },
    });
  },
};
