// Lights setup (uses global THREE from CDN script)
(function () {
  function addLights(scene) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(12, 24, 14);
    key.castShadow = false;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x9bbcff, 0.35);
    fill.position.set(-16, 10, -10);
    scene.add(fill);

    return { ambient, key, fill };
  }

  window.addLights = addLights;
})();

