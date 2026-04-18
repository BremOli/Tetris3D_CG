// Camera factory (uses global THREE from CDN script)
(function () {
  function createCamera({ aspect }) {
    // Slightly larger near plane reduces depth-buffer artefacts at grazing angles.
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.45, 220);

    // Slightly above and angled to see the board volume.
    camera.position.set(11, 14, 17);
    camera.lookAt(0, 5, 0);

    return camera;
  }

  window.createCamera = createCamera;
})();

