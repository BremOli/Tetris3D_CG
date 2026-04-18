// Entry point (Three.js loaded globally in index.html)
const scene = window.createScene();
const clock = new THREE.Clock();

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  logarithmicDepthBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.classList.add("is-intro");

window.addLights(scene);
const { pieceMats, floorMat, wallMat } = window.createMaterials();

const { group: board, dimensions } = window.createBoard({
  width: 6,
  height: 12,
  depth: 6,
  cell: 0.82,
  floorMaterial: floorMat,
  wallMaterial: wallMat,
});
scene.add(board);

const playfieldMidY = dimensions.h * 0.5;
const playfieldSpan = Math.max(dimensions.w, dimensions.d);

const camera = window.createCamera({
  aspect: window.innerWidth / window.innerHeight,
});

const controls = window.createControls({
  camera,
  renderer,
});
controls.enabled = false;

const cameraPresets = [
  {
    name: "Frontal",
    position: new THREE.Vector3(
      0,
      playfieldMidY + playfieldSpan * 0.88,
      playfieldSpan * 3.05
    ),
    target: new THREE.Vector3(0, playfieldMidY, 0),
  },
  {
    name: "Diagonal Direita",
    position: new THREE.Vector3(
      playfieldSpan * 2.45,
      playfieldMidY + playfieldSpan * 0.92,
      playfieldSpan * 2.45
    ),
    target: new THREE.Vector3(0, playfieldMidY, 0),
  },
  {
    name: "Diagonal Esquerda",
    position: new THREE.Vector3(
      -playfieldSpan * 1.95,
      playfieldMidY + playfieldSpan * 0.88,
      playfieldSpan * 2.05
    ),
    target: new THREE.Vector3(0, playfieldMidY, 0),
  },
  {
    name: "Topo Inclinado",
    position: new THREE.Vector3(
      0,
      playfieldMidY + playfieldSpan * 2.05,
      playfieldSpan * 1.42
    ),
    target: new THREE.Vector3(0, playfieldMidY, 0),
  },
];
let currentCameraPreset = 1;
const camBlend = {
  active: false,
  elapsed: 0,
  duration: 0.45,
  fromPos: new THREE.Vector3(),
  toPos: new THREE.Vector3(),
  fromTarget: new THREE.Vector3(),
  toTarget: new THREE.Vector3(),
};

function applyCameraPreset(index, smooth = true) {
  const i = (index + cameraPresets.length) % cameraPresets.length;
  currentCameraPreset = i;
  const p = cameraPresets[i];
  if (!smooth) {
    camera.position.copy(p.position);
    controls.target.copy(p.target);
    controls.update();
    camBlend.active = false;
    return;
  }
  camBlend.active = true;
  camBlend.elapsed = 0;
  camBlend.fromPos.copy(camera.position);
  camBlend.toPos.copy(p.position);
  camBlend.fromTarget.copy(controls.target);
  camBlend.toTarget.copy(p.target);
}

function updateCameraBlend(delta) {
  if (!camBlend.active) return;
  camBlend.elapsed += delta;
  const t = Math.min(camBlend.elapsed / camBlend.duration, 1);
  const eased = 1 - Math.pow(1 - t, 3);
  camera.position.lerpVectors(camBlend.fromPos, camBlend.toPos, eased);
  controls.target.lerpVectors(camBlend.fromTarget, camBlend.toTarget, eased);
  if (t >= 1) camBlend.active = false;
}

applyCameraPreset(currentCameraPreset, false);

const gameAudio = window.createGameAudio();

const game = window.createGame({
  scene,
  dimensions,
  pieceMats,
  dropInterval: 0.55,
  callbacks: {
    onPieceLock: () => gameAudio.playLock(),
    onLayersClear: (n) => gameAudio.playLayerClear(n),
  },
});

let hasStartedAtLeastOnce = false;

