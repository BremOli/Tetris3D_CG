// Base Tetris logic: gravity, movement, rotation and collisions.
(function () {
  const SHAPES = {
    I: [[-1, 0, 0], [0, 0, 0], [1, 0, 0], [2, 0, 0]],
    O: [[0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 0, 1]],
    T: [[-1, 0, 0], [0, 0, 0], [1, 0, 0], [0, 0, 1]],
    S: [[-1, 0, 0], [0, 0, 0], [0, 0, 1], [1, 0, 1]],
    Z: [[-1, 0, 1], [0, 0, 1], [0, 0, 0], [1, 0, 0]],
    J: [[-1, 0, 1], [-1, 0, 0], [0, 0, 0], [1, 0, 0]],
    L: [[1, 0, 1], [-1, 0, 0], [0, 0, 0], [1, 0, 0]],
  };

  function rotateX90(coords) {
    return coords.map(([x, y, z]) => [x, -z, y]);
  }

  function rotateY90(coords) {
    return coords.map(([x, y, z]) => [z, y, -x]);
  }

  function rotateZ90(coords) {
    return coords.map(([x, y, z]) => [-y, x, z]);
  }

  const LINES_PER_LEVEL = 10;
  const MIN_DROP_INTERVAL = 0.055;
  /** Cada nível multiplica o intervalo base por este fator (<1 = mais rápido). */
  const LEVEL_INTERVAL_FACTOR = 0.9;

  function levelFromTotalLines(totalLines) {
    return 1 + Math.floor(totalLines / LINES_PER_LEVEL);
  }

  function dropIntervalForLevel(baseInterval, level) {
    return Math.max(
      MIN_DROP_INTERVAL,
      baseInterval * Math.pow(LEVEL_INTERVAL_FACTOR, Math.max(0, level - 1))
    );
  }

  function createGame({
    scene,
    dimensions,
    pieceMats,
    dropInterval = 0.6,
    mode = "normal",
    timerDurationSec = 120,
    callbacks = {},
  }) {
    const { onPieceLock, onLayersClear } = callbacks;
    const width = dimensions.width;
    const height = dimensions.height;
    const depth = dimensions.depth;
    const cell = dimensions.cell;

    const occupancy = new Set();
    const landedMap = new Map();
    const landedGroup = new THREE.Group();
    landedGroup.name = "landed-blocks";
    scene.add(landedGroup);
    const ghostGroup = new THREE.Group();
    ghostGroup.name = "ghost-piece";
    scene.add(ghostGroup);

    const cubeGeo = new THREE.BoxGeometry(cell, cell, cell);
    const ghostMats = {};
    for (const [k, mat] of Object.entries(pieceMats)) {
      ghostMats[k] = mat.clone();
      ghostMats[k].transparent = true;
      ghostMats[k].opacity = 0.24;
      ghostMats[k].depthWrite = false;
      ghostMats[k].emissiveIntensity = 0.02;
    }

    const state = {
      running: false,
      paused: false,
      gameOver: false,
      timedOut: false,
      elapsedDrop: 0,
      active: null,
      nextQueue: [],
      score: 0,
      level: 1,
      linesClearedTotal: 0,
      mode,
      timerDurationSec,
      timerRemaining: mode === "sprint" ? timerDurationSec : 0,
      timerActive: mode === "sprint",
      fastDrop: false,
      clearing: null,
      gameOverElapsed: 0,
      lastClearedLayers: 0,
      clearFlash: 0,
    };

    function key(x, y, z) {
      return `${x}|${y}|${z}`;
    }

    function parseKey(k) {
      const [x, y, z] = k.split("|").map(Number);
      return { x, y, z };
    }

    function canPlace(cells) {
      for (const c of cells) {
        if (c.x < 0 || c.x >= width) return false;
        if (c.z < 0 || c.z >= depth) return false;
        if (c.y < 0 || c.y >= height) return false;
        if (occupancy.has(key(c.x, c.y, c.z))) return false;
      }
      return true;
    }

    function worldPos(grid) {
      const x = (grid.x - width / 2 + 0.5) * cell;
      const y = grid.y * cell + 0.5 * cell;
      const z = (grid.z - depth / 2 + 0.5) * cell;
      return new THREE.Vector3(x, y, z);
    }

    function buildCells({ type, origin, rotX = 0, rotY = 0, rotZ = 0 }) {
      let coords = SHAPES[type].map(([x, y, z]) => [x, y, z]);
      for (let i = 0; i < rotX; i++) coords = rotateX90(coords);
      for (let i = 0; i < rotY; i++) coords = rotateY90(coords);
      for (let i = 0; i < rotZ; i++) coords = rotateZ90(coords);
      return coords.map(([x, y, z]) => ({
        x: origin.x + x,
        y: origin.y + y,
        z: origin.z + z,
      }));
    }

    function rebuildActiveMeshes() {
      state.active.group.clear();
      for (const c of state.active.cells) {
        const mesh = new THREE.Mesh(cubeGeo, pieceMats[state.active.type]);
        mesh.position.copy(worldPos(c));
        state.active.group.add(mesh);
      }
      rebuildGhostMeshes();
    }

    function ghostCellsForActive() {
      if (!state.active) return [];
      let dy = 0;
      while (true) {
        const next = state.active.cells.map((c) => ({ x: c.x, y: c.y - (dy + 1), z: c.z }));
        if (!canPlace(next)) break;
        dy++;
      }
      return state.active.cells.map((c) => ({ x: c.x, y: c.y - dy, z: c.z }));
    }

    function rebuildGhostMeshes() {
      ghostGroup.clear();
      if (!state.active || state.clearing) return;
      const cells = ghostCellsForActive();
      for (const c of cells) {
        const mesh = new THREE.Mesh(cubeGeo, ghostMats[state.active.type]);
        mesh.position.copy(worldPos(c));
        ghostGroup.add(mesh);
      }
    }

    function getFullLayers() {
      const full = [];
      for (let y = 0; y < height; y++) {
        let count = 0;
        for (let x = 0; x < width; x++) {
          for (let z = 0; z < depth; z++) {
            if (occupancy.has(key(x, y, z))) count++;
          }
        }
        if (count === width * depth) full.push(y);
      }
      return full;
    }

    function startClearAnimation(layers) {
      const clearingKeys = new Set();
      const meshes = [];
      for (const y of layers) {
        for (let x = 0; x < width; x++) {
          for (let z = 0; z < depth; z++) {
            const k = key(x, y, z);
            if (landedMap.has(k)) {
              clearingKeys.add(k);
              const mesh = landedMap.get(k);
              meshes.push(mesh);
              // Clone material only for clearing: shared transparent materials break depth sort.
              if (!mesh.userData._clearMat) {
                mesh.userData._baseMat = mesh.material;
                mesh.userData._clearMat = mesh.material.clone();
                mesh.material = mesh.userData._clearMat;
              }
              mesh.userData._clearMat.transparent = true;
              mesh.userData._clearMat.opacity = 1;
            }
          }
        }
      }
      state.clearing = {
        layers: [...layers].sort((a, b) => a - b),
        keys: clearingKeys,
        meshes,
        elapsed: 0,
        duration: 0.28,
      };
    }

    function collapseAfterClear(clearedLayers) {
      const clearedSet = new Set(clearedLayers);
      const kept = [];
      for (const [k, mesh] of landedMap.entries()) {
        if (clearedSet.has(parseKey(k).y)) {
          landedGroup.remove(mesh);
          if (mesh.userData._clearMat) {
            mesh.userData._clearMat.dispose();
            mesh.userData._clearMat = null;
          }
          continue;
        }
        kept.push({ mesh, ...parseKey(k) });
      }

      occupancy.clear();
      landedMap.clear();
      for (const b of kept) {
        let drop = 0;
        for (const y of clearedLayers) if (b.y > y) drop++;
        b.y -= drop;
        const nk = key(b.x, b.y, b.z);
        occupancy.add(nk);
        landedMap.set(nk, b.mesh);
        b.mesh.position.copy(worldPos(b));
      }
    }

    function randomPieceType() {
      const types = Object.keys(SHAPES);
      return types[(Math.random() * types.length) | 0];
    }

    const NEXT_QUEUE_SIZE = 3;

    function refillNextQueue() {
      while (state.nextQueue.length < NEXT_QUEUE_SIZE) {
        state.nextQueue.push(randomPieceType());
      }
    }

    function spawn() {
      if (state.nextQueue.length === 0) refillNextQueue();
      const type = state.nextQueue.shift();
      refillNextQueue();
      const ox = Math.floor(width / 2);
      const oz = Math.floor(depth / 2);
      const group = new THREE.Group();
      group.name = `active:${type}`;
      const active = { type, origin: null, rotX: 0, rotY: 0, rotZ: 0, cells: [], group };
      const probeCells = buildCells({
        type,
        origin: { x: ox, y: 0, z: oz },
        rotX: 0,
        rotY: 0,
        rotZ: 0,
      });
      let maxYoff = -Infinity;
      for (const c of probeCells) maxYoff = Math.max(maxYoff, c.y);
      const oy = height - 1 - maxYoff;
      active.origin = { x: ox, y: oy, z: oz };
      active.cells = buildCells(active);
      if (!canPlace(active.cells)) {
        state.gameOver = true;
        state.running = false;
        state.gameOverElapsed = 0;
        ghostGroup.clear();
        return;
      }
      state.active = active;
      rebuildActiveMeshes();
      scene.add(group);
    }

    function tryMove(dx, dy, dz) {
      if (!state.active || !state.running || state.paused) return false;
      const nextOrigin = {
        x: state.active.origin.x + dx,
        y: state.active.origin.y + dy,
        z: state.active.origin.z + dz,
      };
      const nextCells = buildCells({
        type: state.active.type,
        origin: nextOrigin,
        rotX: state.active.rotX,
        rotY: state.active.rotY,
        rotZ: state.active.rotZ,
      });
      if (!canPlace(nextCells)) return false;
      state.active.origin = nextOrigin;
      state.active.cells = nextCells;
      rebuildActiveMeshes();
      return true;
    }

    function tryRotate(axis = "y", dir = 1) {
      if (!state.active || !state.running || state.paused) return false;
      const step = ((dir % 4) + 4) % 4;
      const next = {
        rotX: state.active.rotX,
        rotY: state.active.rotY,
        rotZ: state.active.rotZ,
      };
      if (axis === "x") next.rotX = (next.rotX + step) % 4;
      else if (axis === "z") next.rotZ = (next.rotZ + step) % 4;
      else next.rotY = (next.rotY + step) % 4;

      const nextCells = buildCells({
        type: state.active.type,
        origin: state.active.origin,
        rotX: next.rotX,
        rotY: next.rotY,
        rotZ: next.rotZ,
      });
      if (!canPlace(nextCells)) return false;
      state.active.rotX = next.rotX;
      state.active.rotY = next.rotY;
      state.active.rotZ = next.rotZ;
      state.active.cells = nextCells;
      rebuildActiveMeshes();
      return true;
    }

    function lockPiece() {
      for (const c of state.active.cells) {
        const k = key(c.x, c.y, c.z);
        occupancy.add(k);
        const landed = new THREE.Mesh(cubeGeo, pieceMats[state.active.type]);
        landed.position.copy(worldPos(c));
        landedGroup.add(landed);
        landedMap.set(k, landed);
      }
      scene.remove(state.active.group);
      state.active = null;
      ghostGroup.clear();
      state.score += 10;
      if (typeof onPieceLock === "function") onPieceLock();
      const fullLayers = getFullLayers();
      if (fullLayers.length > 0) {
        state.lastClearedLayers = fullLayers.length;
        state.clearFlash = 0.6;
        state.score += fullLayers.length * 150;
        state.linesClearedTotal += fullLayers.length;
        state.level = levelFromTotalLines(state.linesClearedTotal);
        if (typeof onLayersClear === "function") onLayersClear(fullLayers.length);
        startClearAnimation(fullLayers);
      } else {
        spawn();
      }
    }

    function clearAll() {
      occupancy.clear();
      landedGroup.clear();
      landedMap.clear();
      if (state.active) scene.remove(state.active.group);
      state.active = null;
      state.nextQueue = [];
      ghostGroup.clear();
    }

    function start() {
      clearAll();
      state.running = true;
      state.paused = false;
      state.gameOver = false;
      state.timedOut = false;
      state.score = 0;
      state.level = 1;
      state.linesClearedTotal = 0;
      state.timerRemaining = state.mode === "sprint" ? state.timerDurationSec : 0;
      state.timerActive = state.mode === "sprint";
      state.elapsedDrop = 0;
      state.clearFlash = 0;
      state.lastClearedLayers = 0;
      refillNextQueue();
      spawn();
    }

    function pauseToggle() {
      if (!state.running || state.gameOver) return;
      state.paused = !state.paused;
    }

    function restart() {
      start();
    }

    function update(delta) {
      if (state.clearFlash > 0) state.clearFlash = Math.max(0, state.clearFlash - delta);
      if (state.gameOver) {
        state.gameOverElapsed += delta;
        ghostGroup.clear();
      }

      if (state.clearing) {
        state.clearing.elapsed += delta;
        const t = Math.min(state.clearing.elapsed / state.clearing.duration, 1);
        for (const mesh of state.clearing.meshes) {
          const mat = mesh.userData._clearMat || mesh.material;
          const s = Math.max(0.01, 1 - t * 0.85);
          mesh.scale.setScalar(s);
          mesh.position.y += delta * 2.0;
          mat.opacity = 1 - t;
          mat.emissive = mat.emissive || new THREE.Color(0x000000);
          mat.emissiveIntensity = 0.08 + t * 0.8;
        }
        if (t >= 1) {
          const layers = state.clearing.layers;
          state.clearing = null;
          collapseAfterClear(layers);
          spawn();
        }
        return;
      }

      if (!state.running || state.paused || state.gameOver) return;
      if (state.timerActive) {
        state.timerRemaining = Math.max(0, state.timerRemaining - delta);
        if (state.timerRemaining <= 0) {
          state.running = false;
          state.paused = false;
          state.timedOut = true;
          state.fastDrop = false;
          return;
        }
      }
      const speedMul = state.fastDrop ? 6 : 1;
      state.elapsedDrop += delta * speedMul;
      const stepInterval = dropIntervalForLevel(dropInterval, state.level);
      if (state.elapsedDrop >= stepInterval) {
        state.elapsedDrop = 0;
        const moved = tryMove(0, -1, 0);
        if (!moved) lockPiece();
      }
    }

    function onKeyDown(e) {
      if (!state.running || state.paused || state.gameOver) return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") tryMove(-1, 0, 0);
      else if (e.code === "ArrowRight" || e.code === "KeyD") tryMove(1, 0, 0);
      else if (e.code === "ArrowUp" || e.code === "KeyW") tryMove(0, 0, -1);
      else if (e.code === "ArrowDown" || e.code === "KeyS" || e.code === "KeyX") tryMove(0, 0, 1);
      else if (e.code === "ShiftLeft" || e.code === "ShiftRight") state.fastDrop = true;
      else if (e.code === "Space") {
        e.preventDefault();
        tryRotate("y", 1); // around self (yaw)
      } else if (e.code === "KeyQ") {
        tryRotate("x", 1); // tilt up/down
      } else if (e.code === "KeyE") {
        tryRotate("x", 3);
      } else if (e.code === "KeyZ") {
        tryRotate("z", 1);
      } else if (e.code === "KeyC") {
        tryRotate("z", 3);
      }
    }

    function onKeyUp(e) {
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        state.fastDrop = false;
      }
    }

    return {
      state,
      start,
      pauseToggle,
      restart,
      update,
      onKeyDown,
      onKeyUp,
      controls: { tryMove, tryRotate },
    };
  }

  window.createGame = createGame;
  window.TetrisGameShapes = SHAPES;
})();

