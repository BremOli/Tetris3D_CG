// Perspective/Orthographic camera system with smooth transitions.
(function () {
  function createCameraSystem({ aspect, frustumSize = 24 }) {
    const perspective = new THREE.PerspectiveCamera(60, aspect, 0.1, 300);

    const ortho = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      300
    );

    const presets = {
      perspective: {
        position: new THREE.Vector3(14, 18, 22),
        target: new THREE.Vector3(0, 8, 0),
      },
      orthographic: {
        position: new THREE.Vector3(0, 16, 34),
        target: new THREE.Vector3(0, 8, 0),
      },
    };

    let mode = "perspective";
    const transition = {
      active: false,
      elapsed: 0,
      duration: 0.5,
      fromPos: new THREE.Vector3(),
      fromTarget: new THREE.Vector3(),
      toPos: new THREE.Vector3(),
      toTarget: new THREE.Vector3(),
    };

    const rig = {
      position: presets.perspective.position.clone(),
      target: presets.perspective.target.clone(),
    };

    function applyRigToCameras() {
      perspective.position.copy(rig.position);
      perspective.lookAt(rig.target);

      ortho.position.copy(rig.position);
      ortho.lookAt(rig.target);
      ortho.zoom = mode === "orthographic" ? 1.45 : 1.0;
      ortho.updateProjectionMatrix();
    }

    function setMode(nextMode, { smooth = true } = {}) {
      if (nextMode !== "perspective" && nextMode !== "orthographic") return;
      if (mode === nextMode && !transition.active) return;

      const preset = presets[nextMode];
      if (!smooth) {
        mode = nextMode;
        rig.position.copy(preset.position);
        rig.target.copy(preset.target);
        transition.active = false;
        applyRigToCameras();
        return;
      }

      transition.active = true;
      transition.elapsed = 0;
      transition.fromPos.copy(rig.position);
      transition.fromTarget.copy(rig.target);
      transition.toPos.copy(preset.position);
      transition.toTarget.copy(preset.target);
      mode = nextMode;
    }

    function update(deltaSeconds) {
      if (transition.active) {
        transition.elapsed += deltaSeconds;
        const t = Math.min(transition.elapsed / transition.duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        rig.position.lerpVectors(transition.fromPos, transition.toPos, eased);
        rig.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
        if (t >= 1) transition.active = false;
      }
      applyRigToCameras();
    }

    function resize(nextAspect) {
      perspective.aspect = nextAspect;
      perspective.updateProjectionMatrix();

      ortho.left = (-frustumSize * nextAspect) / 2;
      ortho.right = (frustumSize * nextAspect) / 2;
      ortho.top = frustumSize / 2;
      ortho.bottom = -frustumSize / 2;
      ortho.updateProjectionMatrix();
    }

    function getActiveCamera() {
      return mode === "orthographic" ? ortho : perspective;
    }

    applyRigToCameras();

    return {
      perspective,
      orthographic: ortho,
      rig,
      get mode() {
        return mode;
      },
      setMode,
      update,
      resize,
      getActiveCamera,
      presets,
    };
  }

  window.createCameraSystem = createCameraSystem;
})();