const ui3d = window.createUI3D(scene, {
  panelX: dimensions.w * 0.5 + 5.2,
  buttonYs: [
    playfieldMidY + 1.75,
    playfieldMidY + 0.05,
    playfieldMidY - 1.65,
  ],
});
window.createRaycastInteraction({
  renderer,
  scene,
  interactables: ui3d.interactables,
  getCamera: () => camera,
  onAction(action) {
    if (action === "start") {
      game.start();
      hasStartedAtLeastOnce = true;
    }
    else if (action === "pause") game.pauseToggle();
    else if (action === "restart") requestRestart();
  },
});

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", onResize);

const scoreHud = document.createElement("div");
scoreHud.className = "score-hud";
scoreHud.setAttribute("aria-live", "polite");
scoreHud.innerHTML =
  '<span class="score-hud__label">Pontos</span><span class="score-hud__value" id="score-hud-value">0</span>' +
  '<span class="score-hud__label score-hud__label--spaced">Nível</span>' +
  '<span class="score-hud__level" id="score-hud-level">1</span>' +
  '<span class="score-hud__sub" id="score-hud-lines">0 / 10 linhas para o nível seguinte</span>';
scoreHud.style.pointerEvents = "none";
document.body.appendChild(scoreHud);

const partidaHint = document.createElement("div");
partidaHint.className = "partida-hint";
partidaHint.id = "partida-hint";
partidaHint.hidden = true;
partidaHint.innerHTML =
  '<span class="partida-hint__text">Pressiona <kbd>Enter</kbd> ou o botao <strong>Start</strong> (3D) para comecar a partida</span>';
document.body.appendChild(partidaHint);

/** Alinhar com `LINES_PER_LEVEL` em game.js */
const LINES_PER_LEVEL_HUD = 10;

function updateHUD() {
  const valueEl = document.getElementById("score-hud-value");
  if (valueEl) valueEl.textContent = String(game.state.score);

  const levelEl = document.getElementById("score-hud-level");
  if (levelEl) levelEl.textContent = String(game.state.level);

  const linesEl = document.getElementById("score-hud-lines");
  if (linesEl) {
    const p = game.state.linesClearedTotal % LINES_PER_LEVEL_HUD;
    linesEl.textContent = `${p} / ${LINES_PER_LEVEL_HUD} linhas para o nível seguinte`;
  }

  const startEl = document.getElementById("start-screen");
  const introDone =
    !startEl || startEl.classList.contains("start-screen--hidden");
  const showPartida = introDone && !game.state.running && !hasStartedAtLeastOnce;
  if (partidaHint) {
    partidaHint.hidden = !showPartida;
  }

  if (ui3d && typeof ui3d.setActionVisible === "function") {
    ui3d.setActionVisible("start", !game.state.running);
  }
}
updateHUD();

const gameToolbar = document.createElement("div");
gameToolbar.className = "game-toolbar";
document.body.appendChild(gameToolbar);

const btnCamera = document.createElement("button");
btnCamera.type = "button";
btnCamera.className = "game-icon-btn";
btnCamera.title = "Camaras";
btnCamera.setAttribute("aria-label", "Camaras");
btnCamera.innerHTML =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>';
gameToolbar.appendChild(btnCamera);

const btnSettings = document.createElement("button");
btnSettings.type = "button";
btnSettings.className = "game-icon-btn";
btnSettings.title = "Definicoes";
btnSettings.setAttribute("aria-label", "Definicoes");
btnSettings.innerHTML =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';
gameToolbar.appendChild(btnSettings);

const btnInfo = document.createElement("button");
btnInfo.type = "button";
btnInfo.className = "game-icon-btn";
btnInfo.title = "Informacao e comandos";
btnInfo.setAttribute("aria-label", "Informacao");
btnInfo.innerHTML =
  '<span class="game-icon-btn__i" aria-hidden="true">i</span>';
gameToolbar.appendChild(btnInfo);

