// OrbitControls setup (requires OrbitControls script loaded after THREE)
(function () {
  function createControls({ camera, renderer }) {
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.minDistance = 8;
    controls.maxDistance = 80;
    controls.maxPolarAngle = Math.PI * 0.49; // avoid going under the floor
    controls.target.set(0, 8, 0);
    controls.update();
    return controls;
  }

  window.createControls = createControls;
})();

