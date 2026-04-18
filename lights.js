// Lights setup (uses global THREE from CDN script)
(function () {
  function addLights(scene) {
    const ambient = new THREE.AmbientLight(0xc4b5fd, 0.32);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xfff7ed, 0.88);
    key.position.set(12, 24, 14);
    key.castShadow = false;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xf0abfc, 0.32);
    fill.position.set(-16, 10, -10);
    scene.add(fill);

    const pointA = new THREE.PointLight(0x22d3ee, 0.28, 26);
    pointA.position.set(0, 15, 10);
    scene.add(pointA);

    const pointB = new THREE.PointLight(0xf97316, 0.24, 24);
    pointB.position.set(-10, 8, -8);
    scene.add(pointB);

    const state = {
      ambient: true,
      directional: true,
      point: true,
    };

    function applyState() {
      ambient.visible = state.ambient;
      key.visible = state.directional;
      fill.visible = state.directional;
      pointA.visible = state.point;
      pointB.visible = state.point;
    }

    function setTypeEnabled(type, enabled) {
      if (!(type in state)) return;
      state[type] = !!enabled;
      applyState();
    }

    applyState();
    return {
      ambient,
      key,
      fill,
      pointA,
      pointB,
      state,
      setTypeEnabled,
      applyState,
    };
  }

  window.addLights = addLights;
})();

