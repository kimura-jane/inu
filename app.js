// app.js : TAF DOG MUSEUM
(function () {
  const canvas = document.getElementById('scene');

  // ------------------------------------------------------------------
  // Three.js 基本セットアップ
  // ------------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050509);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );

  // アバターの位置を基準にカメラを配置
  let cameraYaw = Math.PI;      // 後ろから見る
  let cameraPitch = 0.15;       // 少し見下ろす
  const cameraDistance = 18;

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(20, 40, 10);
  scene.add(dirLight);

  // ------------------------------------------------------------------
  // ミュージアム空間
  // ------------------------------------------------------------------
  const corridorWidth = 16;      // 左右の壁の距離
  const wallX = corridorWidth / 2 - 0.2;
  const spacing = 6;             // 額の間隔
  const corridorLength = WORKS.length * spacing + 20;

  // 床
  const floorGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.9,
    metalness: 0.0
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -corridorLength / 2);
  scene.add(floor);

  // 天井
  const ceilGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x101018,
    roughness: 0.8,
    metalness: 0.1
  });
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 8, -corridorLength / 2);
  scene.add(ceiling);

  // 壁（左右）
  const wallGeo = new THREE.PlaneGeometry(corridorLength, 8);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.7,
    metalness: 0.0
  });

  const wallLeft = new THREE.Mesh(wallGeo, wallMat);
  wallLeft.rotation.y = Math.PI / 2;
  wallLeft.position.set(-wallX, 4, -corridorLength / 2);
  scene.add(wallLeft);

  const wallRight = new THREE.Mesh(wallGeo, wallMat);
  wallRight.rotation.y = -Math.PI / 2;
  wallRight.position.set(wallX, 4, -corridorLength / 2);
  scene.add(wallRight);

  // 天井のラインライト風
  const lightStripGeo = new THREE.PlaneGeometry(2, 0.4);
  const lightStripMat = new THREE.MeshBasicMaterial({
    color: 0xffffff
  });
  const stripCount = 14;
  for (let i = 0; i < stripCount; i++) {
    const strip = new THREE.Mesh(lightStripGeo, lightStripMat);
    strip.rotation.x = Math.PI / 2;
    const z = -5 - (i * (corridorLength - 10)) / (stripCount - 1);
    strip.position.set(0, 7.8, z);
    scene.add(strip);
  }

  // ------------------------------------------------------------------
  // 額縁 + 作品
  // ------------------------------------------------------------------
  const texLoader = new THREE.TextureLoader();
  const clickableMeshes = [];  // Raycaster 用

  function createFrameWithArt(work, side, index) {
    // side: -1 = 左壁, +1 = 右壁
    const artWidth = 3.0;
    const artHeight = 3.0;

    // 作品本体
    const artGeo = new THREE.PlaneGeometry(artWidth, artHeight);
    const tex = texLoader.load(work.file);
    const artMat = new THREE.MeshBasicMaterial({ map: tex });
    const artMesh = new THREE.Mesh(artGeo, artMat);

    // 豪華な額縁いろいろ
    const frameType = index % 4;
    const frameOuterW = artWidth + 0.7;
    const frameOuterH = artHeight + 0.7;
    const frameDepth = 0.25;

    const frameGeo = new THREE.BoxGeometry(frameOuterW, frameOuterH, frameDepth);

    let frameColor;
    let metalness = 0.9;
    let roughness = 0.3;

    switch (frameType) {
      case 0: // 金ピカ
        frameColor = 0xd6b676;
        metalness = 1.0;
        roughness = 0.25;
        break;
      case 1: // 黒いモダンフレーム
        frameColor = 0x111111;
        metalness = 0.7;
        roughness = 0.4;
        break;
      case 2: // シルバー + ビス
        frameColor = 0xc0c0c0;
        metalness = 1.0;
        roughness = 0.2;
        break;
      default: // 木目
        frameColor = 0x8b5a2b;
        metalness = 0.5;
        roughness = 0.6;
    }

    const frameMat = new THREE.MeshStandardMaterial({
      color: frameColor,
      metalness,
      roughness
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);

    const group = new THREE.Group();
    artMesh.position.z = frameDepth / 2 + 0.01;
    group.add(frameMesh);
    group.add(artMesh);

    // 壁に貼り付け
    const z = -10 - index * spacing;
    const y = 4; // 中心高さ
    const x = side * (wallX - 0.1);

    group.position.set(x, y, z);
    group.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(group);

    // スポットライト
    const spot = new THREE.SpotLight(0xffffff, 1.0, 18, Math.PI / 6, 0.5, 1.5);
    spot.position.set(x - side * 1.5, 7.3, z + 0.1);
    spot.target = group;
    scene.add(spot);

    // Raycaster に登録
    artMesh.userData.work = work;
    clickableMeshes.push(artMesh);
  }

  WORKS.forEach((work, i) => {
    createFrameWithArt(work, -1, i); // 左
    createFrameWithArt(work, +1, i); // 右
  });

  // ------------------------------------------------------------------
  // アバター定義（人間10種・犬10種）
  // ------------------------------------------------------------------
  function makeHuman(bodyColor, coatColor, hairColor) {
    const group = new THREE.Group();

    // 頭
    const headGeo = new THREE.SphereGeometry(0.8, 24, 24);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffe0bd });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.7;
    group.add(head);

    // 髪
    const hairGeo = new THREE.SphereGeometry(0.82, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 2.9;
    group.add(hair);

    // 体
    const bodyGeo = new THREE.CylinderGeometry(0.9, 0.95, 2.0, 20);
    const bodyMat = new THREE.MeshStandardMaterial({ color: coatColor });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.5;
    group.add(body);

    // 腕
    const armGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.6, 16);
    const armMat = new THREE.MeshStandardMaterial({ color: coatColor });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-1.05, 1.5, 0);
    group.add(leftArm);

    const rightArm = leftArm.clone();
    rightArm.position.x = 1.05;
    group.add(rightArm);

    // 足
    const legGeo = new THREE.CylinderGeometry(0.28, 0.28, 1.7, 16);
    const legMat = new THREE.MeshStandardMaterial({ color: bodyColor });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.45, 0.3, 0);
    group.add(leftLeg);

    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.45;
    group.add(rightLeg);

    // 靴
    const shoeGeo = new THREE.BoxGeometry(0.7, 0.4, 1.1);
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(-0.45, -0.55, 0.25);
    group.add(leftShoe);

    const rightShoe = leftShoe.clone();
    rightShoe.position.x = 0.45;
    group.add(rightShoe);

    return group;
  }

  function makeDog(bodyColor, accentColor, earColor) {
    const group = new THREE.Group();

    // 胴体
    const bodyGeo = new THREE.BoxGeometry(2.2, 1.4, 3.0);
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    group.add(body);

    // 頭
    const headGeo = new THREE.BoxGeometry(1.8, 1.7, 1.8);
    const headMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 2.0, 1.4);
    group.add(head);

    // 口元
    const snoutGeo = new THREE.BoxGeometry(1.0, 0.7, 0.9);
    const snoutMat = new THREE.MeshStandardMaterial({ color: accentColor });
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0, 1.7, 2.1);
    group.add(snout);

    // 耳
    const earGeo = new THREE.BoxGeometry(0.4, 0.9, 0.2);
    const earMat = new THREE.MeshStandardMaterial({ color: earColor });
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.9, 2.6, 1.2);
    group.add(leftEar);
    const rightEar = leftEar.clone();
    rightEar.position.x = 0.9;
    group.add(rightEar);

    // 足
    const legGeo = new THREE.CylinderGeometry(0.22, 0.26, 1.2, 12);
    const legMat = new THREE.MeshStandardMaterial({ color: bodyColor });
    const legPositions = [
      [-0.7, 0.0, -1.0],
      [0.7, 0.0, -1.0],
      [-0.7, 0.0, 0.5],
      [0.7, 0.0, 0.5]
    ];
    legPositions.forEach((p) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(p[0], p[1], p[2]);
      group.add(leg);
    });

    // しっぽ
    const tailGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.0, 10);
    const tailMat = new THREE.MeshStandardMaterial({ color: bodyColor });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, 1.6, -1.8);
    tail.rotation.x = Math.PI / 4;
    group.add(tail);

    return group;
  }

  const HUMAN_VARIANTS = [
    () => makeHuman(0x333333, 0xf0b000, 0x442200),
    () => makeHuman(0x111111, 0x0066cc, 0x222222),
    () => makeHuman(0x222222, 0xcc3366, 0x331111),
    () => makeHuman(0x333333, 0x009966, 0x663300),
    () => makeHuman(0x111111, 0xffffff, 0x000000),
    () => makeHuman(0x333333, 0x8844cc, 0x553377),
    () => makeHuman(0x111111, 0xff6600, 0x663300),
    () => makeHuman(0x111111, 0x999999, 0x222222),
    () => makeHuman(0x222222, 0x4caf50, 0x004400),
    () => makeHuman(0x111111, 0x3f51b5, 0x101020)
  ];

  const DOG_VARIANTS = [
    () => makeDog(0x444444, 0x222222, 0x111111),
    () => makeDog(0x8d6e63, 0x5d4037, 0x3e2723),
    () => makeDog(0xf5f5f5, 0xeeeeee, 0xcccccc),
    () => makeDog(0xffcc80, 0xffb74d, 0xef6c00),
    () => makeDog(0x90a4ae, 0x78909c, 0x455a64),
    () => makeDog(0x795548, 0x5d4037, 0x3e2723),
    () => makeDog(0xffeb3b, 0xfbc02d, 0xf57f17),
    () => makeDog(0xa1887f, 0x8d6e63, 0x4e342e),
    () => makeDog(0x546e7a, 0x455a64, 0x263238),
    () => makeDog(0xd7ccc8, 0xbcaaa4, 0x8d6e63)
  ];

  let avatarMode = 'human';
  let avatar;
  const avatarPos = new THREE.Vector3(0, 0, 4);

  function spawnAvatar() {
    if (avatar) {
      scene.remove(avatar);
    }
    const list = avatarMode === 'human' ? HUMAN_VARIANTS : DOG_VARIANTS;
    const maker = list[Math.floor(Math.random() * list.length)];
    avatar = maker();
    avatar.position.copy(avatarPos);
    scene.add(avatar);
  }

  spawnAvatar();

  // ------------------------------------------------------------------
  // アバター切り替えボタン
  // ------------------------------------------------------------------
  const btnHuman = document.getElementById('btn-human');
  const btnDog = document.getElementById('btn-dog');

  btnHuman.addEventListener('click', () => {
    if (avatarMode === 'human') {
      spawnAvatar(); // 同じモードならランダム着替え
      return;
    }
    avatarMode = 'human';
    btnHuman.classList.add('active');
    btnDog.classList.remove('active');
    spawnAvatar();
  });

  btnDog.addEventListener('click', () => {
    if (avatarMode === 'dog') {
      spawnAvatar();
      return;
    }
    avatarMode = 'dog';
    btnDog.classList.add('active');
    btnHuman.classList.remove('active');
    spawnAvatar();
  });

  // ------------------------------------------------------------------
  // ジョイスティック（前＝前進 / 左右＝横移動）
  // ------------------------------------------------------------------
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');
  let joyRect = joyBg.getBoundingClientRect();
  let joyCenter = { x: joyRect.left + joyRect.width / 2, y: joyRect.top + joyRect.height / 2 };
  let isJoyActive = false;
  let joyDX = 0;
  let joyDY = 0;

  function updateJoyRect() {
    joyRect = joyBg.getBoundingClientRect();
    joyCenter = {
      x: joyRect.left + joyRect.width / 2,
      y: joyRect.top + joyRect.height / 2
    };
  }

  window.addEventListener('resize', updateJoyRect);
  updateJoyRect();

  function handleJoyStart(e) {
    isJoyActive = true;
    handleJoyMove(e);
  }

  function handleJoyMove(e) {
    if (!isJoyActive) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - joyCenter.x;
    const dy = touch.clientY - joyCenter.y;
    const maxR = joyRect.width / 2 - 8;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxR);
    const angle = Math.atan2(dy, dx);
    joyDX = Math.cos(angle) * dist;
    joyDY = Math.sin(angle) * dist;
    joyStick.style.transform = `translate(${joyDX}px, ${joyDY}px)`;
  }

  function handleJoyEnd() {
    isJoyActive = false;
    joyDX = 0;
    joyDY = 0;
    joyStick.style.transform = 'translate(0, 0)';
  }

  joyBg.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handleJoyStart(e);
  });
  window.addEventListener('pointermove', handleJoyMove);
  window.addEventListener('pointerup', handleJoyEnd);
  window.addEventListener('pointercancel', handleJoyEnd);

  // ------------------------------------------------------------------
  // カメラのドラッグ操作（視点回転）
  // ------------------------------------------------------------------
  let draggingView = false;
  let lastX = 0;
  let lastY = 0;
  let movedDistance = 0; // クリック判定用

  canvas.addEventListener('pointerdown', (e) => {
    draggingView = true;
    lastX = e.clientX;
    lastY = e.clientY;
    movedDistance = 0;
  });

  window.addEventListener('pointermove', (e) => {
    if (!draggingView) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    movedDistance += Math.abs(dx) + Math.abs(dy);

    cameraYaw -= dx * 0.005;
    cameraPitch += dy * 0.005;
    cameraPitch = Math.max(-0.4, Math.min(0.6, cameraPitch));
  });

  window.addEventListener('pointerup', () => {
    draggingView = false;
  });
  window.addEventListener('pointercancel', () => {
    draggingView = false;
  });

  // ------------------------------------------------------------------
  // クリックで作品を拡大（Raycaster）
  // ------------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();

  const infoPanel = document.getElementById('info-panel');
  const infoClose = document.getElementById('info-close');
  const infoImage = document.getElementById('info-image');
  const infoTitle = document.getElementById('info-title');
  const infoDesc = document.getElementById('info-desc');

  function showInfo(work) {
    infoImage.src = work.file;
    infoTitle.textContent = work.title || `TAF DOG #${work.id}`;
    infoDesc.textContent = work.desc || '';
    infoPanel.classList.remove('hidden');
  }

  infoClose.addEventListener('click', () => {
    infoPanel.classList.add('hidden');
  });
  infoPanel.addEventListener('click', (e) => {
    if (e.target === infoPanel) {
      infoPanel.classList.add('hidden');
    }
  });

  canvas.addEventListener('click', (e) => {
    // 視点ドラッグのときは無視
    if (movedDistance > 6) return;

    const rect = canvas.getBoundingClientRect();
    pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(clickableMeshes, false);
    if (hits.length > 0) {
      const mesh = hits[0].object;
      const work = mesh.userData.work;
      if (work) showInfo(work);
    }
  });

  // ------------------------------------------------------------------
  // 移動・カメラ更新
  // ------------------------------------------------------------------
  function clampAvatarPosition() {
    const margin = 2.2;
    const maxX = corridorWidth / 2 - margin;
    const minX = -maxX;
    const minZ = -corridorLength + 8;
    const maxZ = 6;

    avatarPos.x = Math.max(minX, Math.min(maxX, avatarPos.x));
    avatarPos.z = Math.max(minZ, Math.min(maxZ, avatarPos.z));
  }

  function updateCamera() {
    if (!avatar) return;
    const target = new THREE.Vector3(
      avatarPos.x,
      avatarPos.y + (avatarMode === 'human' ? 3.0 : 2.0),
      avatarPos.z
    );

    const r = cameraDistance;
    const cy = cameraPitch;
    const cx = cameraYaw;

    const x = target.x + r * Math.sin(cx) * Math.cos(cy);
    const y = target.y + r * Math.sin(cy) + 3;
    const z = target.z + r * Math.cos(cx) * Math.cos(cy);

    camera.position.set(x, y, z);
    camera.lookAt(target);
  }

  // ------------------------------------------------------------------
  // メインループ
  // ------------------------------------------------------------------
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    // ジョイスティック移動
    if (avatar) {
      const maxR = joyRect.width / 2 - 8;
      const nx = joyDX / maxR;
      const ny = joyDY / maxR;
      const dead = 0.1;

      let moveX = 0;
      let moveZ = 0;

      if (Math.abs(nx) > dead || Math.abs(ny) > dead) {
        // 前（上方向）に倒したら前進・左右は横移動
        const forward = -ny; // 上に倒すと ny<0 → forward>0
        const strafe = nx;

        const speed = 10 * dt;
        moveX = strafe * speed;
        moveZ = -forward * speed;
      }

      avatarPos.x += moveX;
      avatarPos.z += moveZ;
      clampAvatarPosition();
      avatar.position.copy(avatarPos);
    }

    updateCamera();
    renderer.render(scene, camera);
  }

  animate();

  // ------------------------------------------------------------------
  // リサイズ
  // ------------------------------------------------------------------
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    updateJoyRect();
  });
})();
