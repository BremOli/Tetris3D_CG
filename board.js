// 3D board factory (uses global THREE from CDN script)
(function () {
  function createBoard({
    width = 10,
    height = 20,
    depth = 10,
    cell = 1,
    floorMaterial,
    wallMaterial,
  } = {}) {
    const group = new THREE.Group();
    group.name = "board";

    const w = width * cell;
    const h = height * cell;
    const d = depth * cell;

    // Center the board volume around X/Z=0 and place its "floor" at y=0.
    // So the playable volume is y in [0..h].
    group.position.set(0, 0, 0);

    // Floor
    const floorThickness = 0.4 * cell;
    const floorGeo = new THREE.BoxGeometry(w, floorThickness, d);
    const floorMat =
      floorMaterial ||
      new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.9,
        metalness: 0.0,
      });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -floorThickness / 2, 0);
    group.add(floor);

    // Subtle grid on the floor to hint cell sizes
    const grid = new THREE.GridHelper(
      Math.max(w, d),
      Math.max(width, depth),
      0x334155,
      0x1f2937
    );
    grid.position.set(0, 0.001, 0); // avoid z-fighting with floor
    group.add(grid);

    // Bounding edges for the playable volume
    const boundsGeo = new THREE.BoxGeometry(w, h, d);
    const edgesGeo = new THREE.EdgesGeometry(boundsGeo);
    const edges = new THREE.LineSegments(
      edgesGeo,
      new THREE.LineBasicMaterial({ color: 0x94a3b8 })
    );
    edges.position.set(0, h / 2, 0);
    group.add(edges);

    // Back wall (slightly transparent)
    const wallThickness = 0.25 * cell;
    const wallMat =
      wallMaterial ||
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        transparent: true,
        opacity: 0.22,
        roughness: 1.0,
        metalness: 0.0,
      });

    const backWallGeo = new THREE.BoxGeometry(w, h, wallThickness);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, h / 2, -d / 2 - wallThickness / 2);
    group.add(backWall);

    // Side walls
    const sideWallGeo = new THREE.BoxGeometry(wallThickness, h, d);
    const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
    leftWall.position.set(-w / 2 - wallThickness / 2, h / 2, 0);
    group.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
    rightWall.position.set(w / 2 + wallThickness / 2, h / 2, 0);
    group.add(rightWall);

    // Helper axis (small) near the origin
    const axes = new THREE.AxesHelper(2.5);
    axes.position.set(-w / 2 - 2, 0, d / 2 + 2);
    group.add(axes);

    // Return both the group and dimensions (handy later for spawning pieces)
    return { group, dimensions: { width, height, depth, cell, w, h, d } };
  }

  window.createBoard = createBoard;
})();