const modalCameras = document.createElement("div");
modalCameras.id = "modal-cameras";
modalCameras.className = "game-modal";
modalCameras.hidden = true;
modalCameras.setAttribute("aria-hidden", "true");
modalCameras.setAttribute("role", "dialog");
modalCameras.setAttribute("aria-modal", "true");
modalCameras.setAttribute("aria-labelledby", "modal-cameras-title");
modalCameras.innerHTML = `
  <div class="game-modal__panel camera-modal__panel">
    <button type="button" class="game-modal__close" aria-label="Fechar">&times;</button>
    <h2 id="modal-cameras-title" class="game-modal__title">Camaras</h2>
    <p class="camera-modal__hint">Escolhe a vista ou usa as teclas <kbd>1</kbd> a <kbd>4</kbd></p>
    <div class="camera-preset-grid" id="camera-preset-grid"></div>
  </div>
`;
document.body.appendChild(modalCameras);

const cameraPresetGrid = document.getElementById("camera-preset-grid");
cameraPresets.forEach((preset, idx) => {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "camera-preset-card";
  card.dataset.index = String(idx);
  card.innerHTML = `
    <span class="camera-preset-card__kbd">${idx + 1}</span>
    <span class="camera-preset-card__name">${preset.name}</span>
  `;
  card.addEventListener("click", () => {
    applyCameraPreset(idx, true);
    refreshCameraModal();
    closeModal("modal-cameras");
  });
  cameraPresetGrid.appendChild(card);
});

function refreshCameraModal() {
  modalCameras.querySelectorAll(".camera-preset-card").forEach((card, i) => {
    card.classList.toggle("camera-preset-card--active", i === currentCameraPreset);
  });
}
refreshCameraModal();

btnCamera.addEventListener("click", () => {
  refreshCameraModal();
  openModal("modal-cameras");
});
modalCameras.querySelector(".game-modal__close").addEventListener("click", () => {
  closeModal("modal-cameras");
});
modalCameras.addEventListener("click", (e) => {
  if (e.target === modalCameras) closeModal("modal-cameras");
});

function openModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.hidden = false;
    m.setAttribute("aria-hidden", "false");
  }
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.hidden = true;
    m.setAttribute("aria-hidden", "true");
  }
}

function setupModal(id, openBtn, closeSelector) {
  const root = document.getElementById(id);
  if (!root) return;
  openBtn.addEventListener("click", () => openModal(id));
  root.querySelectorAll(closeSelector).forEach((el) => {
    el.addEventListener("click", () => closeModal(id));
  });
  root.addEventListener("click", (e) => {
    if (e.target === root) closeModal(id);
  });
}

const modalSettings = document.createElement("div");
modalSettings.id = "modal-settings";
modalSettings.className = "game-modal";
modalSettings.hidden = true;
modalSettings.setAttribute("aria-hidden", "true");
modalSettings.setAttribute("role", "dialog");
modalSettings.setAttribute("aria-modal", "true");
modalSettings.setAttribute("aria-labelledby", "modal-settings-title");
modalSettings.innerHTML = `
  <div class="game-modal__panel game-modal__panel--settings">
    <button type="button" class="game-modal__close" aria-label="Fechar">&times;</button>
    <h2 id="modal-settings-title" class="game-modal__title">Definicoes</h2>
    <div class="settings-section">
      <h3 class="game-modal__h3">Musica</h3>
      <label class="settings-row">
        <input type="checkbox" id="settings-music-mute" />
        <span>Silenciar musica</span>
      </label>
      <label class="settings-row settings-row--slider">
        <span>Volume da musica</span>
        <input type="range" id="settings-music-vol" min="0" max="100" step="1" />
        <span class="settings-value" id="settings-music-vol-label">40%</span>
      </label>
    </div>
    <div class="settings-section">
      <h3 class="game-modal__h3">Efeitos sonoros</h3>
      <label class="settings-row">
        <input type="checkbox" id="settings-sfx-on" checked />
        <span>Ativar efeitos (queda / limpeza)</span>
      </label>
      <label class="settings-row settings-row--slider">
        <span>Volume dos efeitos</span>
        <input type="range" id="settings-sfx-vol" min="0" max="100" step="1" />
        <span class="settings-value" id="settings-sfx-vol-label">55%</span>
      </label>
    </div>
  </div>
`;
document.body.appendChild(modalSettings);

