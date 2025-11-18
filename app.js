// app.js
(function () {
  // ---------- 基本セットアップ ----------
  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050507);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );

  // ---------- 環境光・天井ライト ----------
  const amb = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(amb);

  const headLight = new THREE.DirectionalLight(0xffffff, 0.4);
  headLight.position.set(0, 10, -10);
  scene.add(headLight);

  // ---------- 美術館の廊下 ----------
  const HALL_LENGTH = 120;
  const HALL_WIDTH = 22;
  const WALL_HEIGHT = 10;

  const texLoader = new THREE.TextureLoader();

  // 床
  const floorGeo = new THREE.PlaneGeometry(HALL_WIDTH, HALL_LENGTH);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.8,
    metalness: 0.1
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // 天井
  const ceilGeo = new THREE.PlaneGeometry(HALL_WIDTH, HALL_LENGTH);
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x111217,
    roughness: 0.9
  });
  const ceil = new THREE.Mesh(ceilGeo, ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = WALL_HEIGHT;
  scene.add(ceil);

  // 壁
  const wallGeo = new THREE.PlaneGeometry(HALL_LENGTH, WALL_HEIGHT);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.95
  });

  const wallLeft = new THREE.Mesh(wallGeo, wallMat);
  wallLeft.rotation.y = Math.PI / 2;
  wallLeft.position.set(-HALL_WIDTH / 2, WALL_HEIGHT / 2, 0);
  scene.add(wallLeft);

  const wallRight = new THREE.Mesh(wallGeo, wallMat.clone());
  wallRight.rotation.y = -Math.PI / 2;
  wallRight.position.set(HALL_WIDTH / 2, WALL_HEIGHT / 2, 0);
  scene.add(wallRight);

  // 天井のラインライト（見た目用）
  const lineGeo = new THREE.PlaneGeometry(HALL_WIDTH * 0.4, 0.5);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lightCount = 12;
  for (let i = 0; i < lightCount; i++) {
    const m = new THREE.Mesh(lineGeo, lineMat);
    m.position.set(0, WALL_HEIGHT - 0.1, -HALL_LENGTH / 2 + (HALL_LENGTH / (lightCount + 1)) * (i + 1));
    m.rotation.x = Math.PI / 2;
    scene.add(m);
  }

  // ---------- 額装 & 作品 ----------
  const clickable = [];
  const frameStyles = [
    { frameColor: 0x1a1a1a, innerColor: 0xffffff },
    { frameColor: 0x9b7b3a, innerColor: 0xf5f3ec },
    { frameColor: 0x44474f, innerColor: 0xe0e0e0 },
    { frameColor: 0x2b2b2b, innerColor: 0xf7f7f7 }
  ];

  const artWidth = 4;
  const artHeight = 4.5;
  const spacing = HALL_LENGTH / (ARTWORKS.length / 2 + 2);
  const startZ = -HALL_LENGTH / 2 + spacing;

  function createFrame(art, sideIndex, indexWithinSide) {
    const z = startZ + spacing * indexWithinSide;
    const x = sideIndex === 0 ? -HALL_WIDTH / 2 + 0.3 : HALL_WIDTH / 2 - 0.3;
    const faceDir = sideIndex === 0 ? 1 : -1;

    const style = frameStyles[(indexWithinSide + sideIndex) % frameStyles.length];

    const group = new THREE.Group();

    // フレーム本体
    const frameDepth = 0.25;
    const frameGeo = new THREE.BoxGeometry(artWidth + 0.6, artHeight + 0.6, frameDepth);
    const frameMat = new THREE.MeshStandardMaterial({
      color: style.frameColor,
      metalness: 0.3,
      roughness: 0.4
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.z = 0;
    group.add(frameMesh);

    // 内側のマット
    const matGeo = new THREE.PlaneGeometry(artWidth + 0.2, artHeight + 0.2);
    const matMat = new THREE.MeshStandardMaterial({
      color: style.innerColor,
      roughness: 1.0
    });
    const matMesh = new THREE.Mesh(matGeo, matMat);
    matMesh.position.z = frameDepth / 2 + 0.001;
    group.add(matMesh);

    // 絵
    const tex = texLoader.load(art.file);
    const artGeo = new THREE.PlaneGeometry(artWidth, artHeight);
    const artMat = new THREE.MeshBasicMaterial({ map: tex });
    const artMesh = new THREE.Mesh(artGeo, artMat);
    artMesh.position.z = frameDepth / 2 + 0.01;
    group.add(artMesh);

    // 位置・向き
    group.position.set(x + 0.01 * faceDir, 3.8, z);
    group.rotation.y = (Math.PI / 2) * faceDir * -1;

    // スポットライト（雰囲気）
    const spot = new THREE.SpotLight(0xffffff, 0.9, 18, Math.PI / 6, 0.4, 1);
    spot.position.set(x + 1.5 * faceDir, WALL_HEIGHT - 0.2, z);
    spot.target = group;
    scene.add(spot);
    scene.add(group);

    // クリック対象
    group.userData.art = art;
    clickable.push(group);
  }

  const half = Math.ceil(ARTWORKS.length / 2);
  for (let i = 0; i < ARTWORKS.length; i++) {
    const side = i < half ? 0 : 1;
    const indexWithin = side === 0 ? i : i - half;
    createFrame(ARTWORKS[i], side, indexWithin);
  }

  // ---------- アバター ----------
  let avatarGroup = null;
  let avatarMode = "human"; // "human" | "dog"

  function randomColor() {
    const base = [0.2, 0.3, 0.4, 0.5];
    const r = base[Math.floor(Math.random() * base.length)];
    const g = base[Math.floor(Math.random() * base.length)];
    const b = base[Math.floor(Math.random() * base.length)];
    return new THREE.Color(r, g, b);
  }

  function createHumanAvatar() {
    const g = new THREE.Group();

    // 頭
    const headGeo = new THREE.SphereGeometry(0.8, 24, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf4d2b5, roughness: 0.8 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.2;
    g.add(head);

    // 髪
    const hairGeo = new THREE.SphereGeometry(0.82, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.6);
    const hairMat = new THREE.MeshStandardMaterial({ color: randomColor().offsetHSL(0, 0, -0.2) });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.copy(head.position);
    g.add(hair);

    // 体
    const bodyGeo = new THREE.CylinderGeometry(0.8, 0.9, 2.4, 20);
    const bodyMat = new THREE.MeshStandardMaterial({ color: randomColor(), roughness: 0.85 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2;
    g.add(body);

    // 腕
    const armGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.6, 16);
    const armMat = new THREE.MeshStandardMaterial({ color: bodyMat.color });
    const armL = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-0.9, 1.4, 0);
    g.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.9;
    g.add(armR);

    // 脚
    const legGeo = new THREE.BoxGeometry(0.5, 1.2, 0.6);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.3, 0.3, 0);
    const legR = legL.clone();
    legR.position.x = 0.3;
    g.add(legL, legR);

    return g;
  }

  function createDogAvatar() {
    const g = new THREE.Group();

    const coat = randomColor();

    // 頭
    const headGeo = new THREE.BoxGeometry(1.6, 1.4, 1.6);
    const headMat = new THREE.MeshStandardMaterial({ color: coat, roughness: 0.8 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.8;
    g.add(head);

    // 耳
    const earGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
    const earMat = new THREE.MeshStandardMaterial({ color: coat.clone().offsetHSL(0, 0, -0.15) });
    const earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.7, 2.2, -0.2);
    const earR = earL.clone();
    earR.position.x = 0.7;
    g.add(earL, earR);

    // 口先
    const snoutGeo = new THREE.BoxGeometry(0.9, 0.6, 1.0);
    const snoutMat = new THREE.MeshStandardMaterial({ color: coat.clone().offsetHSL(0, 0, 0.1) });
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0, 1.5, 0.9);
    g.add(snout);

    // 鼻
    const noseGeo = new THREE.BoxGeometry(0.3, 0.25, 0.3);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 1.6, 1.2);
    g.add(nose);

    // 体
    const bodyGeo = new THREE.BoxGeometry(1.6, 1.2, 2.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: coat, roughness: 0.9 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 1.0, 0);
    g.add(body);

    // 脚
    const legGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.0, 12);
    const legMat = new THREE.MeshStandardMaterial({ color: coat.clone().offsetHSL(0, 0, -0.25) });
    const offsets = [
      [-0.5, 0.0, 0.9],
      [0.5, 0.0, 0.9],
      [-0.5, 0.0, -0.9],
      [0.5, 0.0, -0.9]
    ];
    offsets.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.5, z);
      g.add(leg);
    });

    // 尻尾
    const tailGeo = new THREE.CylinderGeometry(0.18, 0.1, 1.2, 10);
    const tailMat = new THREE.MeshStandardMaterial({ color: coat.clone().offsetHSL(0, 0, 0.05) });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, 1.6, -1.2);
    tail.rotation.x = Math.PI / 3;
    g.add(tail);

    return g;
  }

  function rebuildAvatar() {
    if (avatarGroup) {
      scene.remove(avatarGroup);
    }
    avatarGroup = avatarMode === "human" ? createHumanAvatar() : createDogAvatar();
    avatarGroup.position.set(0, 0, -HALL_LENGTH / 2 + 6);
    scene.add(avatarGroup);
  }

  // 初期アバター
  rebuildAvatar();

  // ---------- カメラ位置 ----------
  let cameraYaw = 0; // 左右回転
  const CAMERA_HEIGHT = 6;
  const CAMERA_DISTANCE = 10;

  function updateCamera() {
    if (!avatarGroup) return;
    const target = avatarGroup.position;
    const behindX = target.x - Math.sin(cameraYaw) * CAMERA_DISTANCE;
    const behindZ = target.z - Math.cos(cameraYaw) * CAMERA_DISTANCE;
    camera.position.set(behindX, CAMERA_HEIGHT, behindZ);
    camera.lookAt(target.x, 2.0, target.z);
  }

  // ---------- 視点ドラッグ ----------
  let dragView = false;
  let lastX = 0;

  canvas.addEventListener("pointerdown", (e) => {
    dragView = true;
    lastX = e.clientX;
  });

  window.addEventListener("pointerup", () => {
    dragView = false;
  });

  window.addEventListener("pointermove", (e) => {
    if (!dragView) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    cameraYaw -= dx * 0.004; // 左右ドラッグで視点回転
  });

  // ---------- ジョイスティック ----------
  const joyBg = document.getElementById("joy-bg");
  const joyStick = document.getElementById("joy-stick");
  let joyActive = false;
  let joyStart = { x: 0, y: 0 };
  let joyOffset = { x: 0, y: 0 };
  const JOY_MAX = 40;

  function setJoyPosition(x, y) {
    joyStick.style.transform = `translate(${x}px, ${y}px)`;
  }

  function joyStartHandler(e) {
    e.preventDefault();
    joyActive = true;
    const rect = joyBg.getBoundingClientRect();
    joyStart.x = rect.left + rect.width / 2;
    joyStart.y = rect.top + rect.height / 2;
  }

  function joyMoveHandler(e) {
    if (!joyActive) return;
    const x = e.clientX ?? (e.touches && e.touches[0].clientX);
    const y = e.clientY ?? (e.touches && e.touches[0].clientY);
    if (x == null || y == null) return;

    let dx = x - joyStart.x;
    let dy = y - joyStart.y;

    const len = Math.hypot(dx, dy);
    if (len > JOY_MAX) {
      dx = (dx / len) * JOY_MAX;
      dy = (dy / len) * JOY_MAX;
    }
    joyOffset.x = dx;
    joyOffset.y = dy;
    setJoyPosition(dx, dy);
  }

  function joyEndHandler() {
    joyActive = false;
    joyOffset.x = 0;
    joyOffset.y = 0;
    setJoyPosition(0, 0);
  }

  joyBg.addEventListener("pointerdown", joyStartHandler);
  window.addEventListener("pointermove", joyMoveHandler);
  window.addEventListener("pointerup", joyEndHandler);
  joyBg.addEventListener("touchstart", joyStartHandler, { passive: false });
  window.addEventListener("touchmove", joyMoveHandler, { passive: false });
  window.addEventListener("touchend", joyEndHandler);

  // ---------- アバター切り替えボタン ----------
  const btnHuman = document.getElementById("btn-human");
  const btnDog = document.getElementById("btn-dog");

  function setMode(mode) {
    if (mode === avatarMode) {
      // 同じモードなら着せ替えだけ
      rebuildAvatar();
      return;
    }
    avatarMode = mode;
    btnHuman.classList.toggle("active", mode === "human");
    btnDog.classList.toggle("active", mode === "dog");
    rebuildAvatar();
  }

  btnHuman.addEventListener("click", () => setMode("human"));
  btnDog.addEventListener("click", () => setMode("dog"));

  // ---------- クリックで作品情報 ----------
  const infoPanel = document.getElementById("info-panel");
  const infoTitle = document.getElementById("info-title");
  const infoDesc = document.getElementById("info-desc");
  const infoClose = document.getElementById("info-close");
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function showInfo(art) {
    infoTitle.textContent = art.title;
    infoDesc.textContent = art.desc || "";
    infoPanel.classList.remove("hidden");
  }

  infoClose.addEventListener("click", () => {
    infoPanel.classList.add("hidden");
  });

  canvas.addEventListener("click", (e) => {
    if (dragView) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickable, true);
    if (hits.length > 0) {
      const g = hits[0].object.parent;
      const art = g.userData.art;
      if (art) showInfo(art);
    }
  });

  // ---------- 移動 ----------
  const tmpForward = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();

  function clampWithinHall(pos) {
    const marginX = HALL_WIDTH / 2 - 2;
    const marginZ = HALL_LENGTH / 2 - 4;
    pos.x = Math.max(-marginX, Math.min(marginX, pos.x));
    pos.z = Math.max(-marginZ, Math.min(marginZ, pos.z));
  }

  // ---------- レンダリングループ ----------
  function resizeRenderer() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resizeRenderer);
  resizeRenderer();

  function animate() {
    requestAnimationFrame(animate);

    // ジョイスティックから移動ベクトル計算
    if (avatarGroup) {
      const nx = joyOffset.x / JOY_MAX; // 左右
      const ny = joyOffset.y / JOY_MAX; // 上下（画面座標）

      // 画面上方向に倒すと前進 → -ny が前進量
      const forwardAmount = -ny;
      const strafeAmount = nx;

      // カメラの向きから前・右ベクトルを作る
      tmpForward.set(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
      tmpRight.set(tmpForward.z, 0, -tmpForward.x);

      const speed = 0.15;
      avatarGroup.position.addScaledVector(tmpForward, forwardAmount * speed);
      avatarGroup.position.addScaledVector(tmpRight, strafeAmount * speed);
      clampWithinHall(avatarGroup.position);
    }

    updateCamera();
    renderer.render(scene, camera);
  }

  animate();
})();
