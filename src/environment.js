import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// This will hold the currently active environment object so we can remove it later.
let currentEnvObject = null;
const gltfLoader = new GLTFLoader();

/**
 * A list of available environments for the GUI.
 */
export const availableEnvironments = ["Holodeck", "Cafe", "None"];

/**
 * Creates the holodeck grid environment.
 * @returns {THREE.Group} A group containing all the grid lines.
 */
function createHolodeck() {
  const group = new THREE.Group();
  const size = 10;
  const divisions = 10;
  const color = 0xfff600; // Yellow color for the grid

  // Horizontal grid on the floor
  const gridHelper = new THREE.GridHelper(size, divisions, color, color);
  group.add(gridHelper);

  // Helper to create a single vertical grid plane
  function createVerticalGrid(width, height, divisions, color) {
    const lines = new THREE.Group();
    // Vertical lines
    for (let i = 0; i <= divisions; i++) {
      const x = (i / divisions - 0.5) * width;
      const points = [
        new THREE.Vector3(x, -height / 2, 0),
        new THREE.Vector3(x, height / 2, 0),
      ];
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color })
      );
      lines.add(line);
    }
    // Horizontal lines
    for (let i = 0; i <= divisions; i++) {
      const y = (i / divisions - 0.5) * height;
      const points = [
        new THREE.Vector3(-width / 2, y, 0),
        new THREE.Vector3(width / 2, y, 0),
      ];
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color })
      );
      lines.add(line);
    }
    return lines;
  }

  // Back wall
  const backWall = createVerticalGrid(size, size, divisions, color);
  backWall.position.set(0, size / 2, -size / 2);
  group.add(backWall);

  // Right wall
  const rightWall = createVerticalGrid(size, size, divisions, color);
  rightWall.position.set(size / 2, size / 2, 0);
  rightWall.rotation.y = Math.PI / 2;
  group.add(rightWall);

  // Left wall
  const leftWall = createVerticalGrid(size, size, divisions, color);
  leftWall.position.set(-size / 2, size / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  group.add(leftWall);

  return group;
}

/**
 * Removes the old environment and loads a new one into the scene.
 * @param {string} name The name of the environment to load (e.g., "Holodeck", "Cafe").
 * @param {THREE.Scene} scene The scene to add the environment to.
 */
export function loadEnvironment(name, scene) {
  // 1. Clean up the old environment if it exists
  if (currentEnvObject) {
    scene.remove(currentEnvObject);
    // You can add more complex disposal logic here if needed
    currentEnvObject = null;
  }

  // 2. Load the new environment based on its name
  switch (name) {
    case "Holodeck":
      currentEnvObject = createHolodeck();
      scene.add(currentEnvObject);
      break;

    case "Cafe":
      gltfLoader.load(
        "./environments/free_isometric_cafe/scene.gltf",
        (gltf) => {
          currentEnvObject = gltf.scene;
          // You can adjust the model's position, scale, etc., here if needed
          // currentEnvObject.scale.set(1.5, 1.5, 1.5);

          // --- ROTATION AND SCALE MODIFICATIONS ---
          // Rotate 45 degrees around the vertical (Y) axis.
          // Math.PI / 4 is 45 degrees in radians.
          currentEnvObject.rotation.y = Math.PI / 4;
          currentEnvObject.scale.set(1.4, 1.4, 1.4);
          currentEnvObject.position.set(-0.3, -0.23, 0.3);

          scene.add(currentEnvObject);
          console.log("Cafe environment loaded.");
        },
        undefined, // onProgress callback not needed
        (error) => {
          console.error("Error loading Cafe environment:", error);
        }
      );
      break;

    case "None":
    default:
      // Do nothing, the environment is already cleared.
      break;
  }
}