function syncSettingsUI() {
  const s = gameAudio.getSettings();
  const mMute = document.getElementById("settings-music-mute");
  const mVol = document.getElementById("settings-music-vol");
  const mLab = document.getElementById("settings-music-vol-label");
  const sfxOn = document.getElementById("settings-sfx-on");
  const sfxVol = document.getElementById("settings-sfx-vol");
  const sfxLab = document.getElementById("settings-sfx-vol-label");
  if (mMute) mMute.checked = s.musicMuted;
  if (mVol) mVol.value = String(Math.round(s.musicVolume * 100));
  if (mLab) mLab.textContent = `${Math.round(s.musicVolume * 100)}%`;
  if (sfxOn) sfxOn.checked = s.sfxEnabled;
  if (sfxVol) sfxVol.value = String(Math.round(s.sfxVolume * 100));
  if (sfxLab) sfxLab.textContent = `${Math.round(s.sfxVolume * 100)}%`;
}

function wireSettingsAudio() {
  const mMute = document.getElementById("settings-music-mute");
  const mVol = document.getElementById("settings-music-vol");
  const mLab = document.getElementById("settings-music-vol-label");
  const sfxOn = document.getElementById("settings-sfx-on");
  const sfxVol = document.getElementById("settings-sfx-vol");
  const sfxLab = document.getElementById("settings-sfx-vol-label");

  mMute.addEventListener("change", () => {
    gameAudio.setMusicMuted(mMute.checked);
    syncSettingsUI();
  });
  mVol.addEventListener("input", () => {
    const v = Number(mVol.value) / 100;
    gameAudio.setMusicVolume(v);
    if (mLab) mLab.textContent = `${mVol.value}%`;
  });
  sfxOn.addEventListener("change", () => {
    gameAudio.setSfxEnabled(sfxOn.checked);
    syncSettingsUI();
  });
  sfxVol.addEventListener("input", () => {
    const v = Number(sfxVol.value) / 100;
    gameAudio.setSfxVolume(v);
    if (sfxLab) sfxLab.textContent = `${sfxVol.value}%`;
  });
}

wireSettingsAudio();
btnSettings.addEventListener("click", () => {
  syncSettingsUI();
  gameAudio.resume();
});

const modalInfo = document.createElement("div");
modalInfo.id = "modal-info";
modalInfo.className = "game-modal";
modalInfo.hidden = true;
modalInfo.setAttribute("aria-hidden", "true");
modalInfo.setAttribute("role", "dialog");
modalInfo.setAttribute("aria-modal", "true");
modalInfo.setAttribute("aria-labelledby", "modal-info-title");
modalInfo.innerHTML = `
  <div class="game-modal__panel game-modal__panel--wide">
    <button type="button" class="game-modal__close" aria-label="Fechar">&times;</button>
    <h2 id="modal-info-title" class="game-modal__title">Como jogar</h2>
    <div class="game-modal__sections">
      <section>
        <h3 class="game-modal__h3">Regras</h3>
        <ul class="game-modal__list">
          <li>Encaixa as pecas (tetrominos) no tabuleiro 3D.</li>
          <li>Preenche uma camada horizontal completa para a limpar e ganhar pontos.</li>
          <li>Evita que a pilha chegue ao topo — senao e <strong>game over</strong>.</li>
        </ul>
      </section>
      <section>
        <h3 class="game-modal__h3">Controlos</h3>
        <ul class="game-modal__list">
          <li><strong>Movimento:</strong> setas ou <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> (inclui profundidade).</li>
          <li><strong>Rotacao:</strong> <kbd>Space</kbd> (eixo Y), <kbd>Q</kbd>/<kbd>E</kbd> (inclinar X), <kbd>Z</kbd>/<kbd>C</kbd> (eixo Z).</li>
          <li><strong>Queda rapida:</strong> mantem <kbd>Shift</kbd>.</li>
          <li><strong>Camara:</strong> rato (orbitar), teclas <kbd>1</kbd>–<kbd>4</kbd> ou o botao de camara no canto superior direito.</li>
          <li><strong>Jogo:</strong> <kbd>Enter</kbd> comecar partida (apos entrar no jogo), <kbd>Esc</kbd> pausa, <kbd>R</kbd> reiniciar.</li>
          <li><strong>Som:</strong> musica e efeitos nas <strong>Definicoes</strong> (icone de engrenagem).</li>
        </ul>
      </section>
    </div>
  </div>
`;
document.body.appendChild(modalInfo);

