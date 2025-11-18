// app.js : 3D ミュージアム & アバター切り替え & ジョイスティック
(function () {
  const canvas = document.getElementById('scene');

  // ---------- 基本セットアップ ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  resizeRenderer();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050508);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);

  // 光
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(4, 12, 6);
  scene.add(dirLight);

  // ---------- 廊下 & 額装 ----------
  const textureLoader = new THREE.TextureLoader();
  const clickableMeshes = [];

  // データが無ければダミー
  const WORKS = (window.WORKS && window.WORKS.length) ? window.WORKS : [];

  const spacing = 6;
  const corridorLen = WORKS.length * spacing + 40;
  const corridorCenterZ = 5 - corridorLen / 2;

  // 床
  {
    const geo = new THREE.PlaneGeometry(18, corridorLen);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x101014,
      roughness: 0.9,
      metalness: 0.0
    });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, corridorCenterZ);
    scene.add(floor);
  }

  // 天井
  {
    const geo = new THREE.PlaneGeometry(18, corridorLen);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.6,
      metalness: 0.1
    });
    const ceil = new THREE.Mesh(geo, mat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 8, corridorCenterZ);
    scene.add(ceil);
  }

  // 壁
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    roughness: 0.9,
    metalness: 0
  });

  function makeWall(xSign) {
    const geo = new THREE.PlaneGeometry(corridorLen, 7.2);
    const wall = new THREE.Mesh(geo, wallMat);
    wall.rotation.y = xSign > 0 ? -Math.PI / 2 : Math.PI / 2;
    wall.position.set(8.8 * xSign, 3.6, corridorCenterZ);
    scene.add(wall);
  }
  makeWall(1);
  makeWall(-1);

  // 天井ラインライト
  {
    const lightGeo = new THREE.BoxGeometry(3, 0.02, 0.4);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.4,
      roughness: 0.1,
      metalness: 0.2
    });
    const count = Math.floor(corridorLen / 10);
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(lightGeo, lightMat);
      const z = 5 - 8 - i * 10;
      m.position.set(0, 7.5, z);
      scene.add(m);
    }
  }

  // 額縁のスタイルバリエーション
  const frameStyles = [
    { frameColor: 0x2b2b2f, edgeColor: 0xf5f5f5, thickness: 0.35 },
    { frameColor: 0x8b6b2f, edgeColor: 0xd7c9a1, thickness: 0.45 },
    { frameColor: 0x33363f, edgeColor: 0xaaaaaa, thickness: 0.4 },
    { frameColor: 0x444444, edgeColor: 0xd2af6d, thickness: 0.5 },
    { frameColor: 0x111111, edgeColor: 0xffffff, thickness: 0.32 }
  ];

  function createFramedArtwork(work, index) {
    const group = new THREE.Group();

    const style = frameStyles[index % frameStyles.length];
    const pictureW = 3;
    const pictureH = 3.8;
    const frameDepth = 0.2;

    // メインフレーム
    const outerGeo = new THREE.BoxGeometry(pictureW + 0.6, pictureH + 0.6, frameDepth);
    const outerMat = new THREE.MeshStandardMaterial({
      color: style.frameColor,
      roughness: 0.5,
      metalness: 0.4
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    group.add(outer);

    // インナーフレーム
    const innerGeo = new THREE.BoxGeometry(pictureW + 0.15, pictureH + 0.15, frameDepth * 0.6);
    const innerMat = new THREE.MeshStandardMaterial({
      color: style.edgeColor,
      roughness: 0.3,
      metalness: 0.6
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.z = 0.03;
    group.add(inner);

    // 絵
    const tex = textureLoader.load(work.file);
    tex.colorSpace = THREE.SRGBColorSpace;
    const artGeo = new THREE.PlaneGeometry(pictureW, pictureH);
    const artMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.9,
      metalness: 0,
      side: THREE.FrontSide
    });
    const art = new THREE.Mesh(artGeo, artMat);
    art.position.z = 0.11;
    group.add(art);

    // スポットライト
    const spot = new THREE.SpotLight(0xffffff, 1.2, 12, Math.PI / 10, 0.6, 1.5);
    spot.position.set(0, 5.8, 1.8);
    spot.target = outer;
    group.add(spot);
    group.add(spot.target);

    // クリック用
    art.userData.work = work;
    clickableMeshes.push(art);

    return group;
  }

  {
    const startZ = 5 - 18;
    for (let i = 0; i < WORKS.length; i++) {
      const work = WORKS[i];
      const sideLeft = (i % 2 === 0);
      const group = createFramedArtwork(work, i);
      const z = startZ - i * spacing;
      const x = sideLeft ? -8.2 : 8.2;
      group.position.set(x, 3.3, z);
      group.rotation.y = sideLeft ? Math.PI / 2 : -Math.PI / 2;
      scene.add(group);
    }
  }

  // ---------- アバター ----------
  let avatar;              // THREE.Group
  let avatarType = 'human'; // 'human' or 'dog'
  let cameraYaw = 0;       // 水平回転
  let cameraPitch = -0.12; // 見下ろし

  const HUMAN_VARIANTS = [
    { coat: 0xffb347, leg: 0x111111, skin: 0xf1d1b5, hair: 0x3b2d2a },
    { coat: 0x2e86de, leg: 0x111111, skin: 0xf1d1b5, hair: 0x111111 },
    { coat: 0x27ae60, leg: 0x111111, skin: 0xf5cba7, hair: 0x5d4037 },
    { coat: 0xbdc3c7, leg: 0x111111, skin: 0xfad7a0, hair: 0x2c3e50 },
    { coat: 0xe74c3c, leg: 0x111111, skin: 0xf8c471, hair: 0x1c2833 },
    { coat: 0x8e44ad, leg: 0x111111, skin: 0xf5cba7, hair: 0x2e1a47 },
    { coat: 0x16a085, leg: 0x0b0c10, skin: 0xfad7a0, hair: 0x273746 },
    { coat: 0xf1c40f, leg: 0x111111, skin: 0xf8c471, hair: 0x6e2c00 },
    { coat: 0x34495e, leg: 0x000000, skin: 0xf1d1b5, hair: 0x212f3d },
    { coat: 0xd35400, leg: 0x000000, skin: 0xf5cba7, hair: 0x4a2511 }
  ];

  const DOG_VARIANTS = [
    { body: 0xf5cba7, ear: 0xd68910 },
    { body: 0xe5e7e9, ear: 0x7f8c8d },
    { body: 0xd35400, ear: 0x784212 },
    { body: 0x95a5a6, ear: 0x7f8c8d },
    { body: 0xf7dc6f, ear: 0xd4ac0d },
    { body: 0xa569bd, ear: 0x6c3483 },
    { body: 0x1abc9c, ear: 0x148f77 },
    { body: 0xe74c3c, ear: 0xc0392b },
    { body: 0x2e86de, ear: 0x1b4f72 },
    { body: 0x2c3e50, ear: 0x273746 }
  ];

  function createHumanMesh(variant) {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: variant.coat, roughness: 0.6, metalness: 0.1 });
    const legMat = new THREE.MeshStandardMaterial({ color: variant.leg, roughness: 0.8, metalness: 0.1 });
    const skinMat = new THREE.MeshStandardMaterial({ color: variant.skin, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: variant.hair, roughness: 0.5, metalness: 0.2 });

    // 体
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 3.0, 20), bodyMat);
    body.position.y = 2.1;
    group.add(body);

    // 頭
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 16), skinMat);
    head.position.y = 3.7;
    group.add(head);

    // 髪
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.82, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.6), hairMat);
    hair.position.y = 3.9;
    group.add(hair);

    // 足
    const legGeo = new THREE.BoxGeometry(0.45, 1.6, 0.45);
    const legL = new THREE.Mesh(legGeo, legMat);
    const legR = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.35, 0.8, 0);
    legR.position.set(0.35, 0.8, 0);
    group.add(legL, legR);

    // 腕
    const armGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.9, 18);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.95, 2.25, 0);
    armR.position.set(0.95, 2.25, 0);
    armL.rotation.z = Math.PI / 2.3;
    armR.rotation.z = -Math.PI / 2.3;
    group.add(armL, armR);

    group.traverse(o => { o.castShadow = o.receiveShadow = false; });

    return group;
  }

  function createDogMesh(variant) {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: variant.body, roughness: 0.7, metalness: 0.1 });
    const earMat = new THREE.MeshStandardMaterial({ color: variant.ear, roughness: 0.7, metalness: 0.1 });

    // 体
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.0, 16), bodyMat);
    body.rotation.z = Math.PI / 2;
    body.position.set(0, 0.9, 0);
    group.add(body);

    // 頭
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.0, 20, 16), bodyMat);
    head.position.set(0, 1.8, 0.7);
    group.add(head);

    // 耳
    const earGeo = new THREE.ConeGeometry(0.4, 0.9, 12);
    const earL = new THREE.Mesh(earGeo, earMat);
    const earR = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.7, 2.3, 0.4);
    earR.position.set(0.7, 2.3, 0.4);
    earL.rotation.z = Math.PI / 10;
    earR.rotation.z = -Math.PI / 10;
    group.add(earL, earR);

    // 脚
    const legGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.9, 10);
    const legs = [];
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(legGeo, bodyMat);
      const signX = (i < 2) ? -1 : 1;
      const signZ = (i % 2 === 0) ? -1 : 1;
      leg.position.set(0.55 * signX, 0.45, 0.55 * signZ);
      group.add(leg);
      legs.push(leg);
    }

    group.traverse(o => { o.castShadow = o.receiveShadow = false; });

    return group;
  }

  function setAvatar(type) {
    const currentPos = avatar ? avatar.position.clone() : new THREE.Vector3(0, 0, 5);
    const currentRot = avatar ? avatar.rotation.y : Math.PI;

    if (avatar) {
      scene.remove(avatar);
    }

    avatarType = type;
    const variants = (type === 'human') ? HUMAN_VARIANTS : DOG_VARIANTS;
    const v = variants[Math.floor(Math.random() * variants.length)];

    avatar = (type === 'human') ? createHumanMesh(v) : createDogMesh(v);
    avatar.position.copy(currentPos);
    avatar.rotation.y = currentRot;
    scene.add(avatar);

    // ボタン状態
    document.getElementById('btn-human').classList.toggle('active', type === 'human');
    document.getElementById('btn-dog').classList.toggle('active', type === 'dog');
  }

  setAvatar('human'); // 最初は人間
  avatar.position.set(0, 0, 5); // 入口付近
  cameraYaw = 0;
  cameraPitch = -0.12;

  // ---------- カメラ & ドラッグで見回す ----------
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  window.addEventListener('pointerdown', (e) => {
    // ジョイスティック上のドラッグは除外
    if (e.target.closest('#joy-bg')) return;
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    cameraYaw -= dx * 0.005;
    cameraPitch -= dy * 0.003;
    cameraPitch = Math.max(-0.35, Math.min(-0.05, cameraPitch)); // 見下ろしすぎ / 見上げすぎ防止
  });

  window.addEventListener('pointerup', () => {
    isDragging = false;
  });

  // ---------- ジョイスティックで移動 ----------
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');
  let joyActive = false;
  let joyCenter = { x: 0, y: 0 };
  let joyVec = { x: 0, y: 0 }; // -1〜1

  function resetStick() {
    joyVec.x = 0;
    joyVec.y = 0;
    joyStick.style.transform = 'translate(-50%, -50%)';
  }
  resetStick();

  function handleJoyStart(e) {
    e.preventDefault();
    joyActive = true;
    const rect = joyBg.getBoundingClientRect();
    joyCenter.x = rect.left + rect.width / 2;
    joyCenter.y = rect.top + rect.height / 2;
  }

  function handleJoyMove(e) {
    if (!joyActive) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - joyCenter.x;
    const dy = touch.clientY - joyCenter.y;
    const maxR = 45;

    let x = dx;
    let y = dy;
    const dist = Math.hypot(x, y);
    const clamped = Math.min(dist, maxR);
    if (dist > 0) {
      x = (x / dist) * clamped;
      y = (y / dist) * clamped;
    }

    joyStick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

    joyVec.x = x / maxR;  // 右 = +, 左 = -
    joyVec.y = y / maxR;  // 下 = +, 上 = -
  }

  function handleJoyEnd() {
    joyActive = false;
    resetStick();
  }

  joyBg.addEventListener('pointerdown', handleJoyStart);
  window.addEventListener('pointermove', handleJoyMove);
  window.addEventListener('pointerup', handleJoyEnd);
  joyBg.addEventListener('touchstart', handleJoyStart, { passive: false });
  window.addEventListener('touchmove', handleJoyMove, { passive: false });
  window.addEventListener('touchend', handleJoyEnd);

  // ---------- 作品クリック ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function handleTap(e) {
    if (e.target.closest('#joy-bg')) return;

    const rect = canvas.getBoundingClientRect();
    const x = ( (e.clientX ?? e.changedTouches[0].clientX) - rect.left ) / rect.width;
    const y = ( (e.clientY ?? e.changedTouches[0].clientY) - rect.top ) / rect.height;
    pointer.set(x * 2 - 1, -(y * 2 - 1));

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickableMeshes, false);
    if (!hits.length) return;

    const work = hits[0].object.userData.work;
    if (!work) return;

    const panel = document.getElementById('info-panel');
    const img = document.getElementById('info-image');
    const title = document.getElementById('info-title');
    const text = document.getElementById('info-text');

    img.src = work.file;
    title.textContent = work.title || 'TAF DOG';
    text.textContent = work.desc || '';
    panel.classList.remove('hidden');
  }

  canvas.addEventListener('click', handleTap);

  document.getElementById('info-close').addEventListener('click', () => {
    document.getElementById('info-panel').classList.add('hidden');
  });

  // ---------- アバターボタン ----------
  document.getElementById('btn-human').addEventListener('click', () => setAvatar('human'));
  document.getElementById('btn-dog').addEventListener('click', () => setAvatar('dog'));

  // ---------- アニメーション ----------
  function update(delta) {
    if (!avatar) return;

    // カメラ方向ベクトル (XZ平面)
    const forward = new THREE.Vector2(Math.sin(cameraYaw), Math.cos(cameraYaw));
    const right = new THREE.Vector2(forward.y, -forward.x);

    // ジョイスティック入力（上：前、下：後）
    const moveForward = -joyVec.y;  // 上がマイナスなので符号反転
    const moveRight = joyVec.x;

    const len = Math.hypot(moveForward, moveRight);
    if (len > 0.02) {
      const speed = 6 * delta;
      const dir = forward.clone().multiplyScalar(moveForward).add(right.clone().multiplyScalar(moveRight)).normalize();

      avatar.position.x += dir.x * speed;
      avatar.position.z += dir.y * speed;

      // 進行方向を向く
      avatar.rotation.y = Math.atan2(dir.x, dir.y);
    }

    // 廊下内にクランプ
    const minX = -5.5;
    const maxX = 5.5;
    const minZ = 5 - corridorLen + 4;
    const maxZ = 8;
    avatar.position.x = Math.max(minX, Math.min(maxX, avatar.position.x));
    avatar.position.z = Math.max(minZ, Math.min(maxZ, avatar.position.z));

    // カメラ位置更新（肩越し視点）
    const dist = 14;
    const camHeight = 6;
    const camX = avatar.position.x + Math.sin(cameraYaw) * dist;
    const camZ = avatar.position.z + Math.cos(cameraYaw) * dist;
    const camY = avatar.position.y + camHeight + cameraPitch * 8;

    camera.position.set(camX, camY, camZ);
    camera.lookAt(avatar.position.x, avatar.position.y + 3.0, avatar.position.z);
  }

  let lastTime = performance.now();
  function animate() {
    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    update(delta);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  // ---------- リサイズ ----------
  window.addEventListener('resize', () => {
    resizeRenderer();
  });

  function resizeRenderer() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
})();
