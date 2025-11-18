// app.js : TAF DOG MUSEUM（第三者視点 & 額装修正版）
// 依存 : three.js, data.js (const WORKS = [...])

(function () {
  // -----------------------------
  // 基本セットアップ
  // -----------------------------
  const canvas = document.getElementById('scene');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050509);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 5, -15);

  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.55);
  dirLight.position.set(4, 6, 3);
  scene.add(dirLight);

  // -----------------------------
  // 美術館空間
  // -----------------------------
  const hallLength = 80;
  const hallWidth = 10;
  const wallHeight = 5;
  const FRAME_DEPTH = 0.05; // 額縁の厚み

  const texLoader = new THREE.TextureLoader();

  // 床
  const floorGeo = new THREE.PlaneGeometry(hallLength, hallWidth);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x101015,
    roughness: 0.9,
    metalness: 0.05,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // 天井
  const ceilGeo = new THREE.PlaneGeometry(hallLength, hallWidth);
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x111217,
    roughness: 0.7,
    metalness: 0.1,
  });
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = wallHeight;
  scene.add(ceiling);

  // 壁
  const wallGeo = new THREE.PlaneGeometry(hallLength, wallHeight);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xbfc2ca,
    roughness: 0.85,
  });

  // 左壁
  const wallLeft = new THREE.Mesh(wallGeo, wallMat);
  wallLeft.position.set(0, wallHeight / 2, -hallWidth / 2);
  wallLeft.rotation.y = Math.PI / 2;
  scene.add(wallLeft);

  // 右壁
  const wallRight = new THREE.Mesh(wallGeo, wallMat);
  wallRight.position.set(0, wallHeight / 2, hallWidth / 2);
  wallRight.rotation.y = -Math.PI / 2;
  scene.add(wallRight);

  // 天井ラインライト
  const ceilingLights = new THREE.Group();
  const lightCount = 12;
  for (let i = 0; i < lightCount; i++) {
    const geo = new THREE.PlaneGeometry(2.4, 0.25);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(
      hallLength * 0.5 - (i + 1) * (hallLength / (lightCount + 1)),
      wallHeight - 0.05,
      0
    );
    m.rotation.x = Math.PI / 2;
    ceilingLights.add(m);
  }
  scene.add(ceilingLights);

  // -----------------------------
  // 額縁 + スポットライト
  // -----------------------------
  const clickableMeshes = [];
  const frameGroup = new THREE.Group();
  scene.add(frameGroup);

  function createFrameMesh(width, height, variant) {
    const frameGeo = new THREE.BoxGeometry(
      width + 0.6,
      height + 0.6,
      FRAME_DEPTH
    );

    let color = 0x1a1a1a;
    let metalness = 0.3;
    let roughness = 0.6;

    if (variant === 1) {
      color = 0x6c4b24; // ゴールド
      metalness = 0.8;
      roughness = 0.3;
    } else if (variant === 2) {
      color = 0xc0c4ce; // シルバー
      metalness = 0.9;
      roughness = 0.25;
    } else if (variant === 3) {
      color = 0x3b2525; // 木
      metalness = 0.4;
      roughness = 0.7;
    }

    const frameMat = new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);

    // 内側マット
    const innerGeo = new THREE.BoxGeometry(
      width + 0.3,
      height + 0.3,
      FRAME_DEPTH * 0.6
    );
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x050506,
      roughness: 0.9,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.z = FRAME_DEPTH * 0.15;
    frame.add(inner);

    return { frame, inner };
  }

  function addWorksToWall(isLeftWall) {
    if (!Array.isArray(WORKS) || WORKS.length === 0) return;

    const margin = 3.2;
    const startX = -hallLength / 2 + margin * 1.5;
    const y = 2.4;

    // 壁にほぼ貼り付け
    const z =
      isLeftWall
        ? -hallWidth / 2 + FRAME_DEPTH / 2 + 0.005
        : hallWidth / 2 - FRAME_DEPTH / 2 - 0.005;
    const rotY = isLeftWall ? Math.PI / 2 : -Math.PI / 2;

    const perSide = Math.min(WORKS.length, 14);
    for (let i = 0; i < perSide; i++) {
      const work = WORKS[i];
      const x = startX + i * margin;

      const tex = texLoader.load(work.image);
      tex.minFilter = THREE.LinearFilter;

      const w = 2.0;
      const h = 3.2;

      const { frame, inner } = createFrameMesh(w, h, i % 4);
      frame.position.set(x, y, z);
      frame.rotation.y = rotY;

      // 絵のテクスチャ
      const imgGeo = new THREE.PlaneGeometry(w, h);
      const imgMat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.4,
        metalness: 0.2,
        side: THREE.DoubleSide, // どちら側からでも見えるように
      });
      const imgMesh = new THREE.Mesh(imgGeo, imgMat);
      imgMesh.position.set(0, 0, FRAME_DEPTH * 0.55);
      inner.add(imgMesh);

      // 小さいスポットライト
      const spotGeo = new THREE.ConeGeometry(0.12, 0.28, 16);
      const spotMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.7,
      });
      const spot = new THREE.Mesh(spotGeo, spotMat);
      spot.position.set(0, h / 2 + 0.55, -FRAME_DEPTH * 0.6);
      spot.rotation.x = -Math.PI / 2.3;
      frame.add(spot);

      frame.userData.work = work;
      clickableMeshes.push(frame);
      frameGroup.add(frame);
    }
  }

  addWorksToWall(true);
  addWorksToWall(false);

  // -----------------------------
  // アバター
  // -----------------------------
  const avatarGroup = new THREE.Group();
  scene.add(avatarGroup);

  let currentAvatar = null;
  let currentAvatarType = 'human';

  function clearAvatar() {
    while (avatarGroup.children.length > 0) {
      avatarGroup.remove(avatarGroup.children[0]);
    }
  }

  function createHumanVariant(seed) {
    const group = new THREE.Group();

    const coatColors = [0x2b5aa8, 0xd78c2a, 0x3c9360, 0x9b3a3a];
    const hatColors = [0x181818, 0x333333, 0x454545];
    const coat = coatColors[seed % coatColors.length];
    const hat = hatColors[seed % hatColors.length];

    const bodyGeo = new THREE.CylinderGeometry(0.6, 0.6, 2.1, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: coat,
      roughness: 0.6,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.1;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.55, 24, 24);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xf2d0b1,
      roughness: 0.7,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.4;
    group.add(head);

    const hatGeo = new THREE.SphereGeometry(
      0.57,
      24,
      24,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    const hatMat = new THREE.MeshStandardMaterial({
      color: hat,
      roughness: 0.4,
      metalness: 0.1,
    });
    const hatMesh = new THREE.Mesh(hatGeo, hatMat);
    hatMesh.position.y = 2.55;
    group.add(hatMesh);

    const legGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.0, 12);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const legL = new THREE.Mesh(legGeo, legMat);
    const legR = legL.clone();
    legL.position.set(-0.22, 0.5, 0);
    legR.position.set(0.22, 0.5, 0);
    group.add(legL, legR);

    const armGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.1, 12);
    const armMat = new THREE.MeshStandardMaterial({ color: coat, roughness: 0.7 });
    const armL = new THREE.Mesh(armGeo, armMat);
    const armR = armL.clone();
    armL.position.set(-0.8, 1.4, 0);
    armR.position.set(0.8, 1.4, 0);
    armL.rotation.z = Math.PI / 14;
    armR.rotation.z = -Math.PI / 14;
    group.add(armL, armR);

    return group;
  }

  function createDogVariant(seed) {
    const group = new THREE.Group();

    const coatColors = [0x2a2a32, 0x444a52, 0x7b5b3b, 0xc8b27a];
    const bodyColor = coatColors[seed % coatColors.length];

    const bodyGeo = new THREE.BoxGeometry(1.8, 1.0, 2.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.7,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    group.add(body);

    const headGeo = new THREE.BoxGeometry(1.4, 1.3, 1.4);
    const headMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.7,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.7, 0.2);
    group.add(head);

    const earGeo = new THREE.BoxGeometry(0.4, 0.7, 0.15);
    const earMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.7,
    });
    const earL = new THREE.Mesh(earGeo, earMat);
    const earR = earL.clone();
    earL.position.set(-0.6, 2.2, 0);
    earR.position.set(0.6, 2.2, 0);
    group.add(earL, earR);

    const legGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.9, 12);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const legFL = new THREE.Mesh(legGeo, legMat);
    const legFR = legFL.clone();
    const legBL = legFL.clone();
    const legBR = legFL.clone();
    legFL.position.set(-0.55, 0.45, 0.7);
    legFR.position.set(0.55, 0.45, 0.7);
    legBL.position.set(-0.55, 0.45, -0.7);
    legBR.position.set(0.55, 0.45, -0.7);
    group.add(legFL, legFR, legBL, legBR);

    const tailGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.9, 12);
    const tailMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.7,
    });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, 1.2, -1.2);
    tail.rotation.x = -Math.PI / 4;
    group.add(tail);

    return group;
  }

  const avatarWorldPos = new THREE.Vector3();
  let cameraYaw = Math.PI / 2;   // 廊下の奥方向
  let cameraPitch = 0.05;

  function updateCameraImmediate() {
    if (!currentAvatar) return;

    // アバターのワールド位置（グループは動かしてないので position でOK）
    avatarWorldPos.copy(currentAvatar.position);

    const forward = new THREE.Vector3(
      Math.sin(cameraYaw),
      0,
      Math.cos(cameraYaw)
    );
    const up = new THREE.Vector3(0, 1, 0);

    const backDistance = 14.0;   // 後ろに大きめ
    const upOffset = 4.0 + cameraPitch * 2.0;

    const camPos = new THREE.Vector3()
      .copy(avatarWorldPos)
      .addScaledVector(forward, -backDistance)  // 「前方向」の反対側＝後ろ
      .addScaledVector(up, upOffset);          // 上から見下ろす

    camera.position.copy(camPos);

    const lookTarget = new THREE.Vector3(
      avatarWorldPos.x,
      avatarWorldPos.y + 1.7 + cameraPitch * 3.0,
      avatarWorldPos.z
    );
    camera.lookAt(lookTarget);

    // アバターもカメラの前方を向く
    currentAvatar.rotation.y = cameraYaw + Math.PI;
  }

  function updateCamera() {
    updateCameraImmediate();
  }

  function setAvatar(type) {
    clearAvatar();
    currentAvatarType = type;

    const seed = Math.floor(Math.random() * 10);
    const avatar =
      type === 'human' ? createHumanVariant(seed) : createDogVariant(seed);

    // 廊下の手前・中央付近
    avatar.position.set(-hallLength / 2 + 6, 0, 0);
    avatarGroup.add(avatar);
    currentAvatar = avatar;

    cameraYaw = Math.PI / 2; // 廊下の奥方向を向く
    cameraPitch = 0.05;
    updateCameraImmediate();
  }

  // -----------------------------
  // 視点ドラッグ
  // -----------------------------
  let isDraggingView = false;
  let lastPointerX = 0;
  let lastPointerY = 0;

  function onPointerDown(e) {
    isDraggingView = true;
    lastPointerX = e.clientX || e.touches?.[0]?.clientX || 0;
    lastPointerY = e.clientY || e.touches?.[0]?.clientY || 0;
  }

  function onPointerMove(e) {
    if (!isDraggingView) return;
    const x = e.clientX || e.touches?.[0]?.clientX || 0;
    const y = e.clientY || e.touches?.[0]?.clientY || 0;

    const dx = x - lastPointerX;
    const dy = y - lastPointerY;
    lastPointerX = x;
    lastPointerY = y;

    cameraYaw -= dx * 0.005;
    cameraPitch -= dy * 0.003;
    const limit = 0.45;
    cameraPitch = Math.max(-limit, Math.min(limit, cameraPitch));
  }

  function onPointerUp() {
    isDraggingView = false;
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // -----------------------------
  // ジョイスティック
  // -----------------------------
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');
  let joyRect = { x: 0, y: 0, r: 0 };
  let joyActive = false;
  let joyDX = 0;
  let joyDY = 0;

  function updateJoyRect() {
    if (!joyBg) return;
    const r = joyBg.getBoundingClientRect();
    joyRect = {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      r: r.width * 0.45,
    };
  }
  updateJoyRect();
  window.addEventListener('resize', updateJoyRect);

  function handleJoyStart(e) {
    joyActive = true;
    const t = e.touches ? e.touches[0] : e;
    moveJoy(t.clientX, t.clientY);
  }

  function handleJoyMove(e) {
    if (!joyActive) return;
    const t = e.touches ? e.touches[0] : e;
    moveJoy(t.clientX, t.clientY);
  }

  function handleJoyEnd() {
    joyActive = false;
    joyDX = 0;
    joyDY = 0;
    if (joyStick) {
      joyStick.style.transform = 'translate(-50%, -50%)';
    }
  }

  function moveJoy(x, y) {
    const dx = x - joyRect.x;
    const dy = y - joyRect.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const clamped = Math.min(dist, joyRect.r);
    const nx = (dx / dist) * clamped;
    const ny = (dy / dist) * clamped;

    // 上：前進 / 下：後退 / 右：右 / 左：左
    joyDX = nx / joyRect.r;
    joyDY = -ny / joyRect.r;

    if (joyStick) {
      joyStick.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
    }
  }

  if (joyBg) {
    joyBg.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      handleJoyStart(e);
    });
  }
  window.addEventListener('pointermove', handleJoyMove);
  window.addEventListener('pointerup', handleJoyEnd);
  window.addEventListener('pointercancel', handleJoyEnd);

  // -----------------------------
  // 作品クリック（モーダル）
  // -----------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const infoPanel = document.getElementById('info-panel');
  const infoTitle = document.getElementById('info-title');
  const infoDesc = document.getElementById('info-desc');
  const infoImage = document.getElementById('info-image');
  const infoClose = document.getElementById('info-close');

  function showInfo(work) {
    if (!infoPanel || !infoTitle || !infoImage) return;
    infoTitle.textContent = work.title || 'TAF DOG';
    if (infoDesc) {
      infoDesc.textContent =
        work.desc ||
        work.description ||
        'TAF DOG ローポリドッグコレクション';
    }
    infoImage.src = work.image;
    infoPanel.classList.add('active');
  }

  function hideInfo() {
    if (!infoPanel) return;
    infoPanel.classList.remove('active');
  }

  if (infoClose) infoClose.addEventListener('click', hideInfo);
  if (infoPanel) {
    infoPanel.addEventListener('click', (e) => {
      if (e.target === infoPanel) hideInfo();
    });
  }

  canvas.addEventListener('click', (event) => {
    if (!clickableMeshes.length) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    pointer.set(x, y);

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickableMeshes, true);
    if (hits.length > 0) {
      const obj = hits[0].object;
      const work = obj.parent?.userData?.work || obj.userData.work;
      if (work) showInfo(work);
    }
  });

  // -----------------------------
  // アバターチェンジ UI
  // -----------------------------
  const btnHuman =
    document.getElementById('btn-human') ||
    document.querySelector('[data-avatar="human"]');
  const btnDog =
    document.getElementById('btn-dog') ||
    document.querySelector('[data-avatar="dog"]');

  function updateAvatarButtons() {
    if (!btnHuman || !btnDog) return;
    if (currentAvatarType === 'human') {
      btnHuman.classList.add('active');
      btnDog.classList.remove('active');
    } else {
      btnDog.classList.add('active');
      btnHuman.classList.remove('active');
    }
  }

  if (btnHuman) {
    btnHuman.addEventListener('click', () => {
      setAvatar('human');
      updateAvatarButtons();
    });
  }
  if (btnDog) {
    btnDog.addEventListener('click', () => {
      setAvatar('dog');
      updateAvatarButtons();
    });
  }

  // 初期アバター
  setAvatar('human');
  updateAvatarButtons();

  // -----------------------------
  // アニメーション
  // -----------------------------
  const clock = new THREE.Clock();

  function clampAvatarToHall() {
    if (!currentAvatar) return;
    const pos = currentAvatar.position;
    const margin = 1.5;
    const halfLen = hallLength / 2 - margin;
    const halfWidth = hallWidth / 2 - 1.2;
    if (pos.x < -halfLen) pos.x = -halfLen;
    if (pos.x > halfLen) pos.x = halfLen;
    if (pos.z < -halfWidth) pos.z = -halfWidth;
    if (pos.z > halfWidth) pos.z = halfWidth;
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.03);

    if (currentAvatar) {
      const speed = 6.0;
      const vForward = joyDY * speed * dt;
      const vSide = joyDX * speed * dt;

      if (Math.abs(vForward) > 0.0001 || Math.abs(vSide) > 0.0001) {
        const forward = new THREE.Vector3(
          Math.sin(cameraYaw),
          0,
          Math.cos(cameraYaw)
        );
        const right = new THREE.Vector3()
          .crossVectors(forward, new THREE.Vector3(0, 1, 0))
          .negate();

        currentAvatar.position.addScaledVector(forward, vForward);
        currentAvatar.position.addScaledVector(right, vSide);
      }

      clampAvatarToHall();
    }

    updateCamera();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.render(scene, camera);
  }

  animate();

  // -----------------------------
  // リサイズ
  // -----------------------------
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    updateJoyRect();
  });
})();
