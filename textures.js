// Procedural textures & materials (uses global THREE from CDN script)
(function () {
  function makeCanvasTexture(drawFn, { size = 256 } = {}) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    drawFn(ctx, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }

  function createPieceTexture({ base = "#22c55e" } = {}) {
    return makeCanvasTexture((ctx, s) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, s, s);

      // Simple beveled look: inner highlight + border
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(s * 0.08, s * 0.08, s * 0.84, s * 0.22);

      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = Math.max(2, Math.floor(s * 0.035));
      ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, s - ctx.lineWidth, s - ctx.lineWidth);

      // Tiny noise
      for (let i = 0; i < 220; i++) {
        const x = (Math.random() * s) | 0;
        const y = (Math.random() * s) | 0;
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
        ctx.fillRect(x, y, 1, 1);
      }
    });
  }

  function createFloorTexture() {
    return makeCanvasTexture((ctx, s) => {
      const bg = ctx.createLinearGradient(0, 0, s, s);
      bg.addColorStop(0, "#16082a");
      bg.addColorStop(1, "#0c0618");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, s, s);

      const minor = s / 16;
      const major = s / 4;

      ctx.strokeStyle = "rgba(167,139,250,0.14)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 16; i++) {
        const p = i * minor;
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(s, p); ctx.stroke();
      }

      ctx.strokeStyle = "rgba(34,211,238,0.18)";
      ctx.lineWidth = 2;
      for (let i = 0; i <= 4; i++) {
        const p = i * major;
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(s, p); ctx.stroke();
      }
    });
  }

  function createWallTexture() {
    return makeCanvasTexture((ctx, s) => {
      // Dark CRT-room metal wall
      const g = ctx.createLinearGradient(0, 0, s, s);
      g.addColorStop(0, "#1a0f2e");
      g.addColorStop(1, "#0f0820");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);

      // Vertical brushed stripes
      for (let x = 0; x < s; x += 4) {
        const alpha = x % 16 === 0 ? 0.12 : 0.05;
        ctx.fillStyle = `rgba(192,181,255,${alpha})`;
        ctx.fillRect(x, 0, 1, s);
      }

      // Neon corners
      ctx.strokeStyle = "rgba(56,189,248,0.25)";
      ctx.lineWidth = 3;
      ctx.strokeRect(6, 6, s - 12, s - 12);
    });
  }

  function createMaterials() {
    // Note: BoxGeometry already contains UVs per face; these textures map using the default UVs.
    const floorMap = createFloorTexture();
    floorMap.repeat.set(2, 2);

    const pieceColors = {
      I: "#38bdf8",
      O: "#fbbf24",
      T: "#a78bfa",
      S: "#22c55e",
      Z: "#ef4444",
      J: "#3b82f6",
      L: "#f97316",
    };

    const pieceMats = {};
    for (const [k, color] of Object.entries(pieceColors)) {
      const map = createPieceTexture({ base: color });
      pieceMats[k] = new THREE.MeshStandardMaterial({
        map,
        roughness: 0.35, // glossy plastic look
        metalness: 0.08,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.08, // subtle neon arcade glow
      });
    }

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorMap,
      roughness: 0.95,
      metalness: 0.0,
    });

    const wallMap = createWallTexture();
    wallMap.repeat.set(1.5, 2.5);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallMap,
      roughness: 0.8,
      metalness: 0.2,
      transparent: true,
      opacity: 0.35,
    });

    return { pieceMats, floorMat, wallMat };
  }

  window.createMaterials = createMaterials;
})();

