// app.js - TAF DOG MUSEUM
// 3人称視点＋アバター切替（人/犬）、豪華額装、ジョイスティック移動

(function () {
  const canvas = document.getElementById('scene');

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  resizeRenderer();

  // ---------- scene & camera ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050509);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );

  let viewAngle = 0; // 水平方向の向き（ドラッグで変更）

  // ---------- lights ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.32);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.45);
  dir.position.set(4, 6, 3);
  scene.add(dir);

  // ---------- gallery base (床・天井・壁) ----------
  const floorGeo = new THREE.PlaneGeometry(8, 240);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x222226,
    roughness: 0.9,
    metalness: 0.08
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  const ceiling = floor.clone();
  ceiling.position.y = 3.2;
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf2f2f4,
    roughness: 0.9,
    metalness: 0.02
  });

  const wallGeo = new THREE.PlaneGeometry(240, 3.2);
  const wallLeft = new THREE.Mesh(wallGeo, wallMat);
  wallLeft.position.set(-3, 1.6, -120);
  wallLeft.rotation.y = Math.PI / 2;
  scene.add(wallLeft);

  const wallRight = wallLeft.clone();
  wallRight.position.x = 3;
  wallRight.rotation.y = -Math.PI / 2;
  scene.add(wallRight);

  // 巾木
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x9a9a9f,
    roughness: 0.5,
    metalness: 0.1
  });
  const baseGeo = new THREE.BoxGeometry(0.09, 0.28, 240);
  const baseLeft = new THREE.Mesh(baseGeo, baseMat);
  baseLeft.position.set(-2.95, 0.14, -120);
  scene.add(baseLeft);
  const baseRight = baseLeft.clone();
  baseRight.position.x = 2.95;
  scene.add(baseRight);

  // 天井の連続ライト
  const ceilingStripMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 18; i++) {
    const geo = new THREE.PlaneGeometry(1.8, 0.5);
    const mesh = new THREE.Mesh(geo, ceilingStripMat);
    mesh.position.set(0, 3.18, -3 - i * 4);
    mesh.rotation.x = Math.PI / 2;
    scene.add(mesh);
  }

  // ---------- アバター定義 ----------
  // builder 関数（ローポリの人＆犬）

  function buildAvatarHuman01() {
    const g = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffe1c4,
      roughness: 0.6,
      metalness: 0.05
    });
    const clothMat = new THREE.MeshStandardMaterial({
      color: 0x3c6df2,
      roughness: 0.55,
      metalness: 0.1
    });
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x22242a,
      roughness: 0.7,
      metalness: 0.05
    });

    // 脚
    const legGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.5, 10);
    const lLeg = new THREE.Mesh(legGeo, legMat);
    const rLeg = lLeg.clone();
    lLeg.position.set(-0.11, 0.25, 0);
    rLeg.position.set(0.11, 0.25, 0);
    g.add(lLeg, rLeg);

    // 靴
    const shoeGeo = new THREE.BoxGeometry(0.18, 0.1, 0.28);
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.5,
      metalness: 0.1
    });
    const lShoe = new THREE.Mesh(shoeGeo, shoeMat);
    const rShoe = lShoe.clone();
    lShoe.position.set(-0.11, 0.05, 0.05);
    rShoe.position.set(0.11, 0.05, 0.05);
    g.add(lShoe, rShoe);

    // 体
    const bodyGeo = new THREE.CylinderGeometry(0.26, 0.28, 0.8, 14);
    const body = new THREE.Mesh(bodyGeo, clothMat);
    body.position.y = 0.8;
    g.add(body);

    // 腕
    const armGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.55, 10);
    const lArm = new THREE.Mesh(armGeo, clothMat);
    const rArm = lArm.clone();
    lArm.position.set(-0.33, 0.9, 0);
    rArm.position.set(0.33, 0.9, 0);
    lArm.rotation.z = Math.PI / 32;
    rArm.rotation.z = -Math.PI / 32;
    g.add(lArm, rArm);

    // 首
    const neckGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.15, 10);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 1.26;
    g.add(neck);

    // 頭
    const headGeo = new THREE.SphereGeometry(0.32, 18, 18);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.55;
    g.add(head);

    // 髪
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x202127,
      roughness: 0.6,
      metalness: 0.05
    });
    const hairGeo = new THREE.SphereGeometry(0.34, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.7);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.58;
    g.add(hair);

    return g;
  }

  function buildAvatarHuman02() {
    const g = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffe1c4,
      roughness: 0.6,
      metalness: 0.05
    });
    const coatMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.4,
      metalness: 0.4
    });
    const pantMat = new THREE.MeshStandardMaterial({
      color: 0x404552,
      roughness: 0.7,
      metalness: 0.1
    });

    const legGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.52, 10);
    const lLeg = new THREE.Mesh(legGeo, pantMat);
    const rLeg = lLeg.clone();
    lLeg.position.set(-0.11, 0.26, 0);
    rLeg.position.set(0.11, 0.26, 0);
    g.add(lLeg, rLeg);

    const bootGeo = new THREE.BoxGeometry(0.2, 0.13, 0.3);
    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x1b1b1b,
      roughness: 0.4,
      metalness: 0.4
    });
    const lb = new THREE.Mesh(bootGeo, bootMat);
    const rb = lb.clone();
    lb.position.set(-0.11, 0.08, 0.05);
    rb.position.set(0.11, 0.08, 0.05);
    g.add(lb, rb);

    const bodyGeo = new THREE.CylinderGeometry(0.28, 0.3, 0.9, 16);
    const body = new THREE.Mesh(bodyGeo, coatMat);
    body.position.y = 0.86;
    g.add(body);

    // 腕（コート）
    const armGeo = new THREE.CylinderGeometry(0.075, 0.08, 0.6, 10);
    const lArm = new THREE.Mesh(armGeo, coatMat);
    const rArm = lArm.clone();
    lArm.position.set(-0.34, 0.98, 0.02);
    rArm.position.set(0.34, 0.98, 0.02);
    lArm.rotation.z = Math.PI / 18;
    rArm.rotation.z = -Math.PI / 18;
    g.add(lArm, rArm);

    const neckGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.15, 10);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 1.33;
    g.add(neck);

    const headGeo = new THREE.SphereGeometry(0.34, 18, 18);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.62;
    g.add(head);

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x804020,
      roughness: 0.6,
      metalness: 0.05
    });
    const hairGeo = new THREE.SphereGeometry(0.36, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.6);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.66;
    g.add(hair);

    return g;
  }

  // 犬アバター（3パターン）

  function buildAvatarDogShiba() {
    const g = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf2b15b,
      roughness: 0.6,
      metalness: 0.08
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xfaf3e5,
      roughness: 0.7,
      metalness: 0.03
    });

    const bodyGeo = new THREE.BoxGeometry(0.9, 0.45, 1.1);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.55, 0);
    g.add(body);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), whiteMat);
    chest.position.set(0, 0.55, 0.22);
    g.add(chest);

    const headGeo = new THREE.BoxGeometry(0.6, 0.55, 0.6);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 0.95, 0.3);
    g.add(head);

    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.38), whiteMat);
    muzzle.position.set(0, 0.85, 0.61);
    g.add(muzzle);

    const earGeo = new THREE.ConeGeometry(0.14, 0.25, 4);
    const le = new THREE.Mesh(earGeo, bodyMat);
    const re = le.clone();
    le.position.set(-0.19, 1.18, 0.15);
    re.position.set(0.19, 1.18, 0.15);
    le.rotation.z = Math.PI / 16;
    re.rotation.z = -Math.PI / 16;
    g.add(le, re);

    const legGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.45, 8);
    const fl = new THREE.Mesh(legGeo, bodyMat);
    const fr = fl.clone();
    const bl = fl.clone();
    const br = fl.clone();
    fl.position.set(-0.25, 0.23, 0.36);
    fr.position.set(0.25, 0.23, 0.36);
    bl.position.set(-0.25, 0.23, -0.36);
    br.position.set(0.25, 0.23, -0.36);
    g.add(fl, fr, bl, br);

    const tailGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 10);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.set(0.15, 0.84, -0.52);
    tail.rotation.x = Math.PI / 2.2;
    tail.rotation.z = Math.PI / 6;
    g.add(tail);

    return g;
  }

  function buildAvatarDogBlack() {
    const g = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x44464b,
      roughness: 0.65,
      metalness: 0.1
    });
    const maskMat = new THREE.MeshStandardMaterial({
      color: 0xf7f7f7,
      roughness: 0.8,
      metalness: 0.02
    });

    const bodyGeo = new THREE.BoxGeometry(1.0, 0.5, 1.2);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.55, 0);
    g.add(body);

    const headGeo = new THREE.BoxGeometry(0.7, 0.6, 0.7);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 1.0, 0.3);
    g.add(head);

    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.38), maskMat);
    mask.position.set(0, 0.95, 0.63);
    g.add(mask);

    const earGeo = new THREE.ConeGeometry(0.16, 0.32, 5);
    const le = new THREE.Mesh(earGeo, bodyMat);
    const re = le.clone();
    le.position.set(-0.23, 1.25, 0.1);
    re.position.set(0.23, 1.25, 0.1);
    g.add(le, re);

    const legGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.48, 8);
    const fl = new THREE.Mesh(legGeo, bodyMat);
    const fr = fl.clone();
    const bl = fl.clone();
    const br = fl.clone();
    fl.position.set(-0.29, 0.24, 0.38);
    fr.position.set(0.29, 0.24, 0.38);
    bl.position.set(-0.29, 0.24, -0.38);
    br.position.set(0.29, 0.24, -0.38);
    g.add(fl, fr, bl, br);

    const tailGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.55, 10);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.set(0, 0.85, -0.65);
    tail.rotation.x = Math.PI / 3;
    g.add(tail);

    return g;
  }

  function buildAvatarDogSmallWhite() {
    const g = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xfdf7f0,
      roughness: 0.8,
      metalness: 0.05
    });

    const bodyGeo = new THREE.BoxGeometry(0.7, 0.4, 0.9);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.45, 0);
    g.add(body);

    const headGeo = new THREE.BoxGeometry(0.6, 0.55, 0.6);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 0.9, 0.25);
    g.add(head);

    const earGeo = new THREE.BoxGeometry(0.13, 0.25, 0.04);
    const le = new THREE.Mesh(earGeo, bodyMat);
    const re = le.clone();
    le.position.set(-0.28, 1.02, 0.15);
    re.position.set(0.28, 1.02, 0.15);
    g.add(le, re);

    const legGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.4, 8);
    const fl = new THREE.Mesh(legGeo, bodyMat);
    const fr = fl.clone();
    const bl = fl.clone();
    const br = fl.clone();
    fl.position.set(-0.22, 0.2, 0.3);
    fr.position.set(0.22, 0.2, 0.3);
    bl.position.set(-0.22, 0.2, -0.3);
    br.position.set(0.22, 0.2, -0.3);
    g.add(fl, fr, bl, br);

    const tailGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 8);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.set(-0.05, 0.72, -0.45);
    tail.rotation.x = Math.PI / 2.4;
    tail.rotation.z = -Math.PI / 6;
    g.add(tail);

    return g;
  }

  // アバタータイプ設定
  const AVATAR_TYPES = [
    { id: 'human_01', label: 'HUMAN 1', builder: buildAvatarHuman01 },
    { id: 'human_02', label: 'HUMAN 2', builder: buildAvatarHuman02 },
    { id: 'dog_shiba', label: 'DOG 1', builder: buildAvatarDogShiba },
    { id: 'dog_black', label: 'DOG 2', builder: buildAvatarDogBlack },
    { id: 'dog_white', label: 'DOG 3', builder: buildAvatarDogSmallWhite }
  ];

  // アバターのルート（位置だけここを動かす）
  const avatarRoot = new THREE.Object3D();
  avatarRoot.position.set(0, 0, 6); // 手前スタート
  scene.add(avatarRoot);

  const avatars = {};
  let activeAvatarId = null;

  AVATAR_TYPES.forEach(t => {
    const g = t.builder();
    g.visible = false;
    avatars[t.id] = g;
    avatarRoot.add(g);
  });

  function setAvatar(id) {
    activeAvatarId = id;
    Object.keys(avatars).forEach(key => {
      avatars[key].visible = (key === id);
    });
  }

  // 最初のアバター
  setAvatar(AVATAR_TYPES[0].id);

  // ---------- アバター切替ボタン生成 ----------
  const avatarSwitcher = document.getElementById('avatar-switcher');
  avatarSwitcher.innerHTML = ''; // 既存ボタンをクリア

  AVATAR_TYPES.forEach((t, index) => {
    const btn = document.createElement('button');
    btn.className = 'avatar-btn' + (index === 0 ? ' active' : '');
    btn.textContent = t.label;
    btn.dataset.avatarId = t.id;
    avatarSwitcher.appendChild(btn);

    btn.addEventListener('click', () => {
      setAvatar(t.id);
      document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ---------- 額装付きの作品配置 ----------
  const textureLoader = new THREE.TextureLoader();
  const clickableMeshes = [];

  const frameWidth = 1.5;
  const frameHeight = 1.5;
  const spacingZ = 3.0;

  const FRAME_STYLES = [
    {
      name: 'gold-baroque',
      frameColor: 0xd4af37,
      innerColor: 0x5a3b12,
      matColor: 0xf8f0db,
      borderThickness: 0.22,
      frameDepth: 0.18,
      matWidth: 1.30,
      artWidth: 1.06
    },
    {
      name: 'dark-wood',
      frameColor: 0x3b2414,
      innerColor: 0x705034,
      matColor: 0xf5f5f7,
      borderThickness: 0.18,
      frameDepth: 0.14,
      matWidth: 1.28,
      artWidth: 1.05
    },
    {
      name: 'white-modern',
      frameColor: 0xf5f5f7,
      innerColor: 0xd0d0d8,
      matColor: 0xffffff,
      borderThickness: 0.14,
      frameDepth: 0.12,
      matWidth: 1.32,
      artWidth: 1.08
    },
    {
      name: 'black-slim',
      frameColor: 0x111111,
      innerColor: 0x555555,
      matColor: 0xfaf8f2,
      borderThickness: 0.12,
      frameDepth: 0.13,
      matWidth: 1.30,
      artWidth: 1.04
    }
  ];

  (WORKS || []).forEach(function (work, index) {
    const side = index % 2 === 0 ? -1 : 1; // 左右交互
    const idxOnSide = Math.floor(index / 2);
    const z = -idxOnSide * spacingZ - 4;

    const style = FRAME_STYLES[index % FRAME_STYLES.length];

    const group = new THREE.Group();
    group.position.set(side * 2.95, 1.6, z);
    group.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(group);

    // 背板
    const backGeo = new THREE.PlaneGeometry(frameWidth, frameHeight);
    const backMat = new THREE.MeshStandardMaterial({
      color: style.innerColor,
      metalness: 0.4,
      roughness: 0.6
    });
    const back = new THREE.Mesh(backGeo, backMat);
    group.add(back);

    // フレーム（4辺の立体）
    const frameMat = new THREE.MeshStandardMaterial({
      color: style.frameColor,
      metalness: 0.8,
      roughness: 0.25
    });
    const t = style.borderThickness;
    const d = style.frameDepth;

    function addBorder(w, h, x, y) {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, frameMat);
      mesh.position.set(x, y, -0.04);
      group.add(mesh);
    }

    addBorder(frameWidth, t, 0, (frameHeight - t) / 2);   // 上
    addBorder(frameWidth, t, 0, -(frameHeight - t) / 2);  // 下
    addBorder(t, frameHeight - 2 * t, -(frameWidth - t) / 2, 0); // 左
    addBorder(t, frameHeight - 2 * t, (frameWidth - t) / 2, 0);  // 右

    // コーナー装飾
    const decoGeo = new THREE.ConeGeometry(0.07, 0.12, 6);
    const decoMat = new THREE.MeshStandardMaterial({
      color: style.frameColor,
      metalness: 0.9,
      roughness: 0.2
    });
    const corners = [
      [-frameWidth / 2 + t / 2, frameHeight / 2 - t / 2],
      [frameWidth / 2 - t / 2, frameHeight / 2 - t / 2],
      [-frameWidth / 2 + t / 2, -frameHeight / 2 + t / 2],
      [frameWidth / 2 - t / 2, -frameHeight / 2 + t / 2]
    ];
    corners.forEach(([cx, cy]) => {
      const deco = new THREE.Mesh(decoGeo, decoMat);
      deco.rotation.z = Math.PI;
      deco.position.set(cx, cy, -0.02);
      group.add(deco);
    });

    // マット
    const matGeo = new THREE.PlaneGeometry(style.matWidth, style.matWidth);
    const matMat = new THREE.MeshStandardMaterial({
      color: style.matColor,
      roughness: 1.0,
      metalness: 0.0
    });
    const matPlane = new THREE.Mesh(matGeo, matMat);
    matPlane.position.z = 0.01;
    group.add(matPlane);

    // 絵
    const artGeo = new THREE.PlaneGeometry(style.artWidth, style.artWidth);
    const tex = textureLoader.load(work.image);
    const artMat = new THREE.MeshStandardMaterial({
      map: tex,
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.02
    });
    const artMesh = new THREE.Mesh(artGeo, artMat);
    artMesh.position.z = 0.02;
    artMesh.userData.work = work;
    group.add(artMesh);

    clickableMeshes.push(artMesh);

    // スポットライト（各作品用）
    const spot = new THREE.SpotLight(0xffffff, 1.1, 8, Math.PI / 7, 0.4, 1.4);
    const lightX = side * 1.7;
    spot.position.set(lightX, 3.05, z);
    const target = new THREE.Object3D();
    target.position.set(group.position.x, group.position.y + 0.1, group.position.z);
    scene.add(target);
    spot.target = target;
    scene.add(spot);
  });

  // ---------- ドラッグで視点回転 ----------
  let dragging = false;
  let lastX = 0;

  canvas.addEventListener('pointerdown', function (e) {
    dragging = true;
    lastX = e.clientX;
  });

  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointerleave', () => { dragging = false; });

  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    viewAngle -= dx * 0.004;
  });

  // ---------- ジョイスティック ----------
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');
  const joyRect = { x: 0, y: 0, r: 0 };
  let joyActive = false;
  let joyDX = 0;
  let joyDY = 0;

  function updateJoyRect() {
    const rect = joyBg.getBoundingClientRect();
    joyRect.x = rect.left + rect.width / 2;
    joyRect.y = rect.top + rect.height / 2;
    joyRect.r = rect.width / 2;
  }
  updateJoyRect();
  window.addEventListener('resize', updateJoyRect);

  joyBg.addEventListener('pointerdown', function (e) {
    joyActive = true;
    joyBg.setPointerCapture(e.pointerId);
    handleJoyMove(e);
  });

  joyBg.addEventListener('pointermove', function (e) {
    if (!joyActive) return;
    handleJoyMove(e);
  });

  joyBg.addEventListener('pointerup', function () {
    joyActive = false;
    joyDX = 0;
    joyDY = 0;
    joyStick.style.transform = 'translate(-50%, -50%)';
  });

  function handleJoyMove(e) {
    const dx = e.clientX - joyRect.x;
    const dy = e.clientY - joyRect.y;
    const max = joyRect.r - 16;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const ratio = dist > max ? max / dist : 1;
    const ndx = dx * ratio;
    const ndy = dy * ratio;

    joyDX = ndx / max; // -1〜1（右が＋）
    joyDY = ndy / max; // -1〜1（上がマイナス・下がプラス）

    joyStick.style.transform =
      `translate(calc(-50% + ${ndx}px), calc(-50% + ${ndy}px))`;
  }

  // ---------- 作品タップで拡大 ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  canvas.addEventListener('click', onTap);

  function onTap(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    pointer.set(x, y);

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clickableMeshes, false);
    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const work = mesh.userData.work;
      if (work) showInfo(work);
    }
  }

  const infoPanel = document.getElementById('info-panel');
  const infoClose = document.getElementById('info-close');
  const infoImage = document.getElementById('info-image');
  const infoTitle = document.getElementById('info-title');
  const infoDesc = document.getElementById('info-desc');

  function showInfo(work) {
    infoImage.src = work.image;
    infoTitle.textContent = work.title || ('TAF DOG #' + work.id);
    infoDesc.textContent = work.description || '';
    infoPanel.classList.remove('hidden');
  }

  infoClose.addEventListener('click', function () {
    infoPanel.classList.add('hidden');
  });

  infoPanel.addEventListener('click', function (e) {
    if (e.target === infoPanel) infoPanel.classList.add('hidden');
  });

  // ---------- アニメーション ----------
  function animate() {
    requestAnimationFrame(animate);

    const deadZone = 0.12;
    let moveX = 0;
    let moveZ = 0;

    if (Math.abs(joyDX) > deadZone || Math.abs(joyDY) > deadZone) {
      const speedBase = 0.07;
      const mag = Math.min(1, Math.hypot(joyDX, joyDY));
      const speed = speedBase * mag;

      // ここがポイント：
      // joyDY は「上がマイナス / 下がプラス」なので、
      // 上に倒す（前進）＝ joyDY < 0 → forwardInput をマイナス方向にしたい → そのまま使う
      const forwardInput = joyDY;   // 上に倒すと奥へ（zがマイナス方向に進む）
      const strafeInput = joyDX;

      const cosA = Math.cos(viewAngle);
      const sinA = Math.sin(viewAngle);

      moveZ = (forwardInput * cosA - strafeInput * sinA) * speed;
      moveX = (forwardInput * sinA + strafeInput * cosA) * speed * 0.7;
    }

    if (moveZ !== 0 || moveX !== 0) {
      const rows = Math.ceil((WORKS || []).length / 2);
      const minZ = -spacingZ * rows - 6;
      const maxZ = 6;
      const minX = -2.0;
      const maxX = 2.0;

      avatarRoot.position.z += moveZ;
      avatarRoot.position.x += moveX;

      if (avatarRoot.position.z < minZ) avatarRoot.position.z = minZ;
      if (avatarRoot.position.z > maxZ) avatarRoot.position.z = maxZ;
      if (avatarRoot.position.x < minX) avatarRoot.position.x = minX;
      if (avatarRoot.position.x > maxX) avatarRoot.position.x = maxX;
    }

    // カメラ：アバターの少し後ろ＆上から覗き込む感じ
    const camOffset = new THREE.Vector3(0, 2.7, 5.2);
    camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), viewAngle);

    const camPos = avatarRoot.position.clone().add(camOffset);
    camera.position.copy(camPos);
    camera.lookAt(
      avatarRoot.position.x,
      avatarRoot.position.y + 1.3,
      avatarRoot.position.z
    );

    renderer.render(scene, camera);
  }
  animate();

  // ---------- リサイズ ----------
  window.addEventListener('resize', function () {
    resizeRenderer();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  function resizeRenderer() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
  }
})();
