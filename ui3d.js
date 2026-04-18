// 3D UI buttons + Raycaster helpers
(function () {
  const FONT_STACK = '"Press Start 2P", "Courier New", monospace';

  function shadeHex(hex, factor) {
    const c = new THREE.Color(hex);
    c.multiplyScalar(factor);
    return c;
  }

  function makePanelMaterials(scheme) {
    const { base, emissive, topBoost = 1.0 } = scheme;
    const top = shadeHex(base, 0.92 * topBoost);
    const bottom = shadeHex(base, 0.42);
    const side = shadeHex(base, 0.58);
    const back = shadeHex(base, 0.38);
    const front = new THREE.Color(base);
    const em = new THREE.Color(emissive);

    const mat = (opts) =>
      new THREE.MeshStandardMaterial({
        roughness: opts.roughness ?? 0.38,
        metalness: opts.metalness ?? 0.28,
        ...opts,
      });

    return [
      mat({ color: side, emissive: em, emissiveIntensity: 0.06 }),
      mat({ color: side, emissive: em, emissiveIntensity: 0.06 }),
      mat({
        color: top,
        emissive: em,
        emissiveIntensity: 0.14,
        roughness: 0.32,
        metalness: 0.32,
      }),
      mat({ color: bottom, emissive: em, emissiveIntensity: 0.03, roughness: 0.48 }),
      mat({
        color: front,
        emissive: em,
        emissiveIntensity: 0.26,
        roughness: 0.28,
        metalness: 0.35,
      }),
      mat({ color: back, roughness: 0.55, metalness: 0.12 }),
    ];
  }

  function makeTextTexture(text, style) {
    const fill = style.fill || "#f8fafc";
    const stroke = style.stroke || "#020617";
    const glow = style.glow || "rgba(34, 211, 238, 0.55)";

    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);

    const len = text.length;
    let fontPx = len >= 8 ? 52 : len >= 6 ? 62 : 76;
    ctx.font = `${fontPx}px ${FONT_STACK}`;
    while (ctx.measureText(text).width > c.width - 120 && fontPx > 28) {
      fontPx -= 2;
      ctx.font = `${fontPx}px ${FONT_STACK}`;
    }

    const cx = c.width / 2;
    const cy = c.height / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.shadowColor = glow;
    ctx.shadowBlur = 28;
    ctx.lineWidth = Math.max(5, Math.round(fontPx * 0.12));
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, cx, cy);

    ctx.shadowBlur = 12;
    ctx.fillStyle = fill;
    ctx.fillText(text, cx, cy);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = fill;
    ctx.fillText(text, cx, cy);
    ctx.globalAlpha = 1;

    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    return t;
  }

  const BUTTON_SCHEMES = {
    start: {
      base: 0x047857,
      emissive: 0x2dd4bf,
      edge: 0x5eead4,
      text: { fill: "#ecfeff", stroke: "#042f2e", glow: "rgba(45, 212, 191, 0.65)" },
    },
    pause: {
      base: 0x9a3412,
      emissive: 0xfbbf24,
      edge: 0xfcd34d,
      text: { fill: "#fffbeb", stroke: "#431407", glow: "rgba(251, 191, 36, 0.6)" },
    },
    restart: {
      base: 0x1d4ed8,
      emissive: 0x38bdf8,
      edge: 0x7dd3fc,
      text: { fill: "#eff6ff", stroke: "#172554", glow: "rgba(56, 189, 248, 0.65)" },
    },
  };

  function createUIButton({ label, schemeKey, action }) {
    const scheme = BUTTON_SCHEMES[schemeKey] || BUTTON_SCHEMES.start;
    const group = new THREE.Group();

    const geo = new THREE.BoxGeometry(4.35, 1.12, 0.88);
    const body = new THREE.Mesh(geo, makePanelMaterials(scheme));
    group.add(body);

    const eg = new THREE.EdgesGeometry(geo, 28);
    const edgeMat = new THREE.LineBasicMaterial({
      color: scheme.edge,
      transparent: true,
      opacity: 0.55,
      depthTest: true,
    });
    const edgeLines = new THREE.LineSegments(eg, edgeMat);
    edgeLines.userData.owner = group;
    group.add(edgeLines);

    const accentGeo = new THREE.BoxGeometry(4.15, 0.14, 0.06);
    const accentMat = new THREE.MeshStandardMaterial({
      color: scheme.base,
      emissive: scheme.emissive,
      emissiveIntensity: 0.55,
      roughness: 0.25,
      metalness: 0.45,
    });
    const accent = new THREE.Mesh(accentGeo, accentMat);
    accent.position.set(0, -0.51, 0.47);
    accent.userData.owner = group;
    group.add(accent);

    const tex = makeTextTexture(label, scheme.text);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      })
    );
    sprite.scale.set(3.45, 0.82, 1);
    sprite.position.set(0, 0, 0.54);
    sprite.raycast = function () {};
    group.add(sprite);

    group.userData.isButton = true;
    group.userData.action = action || label.toLowerCase();
    group.userData.hitTarget = body;
    group.userData.label = label;
    group.userData.schemeKey = schemeKey;
    group.userData.spriteMaterial = sprite.material;
    body.userData.owner = group;

    return group;
  }

  function updateButtonLabelTexture(group) {
    const scheme = BUTTON_SCHEMES[group.userData.schemeKey] || BUTTON_SCHEMES.start;
    const old = group.userData.spriteMaterial.map;
    if (old && old.dispose) old.dispose();
    group.userData.spriteMaterial.map = makeTextTexture(group.userData.label, scheme.text);
    group.userData.spriteMaterial.needsUpdate = true;
  }

  function createUI3D(scene, options = {}) {
    const panelX = options.panelX ?? 14;
    const buttonYs =
      options.buttonYs && options.buttonYs.length === 3
        ? options.buttonYs
        : [3.5, 5.2, 6.9];
    const root = new THREE.Group();
    root.name = "ui3d";

    const defs = [
      { label: "Start", schemeKey: "start", action: "start", x: panelX, y: buttonYs[0], z: -4 },
      { label: "Pausa", schemeKey: "pause", action: "pause", x: panelX, y: buttonYs[1], z: -4 },
      { label: "Restart", schemeKey: "restart", action: "restart", x: panelX, y: buttonYs[2], z: -4 },
    ];
    const buttons = defs.map(({ x, y, z, ...rest }) => {
      const b = createUIButton(rest);
      b.position.set(x, y, z);
      return b;
    });

    buttons.forEach((b) => root.add(b));
    scene.add(root);

    const interactables = buttons.map((b) => b.userData.hitTarget);
    const buttonByAction = new Map(buttons.map((b) => [b.userData.action, b]));

    function refreshLabels() {
      buttons.forEach(updateButtonLabelTexture);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(refreshLabels);
    }

    function setActionVisible(action, visible) {
      const btn = buttonByAction.get(action);
      if (!btn) return;
      btn.visible = !!visible;
      const hit = btn.userData.hitTarget;
      if (hit) hit.visible = !!visible;
    }

    return { root, buttons, interactables, refreshLabels, setActionVisible };
  }

  function createRaycastInteraction({ renderer, scene, getCamera, onAction, interactables = null }) {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function onPointerDown(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, getCamera());

      const pickTargets =
        Array.isArray(interactables) && interactables.length > 0
          ? interactables
          : scene.children;
      const hits = raycaster.intersectObjects(pickTargets, true);
      for (const h of hits) {
        const owner = h.object.userData.owner;
        if (owner && owner.userData && owner.userData.isButton) {
          onAction(owner.userData.action);
          break;
        }
      }
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    return {
      dispose() {
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      },
    };
  }

  window.createUI3D = createUI3D;
  window.createRaycastInteraction = createRaycastInteraction;
})();
