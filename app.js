// app.js : 3D 廊下＋額装＋ジョイスティック＋アバターチェンジ
(function () {
  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050509);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );

  // ---------- ライト ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // ---------- 空間（廊下・壁・天井） ----------
  const corridorWidth = 16;
  const wallHeight = 8;
  const corridorLength = Math.max((WORKS.length + 4) * 4, 80);

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.9,
    metalness: 0.1,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.7,
    metalness: 0.1,
  });
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0x050509,
    roughness: 1.0,
    metalness: 0.0,
  });

  // 床
  const floorGeo = new THREE.PlaneGeometry(corridorLength, corridorWidth);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -corridorLength / 2);
  scene.add(floor);

  // 天井
  const ceilGeo = new THREE.PlaneGeometry(corridorLength, corridorWidth);
  const ceiling = new THREE.Mesh(ceilGeo, ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, wallHeight, -corridorLength / 2);
  scene.add(ceiling);

  // 左右の壁
  const wallGeo = new THREE.PlaneGeometry(corridorLength, wallHeight);
  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.position.set(-corridorWidth / 2, wallHeight / 2, -corridorLength / 2);
  leftWall.rotation.y = Math.PI / 2;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.position.set(corridorWidth / 2, wallHeight / 2, -corridorLength / 2);
  rightWall.rotation.y = -Math.PI / 2;
  scene.add(rightWall);

  // 天井ライトパネル
  const lightCount = 10;
  for (let i = 0; i < lightCount; i++) {
    const z = -10 - (corridorLength - 20) * (i / (lightCount - 1));

    const panelGeo = new THREE.PlaneGeometry(3, 0.4);
    const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, wallHeight - 0.2, z);
    panel.rotation.x = Math.PI / 2;
    scene.add(panel);

    const pl = new THREE.PointLight(0xffffff, 0.45, 24);
    pl.position.set(0, wallHeight - 0.1, z);
    scene.add(pl);
  }

  // ---------- 額装＋スポットライト ----------
  const texLoader = new THREE.TextureLoader();

  const frameMats = [
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.8,
      roughness: 0.25,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x8a6a3a,
      metalness: 0.5,
      roughness: 0.4,
    }),
    new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 0.2,
      roughness: 0.6,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.3,
      roughness: 0.3,
    }),
  ];

  const frameDepth = 0.22;
  const baseZ = -14;
  const spacingZ = 4.0;

  WORKS.forEach((work, i) => {
    const z = baseZ - i * spacingZ;
    const side = i % 2 === 0 ? -1 : 1; // 左右交互

    const frameW = 3.0 + (i % 3) * 0.3;
    const frameH = 3.7 + ((i + 1) % 3) * 0.25;

    const frameGeo = new THREE.BoxGeometry(frameW + 0.5, frameH + 0.5, frameDepth);
    const frame = new THREE.Mesh(frameGeo, frameMats[i % frameMats.length]);
    frame.position.set(side * (corridorWidth / 2 - 0.35), wallHeight / 2, z);
    scene.add(frame);

    const artGeo = new THREE.PlaneGeometry(frameW, frameH);
    const tex = texLoader.load(work.image);
    tex.colorSpace = THREE.SRGBColorSpace;
    const artMat = new THREE.MeshBasicMaterial({ map: tex });
    const art = new THREE.Mesh(artGeo, artMat);
    art.position.set(0, 0, frameDepth / 2 + 0.01);
    frame.add(art);

    // 額上のスポットライト
    const spot = new THREE.SpotLight(0xffffff, 1.1, 15, Math.PI / 4.5, 0.45);
    spot.position.set(frame.position.x, wallHeight - 0.2, z - 0.5 * side);
    spot.target = frame;
    scene.add(spot);
  });

  // ---------- アバター ----------
  let avatarGroup = null;
  let avatarType = "human";

  function createHumanAvatar() {
    const g = new THREE.Group();

    const coatColors = [0x3366aa, 0xcb8a2a, 0x944c9f, 0x3e8b5b, 0x999999];
    const coatColor = coatColors[(Math.random() * coatColors.length) | 0];

    const bodyGeo = new THREE.CylinderGeometry(0.8, 0.95, 3.2, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: coatColor,
      roughness: 0.6,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.6;
    g.add(body);

    const headGeo = new THREE.SphereGeometry(0.85, 20, 20);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffe0bd,
      roughness: 0.7,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 3.3;
    g.add(head);

    const hatGeo = new THREE.CylinderGeometry(0.82, 0.82, 0.6, 20);
    const hatMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.4,
      metalness: 0.4,
    });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 3.75;
    g.add(hat);

    const brimGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.08, 20);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.position.y = 3.5;
    g.add(brim);

    const armGeo = new THREE.CylinderGeometry(0.22, 0.22, 2.2, 12);
    const armMat = new THREE.MeshStandardMaterial({ color: coatColor });
    const armL = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-0.95, 1.7, 0);
    g.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.95;
    g.add(armR);

    const legGeo = new THREE.BoxGeometry(0.6, 1.5, 0.7);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.4, 0.75, -0.3);
    g.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.4;
    g.add(legR);

    return g;
  }

  function createDogAvatar() {
    const g = new THREE.Group();

    const colors = [0x222244, 0x4a3b26, 0x555555, 0x2b4b5f];
    const mainColor = colors[(Math.random() * colors.length) | 0];
    const accentColor = 0xd8d0c4;

    const bodyGeo = new THREE.BoxGeometry(2.2, 1.3, 3.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      roughness: 0.7,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.7;
    g.add(body);

    const chestGeo = new THREE.BoxGeometry(1.4, 1.0, 1.3);
    const chestMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.8,
    });
    const chest = new THREE.Mesh(chestGeo, chestMat);
    chest.position.set(0, 0.8, 1.0);
    g.add(chest);

    const headGeo = new THREE.BoxGeometry(1.6, 1.5, 1.5);
    const headMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.7,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.6, 1.9);
    g.add(head);

    const earGeo = new THREE.BoxGeometry(0.4, 0.7, 0.12);
    const earMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      roughness: 0.7,
    });
    const earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.8, 2.1, 1.7);
    g.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.8;
    g.add(earR);

    const legGeo = new THREE.BoxGeometry(0.35, 0.8, 0.35);
    const legMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      roughness: 0.8,
    });
    const legPositions = [
      [-0.7, 0.4, -1.2],
      [0.7, 0.4, -1.2],
      [-0.7, 0.4, 1.0],
      [0.7, 0.4, 1.0],
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, y, z);
      g.add(leg);
    });

    const tailGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.9, 10);
    const tailMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      roughness: 0.8,
    });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, 1.05, -1.6);
    tail.rotation.x = Math.PI / 3;
    g.add(tail);

    return g;
  }

  function resetAvatar(type) {
    if (avatarGroup) {
      scene.remove(avatarGroup);
      avatarGroup.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose && m.dispose());
          } else {
            obj.material.dispose && obj.material.dispose();
          }
          obj.geometry && obj.geometry.dispose && obj.geometry.dispose();
        }
      });
    }

    avatarType = type;
    avatarGroup = type === "human" ? createHumanAvatar() : createDogAvatar();

    avatarGroup.position.set(0, 0, -6);
    scene.add(avatarGroup);
    updateCamera();
  }

  resetAvatar("human");

  // ---------- カメラ追従（第三者視点） ----------
  function updateCamera() {
    if (!avatarGroup) return;
    const target = avatarGroup.position;
    const offset = new THREE.Vector3(0, 6, 10); // アバターの少し上・後ろ
    camera.position.copy(target).add(offset);
    camera.lookAt(target.x, target.y + 2.0, target.z - 5);
  }

  // ---------- ジョイスティック ----------
  const joyBg = document.getElementById("joy-bg");
  const joyStick = document.getElementById("joy-stick");
  const joyRadius = 50;

  let joyActive = false;
  let joyCenter = { x: 0, y: 0 };
  let joyValue = { x: 0, y: 0 };

  function updateJoyCenter() {
    const rect = joyBg.getBoundingClientRect();
    joyCenter.x = rect.left + rect.width / 2;
    joyCenter.y = rect.top + rect.height / 2;
  }

  updateJoyCenter();
  window.addEventListener("resize", updateJoyCenter);

  function pointerPos(event) {
    if (event.touches && event.touches[0]) {
      return {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
    }
    return { x: event.clientX, y: event.clientY };
  }

  function onJoyDown(e) {
    e.preventDefault();
    joyActive = true;
    onJoyMove(e);
  }

  function onJoyUp(e) {
    e.preventDefault();
    joyActive = false;
    joyValue.x = 0;
    joyValue.y = 0;
    joyStick.style.transform = "translate3d(0,0,0)";
  }

  function onJoyMove(e) {
    if (!joyActive) return;
    e.preventDefault();

    const p = pointerPos(e);
    let dx = p.x - joyCenter.x;
    let dy = p.y - joyCenter.y;

    const dist = Math.hypot(dx, dy);
    if (dist > joyRadius) {
      const r = joyRadius / dist;
      dx *= r;
      dy *= r;
    }

    joyValue.x = dx / joyRadius;
    joyValue.y = dy / joyRadius;

    joyStick.style.transform = `translate3d(${dx}px,${dy}px,0)`;
  }

  joyBg.addEventListener("pointerdown", onJoyDown);
  window.addEventListener("pointermove", onJoyMove);
  window.addEventListener("pointerup", onJoyUp);
  window.addEventListener("pointercancel", onJoyUp);

  joyBg.addEventListener("touchstart", onJoyDown, { passive: false });
  window.addEventListener("touchmove", onJoyMove, { passive: false });
  window.addEventListener("touchend", onJoyUp, { passive: false });
  window.addEventListener("touchcancel", onJoyUp, { passive: false });

  // ---------- 移動 ----------
  let lastTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    if (avatarGroup) {
      const speed = 6; // 移動スピード

      // ここが重要：画面の「上方向＝前進」になるように
      const forward = -joyValue.y; // 上に倒すと +1
      const strafe = joyValue.x;

      const dir = new THREE.Vector3(strafe, 0, -forward); // -Z 方向が前
      if (dir.lengthSq() > 0.0001) {
        dir.normalize().multiplyScalar(speed * dt);

        avatarGroup.position.add(dir);

        // 廊下の範囲にクリップ
        const halfW = corridorWidth / 2 - 1;
        avatarGroup.position.x = Math.max(
          -halfW,
          Math.min(halfW, avatarGroup.position.x)
        );
        const minZ = -corridorLength + 5;
        const maxZ = -2;
        avatarGroup.position.z = Math.max(
          minZ,
          Math.min(maxZ, avatarGroup.position.z)
        );
      }
    }

    updateCamera();
    renderer.render(scene, camera);
  }

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    updateJoyCenter();
  }

  window.addEventListener("resize", onResize);
  onResize();
  animate();

  // ---------- アバターチェンジ ボタン ----------
  const humanBtn = document.querySelector('[data-avatar="human"]');
  const dogBtn = document.querySelector('[data-avatar="dog"]');

  function setAvatar(type) {
    if (type === avatarType) {
      // 同じボタンを押したらランダム着せ替えだけ
      resetAvatar(type);
      return;
    }

    resetAvatar(type);
    if (type === "human") {
      humanBtn.classList.add("active");
      dogBtn.classList.remove("active");
    } else {
      dogBtn.classList.add("active");
      humanBtn.classList.remove("active");
    }
  }

  humanBtn.addEventListener("click", () => setAvatar("human"));
  dogBtn.addEventListener("click", () => setAvatar("dog"));
})();
