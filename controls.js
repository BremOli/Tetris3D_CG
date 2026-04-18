// OrbitControls setup (requires OrbitControls script loaded after THREE)
(function () {
  function createControls({ camera, renderer }) {
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.minDistance = 9;
    controls.maxDistance = 26;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.maxPolarAngle = Math.PI * 0.49; // avoid going under the floor
    controls.target.set(0, 5, 0);
    controls.update();
    return controls;
  }

  function setControlsCamera(controls, camera) {
    controls.object = camera;
    controls.update();
  }

  window.createControls = createControls;
  window.setControlsCamera = setControlsCamera;
})();