setupModal("modal-settings", btnSettings, ".game-modal__close");
setupModal("modal-info", btnInfo, ".game-modal__close");

const modalRestart = document.createElement("div");
modalRestart.id = "modal-restart";
modalRestart.className = "game-modal";
modalRestart.hidden = true;
modalRestart.setAttribute("aria-hidden", "true");
modalRestart.setAttribute("role", "dialog");
modalRestart.setAttribute("aria-modal", "true");
modalRestart.setAttribute("aria-labelledby", "modal-restart-title");
modalRestart.innerHTML = `
  <div class="game-modal__panel" style="max-width: 420px;">
    <h2 id="modal-restart-title" class="game-modal__title">Reiniciar partida?</h2>
    <p style="margin: 0 0 14px; color: #cbd5e1; line-height: 1.45;">
      Vais perder o progresso da partida atual.
    </p>
    <div style="display:flex; gap:10px; justify-content:flex-end;">
      <button type="button" id="restart-cancel-btn" class="game-icon-btn" style="min-width: 110px;">Cancelar</button>
      <button type="button" id="restart-confirm-btn" class="game-icon-btn" style="min-width: 110px;">Reiniciar</button>
    </div>
  </div>
`;
document.body.appendChild(modalRestart);

function closeRestartModal(shouldResume = true) {
  closeModal("modal-restart");
  if (shouldResume && closeRestartModal._resumeAfterClose) {
    game.pauseToggle();
  }
  closeRestartModal._resumeAfterClose = false;
}

function openRestartModal() {
  closeRestartModal._resumeAfterClose = false;
  if (game.state.running && !game.state.paused && !game.state.gameOver) {
    game.pauseToggle();
    closeRestartModal._resumeAfterClose = true;
  }
  openModal("modal-restart");
}

function requestRestart() {
  if (game.state.gameOver) {
    game.restart();
    hasStartedAtLeastOnce = true;
    return;
  }
  openRestartModal();
}

const restartCancelBtn = document.getElementById("restart-cancel-btn");
const restartConfirmBtn = document.getElementById("restart-confirm-btn");
if (restartCancelBtn) {
  restartCancelBtn.addEventListener("click", closeRestartModal);
}
if (restartConfirmBtn) {
  restartConfirmBtn.addEventListener("click", () => {
    closeRestartModal(false);
    game.restart();
    hasStartedAtLeastOnce = true;
  });
}
modalRestart.addEventListener("click", (e) => {
  if (e.target === modalRestart) closeRestartModal();
});

const statusOverlay = document.createElement("div");
statusOverlay.style.position = "fixed";
statusOverlay.style.inset = "0";
statusOverlay.style.width = "100%";
statusOverlay.style.height = "100%";
statusOverlay.style.display = "none";
statusOverlay.style.alignItems = "center";
statusOverlay.style.justifyContent = "center";
statusOverlay.style.boxSizing = "border-box";
statusOverlay.style.padding = "24px 32px";
statusOverlay.style.background = "rgba(2, 6, 23, 0.82)";
statusOverlay.style.color = "#f8fafc";
statusOverlay.style.fontFamily = "Arial, sans-serif";
statusOverlay.style.fontWeight = "700";
statusOverlay.style.fontSize = "clamp(22px, 4vw, 36px)";
statusOverlay.style.letterSpacing = "1px";
statusOverlay.style.textAlign = "center";
statusOverlay.style.lineHeight = "1.25";
statusOverlay.style.pointerEvents = "none";
statusOverlay.style.zIndex = "18";
const statusText = document.createElement("div");
statusText.style.maxWidth = "min(92vw, 720px)";
statusText.style.textAlign = "center";
statusText.style.wordBreak = "break-word";
statusText.style.textShadow = "0 2px 12px rgba(0,0,0,0.85)";
statusOverlay.appendChild(statusText);
document.body.appendChild(statusOverlay);

