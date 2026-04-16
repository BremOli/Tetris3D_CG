// Scene factory (uses global THREE from CDN script)
(function () {
  function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1020);
    return scene;
  }

  window.createScene = createScene;
})();

