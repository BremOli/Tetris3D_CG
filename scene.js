// Scene factory (uses global THREE from CDN script)
(function () {
  function createArcadeBackgroundTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 768;
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    // Arcade / retro sala escura: topo índigo, meio magenta-roxo, base quase preto com tom violeta
    g.addColorStop(0, "#3730a3");
    g.addColorStop(0.22, "#5b21b6");
    g.addColorStop(0.45, "#6b21a8");
    g.addColorStop(0.62, "#3b0764");
    g.addColorStop(0.82, "#1e1033");
    g.addColorStop(1, "#0a0418");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Scanlines muito subtis
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let y = 0; y < canvas.height; y += 3) {
      ctx.fillRect(0, y, canvas.width, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  function createScene() {
    const scene = new THREE.Scene();
    scene.background = createArcadeBackgroundTexture();
    // Nevoeiro suave com cor do meio do gradiente — profundidade sem “buraco” preto
    scene.fog = new THREE.Fog(0x4c1d95, 42, 118);
    return scene;
  }

  window.createScene = createScene;
})();