const clearFlash = document.createElement("div");
clearFlash.style.position = "fixed";
clearFlash.style.left = "50%";
clearFlash.style.top = "90px";
clearFlash.style.transform = "translateX(-50%)";
clearFlash.style.padding = "8px 14px";
clearFlash.style.borderRadius = "8px";
clearFlash.style.background = "rgba(8,145,178,0.85)";
clearFlash.style.color = "#ecfeff";
clearFlash.style.font = "700 15px Arial, sans-serif";
clearFlash.style.display = "none";
clearFlash.style.pointerEvents = "none";
clearFlash.style.zIndex = "19";
document.body.appendChild(clearFlash);

const startScreen = document.getElementById("start-screen");
const startGameBtn = document.getElementById("start-game-btn");

function beginPlayFromIntro() {
  const el = document.getElementById("start-screen");
  if (!el || el.classList.contains("start-screen--hidden")) return;
  el.classList.add("start-screen--hidden");
  document.body.classList.remove("is-intro");
  controls.enabled = true;
  hasStartedAtLeastOnce = false;
  updateHUD();
  refreshCameraModal();
  gameAudio.resume().then(() => {
    const s = gameAudio.getSettings();
    if (!s.musicMuted) gameAudio.startMusicLoop();
  });
}

if (startGameBtn) {
  startGameBtn.addEventListener("click", beginPlayFromIntro);
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Escape") {
    const wasOpen =
      !modalSettings.hidden ||
      !modalInfo.hidden ||
      !modalCameras.hidden ||
      !modalRestart.hidden;
    closeModal("modal-settings");
    closeModal("modal-info");
    closeModal("modal-cameras");
    closeModal("modal-restart");
    if (wasOpen) return;
  }

  if (startScreen && !startScreen.classList.contains("start-screen--hidden")) {
    if (e.code === "Enter" || e.code === "Space") {
      e.preventDefault();
      beginPlayFromIntro();
    }
    return;
  }

  if (e.code === "Digit1") {
    applyCameraPreset(0, true);
    refreshCameraModal();
  } else if (e.code === "Digit2") {
    applyCameraPreset(1, true);
    refreshCameraModal();
  } else if (e.code === "Digit3") {
    applyCameraPreset(2, true);
    refreshCameraModal();
  } else if (e.code === "Digit4") {
    applyCameraPreset(3, true);
    refreshCameraModal();
  } else if (e.code === "Enter" && !game.state.running) {
    game.start();
    hasStartedAtLeastOnce = true;
  } else if (e.code === "Escape") {
    game.pauseToggle();
  } else if (e.code === "KeyR") {
    requestRestart();
  } else {
    game.onKeyDown(e);
  }
});
window.addEventListener("keyup", (e) => game.onKeyUp(e));

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  updateCameraBlend(delta);
  controls.update();
  game.update(delta);
  updateHUD();

  if (game.state.gameOver) {
    statusOverlay.style.display = "flex";
    statusText.textContent = "GAME OVER — Pressiona R para reiniciar";
  } else if (game.state.paused) {
    statusOverlay.style.display = "flex";
    statusText.textContent = "PAUSA";
  } else {
    statusOverlay.style.display = "none";
  }

  if (game.state.clearFlash > 0 && game.state.lastClearedLayers > 0) {
    clearFlash.style.display = "block";
    clearFlash.textContent =
      game.state.lastClearedLayers === 1
        ? "Linha limpa!"
        : `${game.state.lastClearedLayers} linhas limpas!`;
    clearFlash.style.opacity = String(Math.min(1, game.state.clearFlash * 1.8));
  } else {
    clearFlash.style.display = "none";
  }

  renderer.render(scene, camera);
}

animate();