// Entry point (Three.js loaded globally in index.html)
const scene = window.createScene();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const camera = window.createCamera({
  aspect: window.innerWidth / window.innerHeight,
});

window.addLights(scene);

const { pieceMats, floorMat, wallMat } = window.createMaterials();

// Board (tabuleiro 3D)
const { group: board } = window.createBoard({
  width: 10,
  height: 20,
  depth: 10,
  cell: 1,
  floorMaterial: floorMat,
  wallMaterial: wallMat,
});
scene.add(board);

// Orbit controls (camera)
const controls = window.createControls({ camera, renderer });

// Show all 7 tetromino pieces (demo gallery for Stage 1)
const types = window.listTetrominoTypes();
types.forEach((t, i) => {
  const piece = window.createTetromino(t, { cell: 1, material: pieceMats[t] });
  piece.position.set(14, 1.5 + i * 2.1, 0);
  piece.rotation.y = -0.35;
  scene.add(piece);
});

// One active preview piece inside the board volume
const activePreview = window.createTetromino("T", { cell: 1, material: pieceMats.T });
activePreview.position.set(0, 18, 0);
scene.add(activePreview);

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener("resize", onResize);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  activePreview.rotation.y += 0.01;
  renderer.render(scene, camera);
}

animate();