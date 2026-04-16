// Tetromino pieces built from 4 cubes (BoxGeometry)
(function () {
  // Coordinates are in "cells" on the XZ plane, with Y as vertical.
  // Each tetromino is centered around (0,0) roughly for nicer rotations later.
  const SHAPES = {
    // ----
    I: [
      [-1.5, 0],
      [-0.5, 0],
      [0.5, 0],
      [1.5, 0],
    ],
    // square
    O: [
      [-0.5, -0.5],
      [0.5, -0.5],
      [-0.5, 0.5],
      [0.5, 0.5],
    ],
    //  T
    T: [
      [-1, 0],
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    //  S
    S: [
      [-1, 0],
      [0, 0],
      [0, 1],
      [1, 1],
    ],
    //  Z
    Z: [
      [-1, 1],
      [0, 1],
      [0, 0],
      [1, 0],
    ],
    //  J
    J: [
      [-1, 1],
      [-1, 0],
      [0, 0],
      [1, 0],
    ],
    //  L
    L: [
      [1, 1],
      [-1, 0],
      [0, 0],
      [1, 0],
    ],
  };

  function createTetromino(type, { cell = 1, material } = {}) {
    const coords = SHAPES[type];
    if (!coords) throw new Error(`Unknown tetromino type: ${type}`);

    const group = new THREE.Group();
    group.name = `tetromino:${type}`;

    const geo = new THREE.BoxGeometry(cell, cell, cell);
    const mat =
      material ||
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });

    for (const [x, z] of coords) {
      const cube = new THREE.Mesh(geo, mat);
      cube.position.set(x * cell, 0.5 * cell, z * cell);
      group.add(cube);
    }

    return group;
  }

  function listTetrominoTypes() {
    return Object.keys(SHAPES);
  }

  window.createTetromino = createTetromino;
  window.listTetrominoTypes = listTetrominoTypes;
})();

