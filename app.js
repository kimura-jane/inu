// app.js  TAF DOG MUSEUM
// 三人称視点 + ジョイスティック移動 + 人間/犬ランダムアバター + 額縁付き展示

(function () {
  const canvas = document.getElementById("scene");
  if (!canvas) return;
  if (!window.THREE) {
    console.error("THREE.js が読み込まれていません");
    return;
  }

  // -----------------------
  // 基本セットアップ
  // -----------------------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050508);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  const clock = new THREE.Clock();

  // -----------------------
  // 作品データ
  // -----------------------
  let works = [];
  if (Array.isArray(window.WORKS) && window.WORKS.length > 0) {
    works = window.WORKS;
  } else {
    const fallbackCount = 20;
    for (let i = 1; i <= fallbackCount; i++) {
      const n = String(i).padStart(2, "0");
      works.push({
        id: i,
        title: `TAF DOG #${i}`,
        file: `taf_dog_${n}.png`,
        desc: `TAF DOG ローポリドッグ #${i}`,
      });
    }
  }

  // -----------------------
  // 光源
  // -----------------------
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const corridorLights = [];
  function createCeilingLights(centerZ, length) {
    const count = 10;
    const spacing = length / (count + 1);
    const y = 5.5;
    for (let i = 0; i < count; i++) {
      const z = centerZ - length / 2 + spacing * (i + 1);
      const light = new THREE.SpotLight(0xffffff, 0.9, 25, Math.PI / 4, 0.4, 1);
      light.position.set(0, y, z);
      light.target.position.set(0, 1.5, z);
      scene.add(light);
      scene.add(light.target);
      corridorLights.push(light);
    }
  }

  // -----------------------
  // 廊下
  // -----------------------
  const corridorConfig = {};
  function createCorridor() {
    const worksPerSide = Math.max(1, Math.ceil(works.length / 2));
    const spacing = 4.0;
    const startZ = 8.0;
    const endZ = startZ + spacing * (worksPerSide - 1);
    const centerZ = (startZ + endZ) / 2;
    const corridorLength = (endZ - startZ) + 16;

    corridorConfig.startZ = startZ;
    corridorConfig.endZ = endZ;
    corridorConfig.centerZ = centerZ;
    corridorConfig.length = corridorLength;
    corridorConfig.spacing = spacing;

    const wallHeight = 4.0;
    const corridorWidth = 6.0;

    // 床
    const floorGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111115,
      roughness: 0.8,
      metalness: 0.0,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, centerZ);
    floor.receiveShadow = true;
    scene.add(floor);

    // 左右の壁
    const wallGeo = new THREE.PlaneGeometry(corridorLength, wallHeight);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.9,
      metalness: 0.0,
    });

    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.position.set(-corridorWidth / 2, wallHeight / 2, centerZ);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.position.set(corridorWidth / 2, wallHeight / 2, centerZ);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    // 天井ライト風パネル
    const panelGeo = new THREE.BoxGeometry(2.0, 0.05, 0.4);
    const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const panelCount = 10;
    const panelSpacing = corridorLength / (panelCount + 1);
    for (let i = 0; i < panelCount; i++) {
      const z = centerZ - corridorLength / 2 + panelSpacing * (i + 1);
      const mesh = new THREE.Mesh(panelGeo, panelMat);
      mesh.position.set(0, 5.8, z);
      scene.add(mesh);
    }

    createCeilingLights(centerZ, corridorLength);
  }

  // -----------------------
  // 額縁 & 絵
  // -----------------------
  const textureLoader = new THREE.TextureLoader();
  const clickableMeshes = [];

  function framePalette(index) {
    const palette = [
      { frame: 0x2d2d30, inner: 0x111111, metal: 0xb0b0b0 },
      { frame: 0x8b6b3f, inner: 0x111111, metal: 0xd9c59a },
      { frame: 0x222222, inner: 0x000000, metal: 0x888888 },
      { frame: 0x3d3d3d, inner: 0x070707, metal: 0xffffff },
    ];
    return palette[index % palette.length];
  }

  function createGallery() {
    const { startZ, spacing, centerZ, length: corridorLength } = corridorConfig;
    const corridorWidth = 6.0;
    const frameWidth = 1.6;
    const frameHeight = 1.6;
    const frameDepth = 0.12;

    for (let i = 0; i < works.length; i++) {
      const work = works[i];
      const side = i % 2 === 0 ? "left" : "right";
      const indexOnSide = Math.floor(i / 2);
      const z = startZ + spacing * indexOnSide;
      const x =
        side === "left" ? -corridorWidth / 2 + 0.05 : corridorWidth / 2 - 0.05;
      const faceDir = side === "left" ? 1 : -1;

      const matSet = framePalette(i);

      // 額縁外枠
      const outerGeo = new THREE.BoxGeometry(
        frameWidth,
        frameHeight,
        frameDepth
      );
      const outerMat = new THREE.MeshStandardMaterial({
        color: matSet.frame,
        roughness: 0.5,
        metalness: 0.4,
      });
      const outer = new THREE.Mesh(outerGeo, outerMat);
      outer.position.set(x + 0.06 * faceDir, 2.0, z);
      outer.rotation.y = faceDir === 1 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(outer);

      // 内側
      const innerGeo = new THREE.BoxGeometry(
        frameWidth * 0.9,
        frameHeight * 0.9,
        frameDepth * 0.4
      );
      const innerMat = new THREE.MeshStandardMaterial({
        color: matSet.inner,
        roughness: 0.9,
        metalness: 0.0,
      });
      const inner = new THREE.Mesh(innerGeo, innerMat);
      inner.position.set(x + 0.12 * faceDir, 2.0, z);
      inner.rotation.y = faceDir === 1 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(inner);

      // ピン
      const pinGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8);
      const pinMat = new THREE.MeshStandardMaterial({
        color: matSet.metal,
        roughness: 0.2,
        metalness: 1.0,
      });
      const pinOffsets = [
        [-frameWidth * 0.42, frameHeight * 0.42],
        [frameWidth * 0.42, frameHeight * 0.42],
        [-frameWidth * 0.42, -frameHeight * 0.42],
        [frameWidth * 0.42, -frameHeight * 0.42],
      ];
      pinOffsets.forEach(([px, py]) => {
        const pin = new THREE.Mesh(pinGeo, pinMat);
        pin.rotation.z = Math.PI / 2;
        pin.position.set(
          x + 0.07 * faceDir,
          2.0 + py * 0.45,
          z + px * 0.02 * faceDir
        );
        pin.rotation.y = faceDir === 1 ? Math.PI / 2 : -Math.PI / 2;
        scene.add(pin);
      });

      // 絵
      const file = work.file || work.image || work.path || "";
      if (!file) continue;

      const texture = textureLoader.load(
        file,
        () => {},
        undefined,
        () => {
          console.warn("画像読み込み失敗:", file);
        }
      );

      const artGeo = new THREE.PlaneGeometry(frameWidth * 0.8, frameHeight * 0.8);
      const artMat = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.FrontSide,
      });
      const art = new THREE.Mesh(artGeo, artMat);
      art.position.set(x + 0.121 * faceDir, 2.0, z);
      art.rotation.y = faceDir === 1 ? Math.PI / 2 : -Math.PI / 2;
      art.userData.work = work;
      scene.add(art);
      clickableMeshes.push(art);

      // 絵用スポットライト
      const spot = new THREE.SpotLight(0xffffff, 0.7, 6, Math.PI / 3, 0.6, 1.0);
      spot.position.set(x + 0.6 * faceDir, 3.5, z);
      spot.target.position.set(x + 0.2 * faceDir, 2.0, z);
      scene.add(spot);
      scene.add(spot.target);
    }
  }

  // -----------------------
  // アバター
  // -----------------------
  let avatarGroup = null;
  let avatarMode = "human"; // "human" | "dog"

  const humanStyles = [
    { body: 0xffb347, top: 0x244f9e, leg: 0x111111, head: 0xf1c27d, hair: 0x2f2f2f },
    { body: 0xff7f7f, top: 0x353535, leg: 0x111111, head: 0xf1c27d, hair: 0x5a3825 },
    { body: 0xf0e68c, top: 0x5a9bd5, leg: 0x222222, head: 0xf6d5b1, hair: 0x1f1f1f },
    { body: 0xa0ced9, top: 0x1b4d3e, leg: 0x111111, head: 0xf5c9a7, hair: 0x3b2f2f },
    { body: 0xd9b3ff, top: 0x3a3a7a, leg: 0x111111, head: 0xf6d5b1, hair: 0x4a2f2f },
    { body: 0xf7d794, top: 0x1e3799, leg: 0x111111, head: 0xf3c9a9, hair: 0x2d3436 },
    { body: 0x95afc0, top: 0x130f40, leg: 0x111111, head: 0xf6e58d, hair: 0x2c3a47 },
    { body: 0xffb8b8, top: 0x474787, leg: 0x111111, head: 0xf7f1e3, hair: 0x574b90 },
    { body: 0xc7ecee, top: 0x535c68, leg: 0x111111, head: 0xf0dfd3, hair: 0x2f3542 },
    { body: 0xf8a5c2, top: 0x786fa6, leg: 0x111111, head: 0xf5cd79, hair: 0x574b90 },
  ];

  const dogStyles = [
    { body: 0xb4926e, ear: 0x8a6d4b, muzzle: 0xe0d1b3 },
    { body: 0x444444, ear: 0x222222, muzzle: 0xdddddd },
    { body: 0xffffff, ear: 0xd8d8d8, muzzle: 0xf5f5f5 },
    { body: 0xc19a6b, ear: 0x8b6d4b, muzzle: 0xf3e1c5 },
    { body: 0xdeb887, ear: 0x8b4513, muzzle: 0xf5deb3 },
    { body: 0x8b7765, ear: 0x5a4636, muzzle: 0xe8d3c5 },
    { body: 0xf4caa5, ear: 0xd1a37a, muzzle: 0xffe5c4 },
    { body: 0x6b8e23, ear: 0x556b2f, muzzle: 0xeae0c8 },
    { body: 0x708090, ear: 0x2f4f4f, muzzle: 0xdcdcdc },
    { body: 0xcd853f, ear: 0x8b4513, muzzle: 0xf5deb3 },
  ];

  function randFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function createHumanAvatar() {
    const style = randFrom(humanStyles);
    const group = new THREE.Group();

    // 胴体（円柱）
    const bodyGeo = new THREE.CylinderGeometry(0.55, 0.6, 1.6, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: style.top,
      roughness: 0.6,
      metalness: 0.0,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 1.3, 0);
    group.add(body);

    // 脚
    const legGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.8, 12);
    const legMat = new THREE.MeshStandardMaterial({
      color: style.leg,
      roughness: 0.8,
      metalness: 0.0,
    });
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.25, 0.4, 0);
    const legR = legL.clone();
    legR.position.set(0.25, 0.4, 0);
    group.add(legL, legR);

    // 靴
    const shoeGeo = new THREE.BoxGeometry(0.35, 0.2, 0.6);
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.3,
      metalness: 0.2,
    });
    const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
    shoeL.position.set(-0.25, 0.1, 0.15);
    const shoeR = shoeL.clone();
    shoeR.position.set(0.25, 0.1, 0.15);
    group.add(shoeL, shoeR);

    // 頭
    const headGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: style.head,
      roughness: 0.6,
      metalness: 0.0,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 2.3, 0);
    group.add(head);

    // 髪
    const hairGeo = new THREE.SphereGeometry(0.46, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.4);
    const hairMat = new THREE.MeshStandardMaterial({
      color: style.hair,
      roughness: 0.5,
      metalness: 0.1,
    });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.copy(head.position);
    group.add(hair);

    // 腕
    const armGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.85, 12);
    const armMat = new THREE.MeshStandardMaterial({
      color: style.top,
      roughness: 0.6,
      metalness: 0.0,
    });
    const armL = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-0.6, 1.3, 0);
    armL.rotation.z = Math.PI / 16;
    const armR = armL.clone();
    armR.position.set(0.6, 1.3, 0);
    armR.rotation.z = -Math.PI / 16;
    group.add(armL, armR);

    group.position.set(0, 0, 2);
    group.traverse((m) => {
      if (m.isMesh) m.castShadow = true;
    });

    return group;
  }

  function createDogAvatar() {
    const style = randFrom(dogStyles);
    const group = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(0.9, 0.6, 1.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: style.body,
      roughness: 0.6,
      metalness: 0.0,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.55, 0.1);
    group.add(body);

    const headGeo = new THREE.BoxGeometry(0.9, 0.8, 0.9);
    const headMat = new THREE.MeshStandardMaterial({
      color: style.body,
      roughness: 0.6,
      metalness: 0.0,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.2, 0.65);
    group.add(head);

    const muzzleGeo = new THREE.BoxGeometry(0.6, 0.4, 0.4);
    const muzzleMat = new THREE.MeshStandardMaterial({
      color: style.muzzle,
      roughness: 0.5,
      metalness: 0.0,
    });
    const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzle.position.set(0, 0.95, 1.05);
    group.add(muzzle);

    const earGeo = new THREE.BoxGeometry(0.25, 0.35, 0.08);
    const earMat = new THREE.MeshStandardMaterial({
      color: style.ear,
      roughness: 0.5,
      metalness: 0.0,
    });
    const earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.35, 1.5, 0.45);
    const earR = earL.clone();
    earR.position.set(0.35, 1.5, 0.45);
    group.add(earL, earR);

    const eyeGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.2,
      metalness: 0.5,
    });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.18, 1.15, 0.98);
    const eyeR = eyeL.clone();
    eyeR.position.set(0.18, 1.15, 0.98);
    group.add(eyeL, eyeR);

    const legGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.6, 10);
    const legMat = new THREE.MeshStandardMaterial({
      color: style.body,
      roughness: 0.7,
      metalness: 0.0,
    });
    const legFL = new THREE.Mesh(legGeo, legMat);
    legFL.position.set(-0.25, 0.3, 0.75);
    const legFR = legFL.clone();
    legFR.position.set(0.25, 0.3, 0.75);
    const legBL = legFL.clone();
    legBL.position.set(-0.25, 0.3, -0.4);
    const legBR = legFL.clone();
    legBR.position.set(0.25, 0.3, -0.4);
    group.add(legFL, legFR, legBL, legBR);

    const tailGeo = new THREE.CylinderGeometry(0.07, 0.1, 0.6, 8);
    const tailMat = new THREE.MeshStandardMaterial({
      color: style.body,
      roughness: 0.6,
      metalness: 0.0,
    });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, 1.0, -0.6);
    tail.rotation.x = Math.PI / 3;
    group.add(tail);

    group.position.set(0, 0, 2);
    group.traverse((m) => {
      if (m.isMesh) m.castShadow = true;
    });

    return group;
  }

  let avatarGroup;
  const cameraOffset = new THREE.Vector3(0, 6, -10);

  function resetAvatar() {
    if (avatarGroup) scene.remove(avatarGroup);
    avatarGroup =
      avatarMode === "human" ? createHumanAvatar() : createDogAvatar();
    avatarGroup.position.set(0, 0, 2);
    avatarGroup.rotation.y = 0;
    scene.add(avatarGroup);

    camera.position.set(0, 6, -8);
    const lookTarget = avatarGroup.position.clone();
    lookTarget.z += 4;
    lookTarget.y += 1.5;
    camera.lookAt(lookTarget);
  }

  function updateCamera() {
    if (!avatarGroup) return;
    const desired = avatarGroup.position.clone().add(cameraOffset);
    camera.position.lerp(desired, 0.15);
    const lookTarget = avatarGroup.position.clone();
    lookTarget.z += 4;
    lookTarget.y += 1.5;
    camera.lookAt(lookTarget);
  }

  // -----------------------
  // ジョイスティック
  // -----------------------
  const joyBg = document.getElementById("joy-bg");
  const joyStick = document.getElementById("joy-stick");
  let joyActive = false;
  let joyCenter = { x: 0, y: 0 };
  let joyVec = { x: 0, y: 0 };

  function updateJoyCenter() {
    if (!joyBg) return;
    const rect = joyBg.getBoundingClientRect();
    joyCenter.x = rect.left + rect.width / 2;
    joyCenter.y = rect.top + rect.height / 2;
  }

  function joyStart(ev) {
    if (!joyBg || !joyStick) return;
    ev.preventDefault();
    joyActive = true;
    const t = ev.touches ? ev.touches[0] : ev;
    joyCenter.x = t.clientX;
    joyCenter.y = t.clientY;
    const rect = joyBg.getBoundingClientRect();
    joyBg.style.left = joyCenter.x - rect.width / 2 + "px";
    joyBg.style.top = joyCenter.y - rect.height / 2 + "px";
    joyBg.classList.add("active");
    joyMove(ev);
  }

  function joyMove(ev) {
    if (!joyActive || !joyBg || !joyStick) return;
    ev.preventDefault();
    const t = ev.touches ? ev.touches[0] : ev;
    const dx = t.clientX - joyCenter.x;
    const dy = t.clientY - joyCenter.y;
    const maxR = joyBg.offsetWidth / 2;
    const dist = Math.min(Math.hypot(dx, dy), maxR);
    const angle = Math.atan2(dy, dx);

    const nx = (dist * Math.cos(angle)) / maxR;
    const ny = (dist * Math.sin(angle)) / maxR;

    joyVec.x = nx;
    joyVec.y = ny;

    joyStick.style.transform = `translate(${nx * maxR}px, ${ny * maxR}px)`;
  }

  function joyEnd(ev) {
    if (!joyBg || !joyStick) return;
    ev.preventDefault();
    joyActive = false;
    joyVec.x = 0;
    joyVec.y = 0;
    joyStick.style.transform = "translate(0px, 0px)";
    joyBg.classList.remove("active");
  }

  if (joyBg && joyStick) {
    updateJoyCenter();
    window.addEventListener("resize", updateJoyCenter);

    joyBg.addEventListener("pointerdown", joyStart, { passive: false });
    window.addEventListener("pointermove", joyMove, { passive: false });
    window.addEventListener("pointerup", joyEnd, { passive: false });
    window.addEventListener("pointercancel", joyEnd, { passive: false });

    joyBg.addEventListener("touchstart", joyStart, { passive: false });
    window.addEventListener("touchmove", joyMove, { passive: false });
    window.addEventListener("touchend", joyEnd, { passive: false });
    window.addEventListener("touchcancel", joyEnd, { passive: false });
  }

  // -----------------------
  // 移動
  // -----------------------
  function updateMovement(delta) {
    if (!avatarGroup) return;
    const len = Math.hypot(joyVec.x, joyVec.y);
    if (len < 0.1) return;

    const nx = joyVec.x / len;
    const ny = joyVec.y / len;

    const speed = 6.0;
    const dist = speed * delta;

    // 上方向（画面の上）を前（+Z）にする
    const moveDir = new THREE.Vector3(nx, 0, -ny).normalize();
    avatarGroup.position.addScaledVector(moveDir, dist);

    const angle = Math.atan2(moveDir.x, moveDir.z);
    avatarGroup.rotation.y = angle;
  }

  // -----------------------
  // 作品クリック
  // -----------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const infoPanel = document.getElementById("info-panel");
  const infoTitle = document.getElementById("info-title");
  const infoDesc = document.getElementById("info-desc");
  const infoImg = document.getElementById("info-image");
  const infoClose = document.getElementById("info-close");

  function showInfo(work) {
    if (!infoPanel) return;
    if (infoTitle) infoTitle.textContent = work.title || "";
    if (infoDesc) infoDesc.textContent = work.desc || "";
    if (infoImg && work.file) {
      infoImg.src = work.file;
      infoImg.alt = work.title || "";
    }
    infoPanel.classList.add("open");
  }

  function hideInfo() {
    if (infoPanel) infoPanel.classList.remove("open");
  }

  infoClose && infoClose.addEventListener("click", hideInfo);
  infoPanel &&
    infoPanel.addEventListener("click", (e) => {
      if (e.target === infoPanel) hideInfo();
    });

  function onCanvasTap(ev) {
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX !== undefined ? ev.clientX : ev.touches[0].clientX;
    const y = ev.clientY !== undefined ? ev.clientY : ev.touches[0].clientY;

    pointer.x = ((x - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((y - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickableMeshes, false);
    if (hits.length > 0) {
      const work = hits[0].object.userData.work;
      if (work) showInfo(work);
    }
  }

  canvas.addEventListener("click", onCanvasTap);
  canvas.addEventListener("touchend", function (e) {
    if (e.changedTouches && e.changedTouches.length > 0) {
      onCanvasTap(e.changedTouches[0]);
    }
  });

  // -----------------------
  // 人間/犬 ボタン
  // -----------------------
  const btnHuman = document.getElementById("btn-human");
  const btnDog = document.getElementById("btn-dog");

  function updateAvatarButtons() {
    if (!btnHuman || !btnDog) return;
    if (avatarMode === "human") {
      btnHuman.classList.add("active");
      btnDog.classList.remove("active");
    } else {
      btnDog.classList.add("active");
      btnHuman.classList.remove("active");
    }
  }

  btnHuman &&
    btnHuman.addEventListener("click", () => {
      avatarMode = "human";
      updateAvatarButtons();
      resetAvatar();
    });

  btnDog &&
    btnDog.addEventListener("click", () => {
      avatarMode = "dog";
      updateAvatarButtons();
      resetAvatar();
    });

  // -----------------------
  // リサイズ
  // -----------------------
  function resizeRenderer() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (canvas.width !== width || canvas.height !== height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }
  window.addEventListener("resize", resizeRenderer);

  // -----------------------
  // 初期化 & ループ
  // -----------------------
  createCorridor();
  createGallery();
  resetAvatar();
  updateAvatarButtons();
  resizeRenderer();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    updateMovement(delta);
    updateCamera();
    renderer.render(scene, camera);
  }
  animate();
})();
