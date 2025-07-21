import * as THREE from "three";

export function createEnvironment(tscene) {
  const scene = tscene;
  const size = 10;
  const divisions = 10;
  const colorCenterLine = 0xfff600;
  const colorGrid = 0xfff600;
  const gridHelper = new THREE.GridHelper(
    size,
    divisions,
    colorCenterLine,
    colorGrid
  );
  scene.add(gridHelper);

  // Function to create a vertical grid plane
  function createVerticalGrid(width, height, divisions, color) {
    const geometry = new THREE.PlaneGeometry(width, height);

    // Create line segments for the grid
    const lines = new THREE.Group();

    // Vertical lines
    for (let i = 0; i <= divisions; i++) {
      const x = (i / divisions - 0.5) * width;
      const points = [
        new THREE.Vector3(x, -height / 2, 0),
        new THREE.Vector3(x, height / 2, 0),
      ];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({ color: color });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      lines.add(line);
    }

    // Horizontal lines
    for (let i = 0; i <= divisions; i++) {
      const y = (i / divisions - 0.5) * height;
      const points = [
        new THREE.Vector3(-width / 2, y, 0),
        new THREE.Vector3(width / 2, y, 0),
      ];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({ color: color });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      lines.add(line);
    }

    return lines;
  }

  // Create three vertical grid planes
  const gridHeight = size; // Same as your horizontal grid size
  const verticalDivisions = divisions; // Same divisions as horizontal grid

  // Back wall (Z = -size/2)
  const backWall = createVerticalGrid(
    size,
    gridHeight,
    verticalDivisions,
    colorGrid
  );
  backWall.position.set(0, gridHeight / 2, -size / 2);
  scene.add(backWall);

  // Right wall (X = size/2, rotated 90 degrees around Y axis)
  const rightWall = createVerticalGrid(
    size,
    gridHeight,
    verticalDivisions,
    colorGrid
  );
  rightWall.position.set(size / 2, gridHeight / 2, 0);
  rightWall.rotation.y = Math.PI / 2;
  scene.add(rightWall);

  // Left wall (X = -size/2, rotated 90 degrees around Y axis)
  const leftWall = createVerticalGrid(
    size,
    gridHeight,
    verticalDivisions,
    colorGrid
  );
  leftWall.position.set(-size / 2, gridHeight / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  scene.add(leftWall);
}
