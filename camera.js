// Camera factory (uses global THREE from CDN script)
(function () {
  function createCamera({ aspect }) {
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);

    // Slightly above and angled to see the board volume.
    camera.position.set(14, 18, 22);
    camera.lookAt(0, 8, 0);

    return camera;
  }

  window.createCamera = createCamera;
})();

