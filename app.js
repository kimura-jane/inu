// app.js : TAF DOG MUSEUM – 三人称ビュー & アバターチェンジ

(function () {
  const canvas = document.getElementById('scene');

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  resizeRenderer();

  // ---------- scene & camera ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050508);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  // アバターの位置まわり
  const avatarBaseY = 0;
  const avatar = new THREE.Group();
  avatar.position.set(0, avatarBaseY, 5);   // 入口付近・前を向いてスタート（奥がマイナスZ）
  scene.add(avatar);

  let cameraYaw = 0;                        // Y軸まわり回転
  const cameraOffset = new THREE.Vector3(0, 4, 10); // アバターから見たカメラの相対位置

  // ---------- lights ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(5, 15, 10);
  scene.add(dirLight);

  // ---------- corridor (gallery) ----------
  const corridorLength = 90;   // Z方向の長さ
  const halfLen = corridorLength / 2;
  const wallHeight = 6;
  const wallDistance = 8;

  // 床
  const floorGeo = new THREE.PlaneGeometry(corridorLength, wallDistance * 2);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.9,
    metalness: 0.0
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, 0, -halfLen);
  scene.add(floorMesh);

  // 天井
  const ceilGeo = new THREE.PlaneGeometry(corridorLength, wallDistance * 2);
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x050505,
    roughness: 0.7,
    metalness: 0.0
  });
  const ceilMesh = new THREE.Mesh(ceilGeo, ceilMat);
  ceilMesh.rotation.x = Math.PI / 2;
  ceilMesh.position.set(0, wallHeight, -halfLen);
  scene.add(ceilMesh);

  // 壁
  const wallGeo = new THREE.PlaneGeometry(corridorLength, wallHeight);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.95,
    metalness: 0.0
  });

  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.position.set(-wallDistance, wallHeight / 2, -halfLen);
  leftWall.rotation.y = Math.PI / 2;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.position.set(wallDistance, wallHeight / 2, -halfLen);
  rightWall.rotation.y = -Math.PI / 2;
  scene.add(rightWall);

  // 天井照明
  const stripCount = 10;
  const stripGeo = new THREE.PlaneGeometry(3, 0.6);
  const stripMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < stripCount; i++) {
    const z = -3 - (corridorLength - 10) * (i / (stripCount - 1));
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.set(0, wallHeight - 0.1, z);
    strip.rotation.x = Math.PI / 2;
    scene.add(strip);
  }

  // ---------- frames & artworks ----------
  const clickableMeshes = [];
  const textureLoader = new THREE.TextureLoader();

  const frameDepth = 0.3;
  const framePadding = 0.4;
  const artWidth = 3.0;
  const artHeight = 4.0;

  const spacing = 5;
  const startZ = -8;

  const frameStyles = [
    { frameColor: 0x111111, edgeColor: 0xffffff, thickness: 0.25 },
    { frameColor: 0x5c3b10, edgeColor: 0xf7d18b, thickness: 0.35 },
    { frameColor: 0x333333, edgeColor: 0xcccccc, thickness: 0.2 },
    { frameColor: 0x8b6b3f, edgeColor: 0xf2e0b5, thickness: 0.3 },
    { frameColor: 0x222222, edgeColor: 0xfff4d2, thickness: 0.27 }
  ];

  function createFramedArtwork(art, index) {
    const side = index % 2 === 0 ? 'left' : 'right';
    const row = Math.floor(index / 2);
    const z = startZ - row * spacing;
    const x = side === 'left' ? -wallDistance + 0.1 : wallDistance - 0.1;

    const style = frameStyles[index % frameStyles.length];

    // 額の外枠
    const outerW = artWidth + framePadding * 2;
    const outerH = artHeight + framePadding * 2;
    const frameGeo = new THREE.BoxGeometry(outerW, outerH, frameDepth);
    const frameMat = new THREE.MeshStandardMaterial({
      color: style.frameColor,
      roughness: 0.5,
      metalness: 0.4
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.set(x, wallHeight * 0.55, z);
    frameMesh.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
    scene.add(frameMesh);

    // 内側の淵
    const innerGeo = new THREE.BoxGeometry(
      artWidth + framePadding,
      artHeight + framePadding,
      frameDepth * 0.1
    );
    const innerMat = new THREE.MeshStandardMaterial({
      color: style.edgeColor,
      roughness: 0.2,
      metalness: 0.7
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.position.set(0, 0, frameDepth * 0.51);
    frameMesh.add(innerMesh);

    // 絵のキャンバス
    const artGeo = new THREE.PlaneGeometry(artWidth, artHeight);
    const artTexture = textureLoader.load(art.file);
    artTexture.encoding = THREE.sRGBEncoding;
    const artMat = new THREE.MeshBasicMaterial({
      map: artTexture,
      toneMapped: false
    });
    const artMesh = new THREE.Mesh(artGeo, artMat);
    artMesh.position.set(0, 0, frameDepth * 0.52);
    frameMesh.add(artMesh);

    artMesh.userData.art = art;
    clickableMeshes.push(artMesh);

    // スポットライト
    const spot = new THREE.SpotLight(0xffffff, 1.5, 12, Math.PI / 4, 0.5, 1.0);
    const offsetZ = side === 'left' ? 0.5 : -0.5;
    spot.position.set(
      x + (side === 'left' ? 1.2 : -1.2),
      wallHeight - 0.5,
      z + offsetZ
    );
    spot.target = frameMesh;
    scene.add(spot);

    const spotHelper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.12, 0.4, 12),
      new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 })
    );
    spotHelper.position.copy(spot.position);
    scene.add(spotHelper);
  }

  if (Array.isArray(window.ARTWORKS)) {
    window.ARTWORKS.forEach((art, i) => createFramedArtwork(art, i));
  }

  // ---------- avatar factory ----------

  function clearAvatarMesh() {
    while (avatar.children.length > 0) {
      avatar.remove(avatar.children[0]);
    }
  }

  function createHumanMesh(config) {
    const group = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(config.radius, config.radius, config.bodyHeight, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: config.coatColor, roughness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = config.bodyHeight / 2;
    group.add(body);

    const legGeo = new THREE.BoxGeometry(config.radius * 0.7, config.legHeight, config.radius * 0.7);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const legOffsetX = config.radius * 0.45;

    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-legOffsetX, config.legHeight / 2, 0.3);
    group.add(legL);

    const legR = legL.clone();
    legR.position.x = legOffsetX;
    group.add(legR);

    const headGeo = new THREE.SphereGeometry(config.headRadius, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf5d3b0 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = config.bodyHeight + config.headRadius * 0.9;
    group.add(head);

    const hairGeo = new THREE.SphereGeometry(config.headRadius * 0.95, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.3);
    const hairMat = new THREE.MeshStandardMaterial({ color: config.hairColor });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.copy(head.position);
    group.add(hair);

    const armGeo = new THREE.CylinderGeometry(config.radius * 0.25, config.radius * 0.25, config.armLength, 12);
    const armMat = new THREE.MeshStandardMaterial({ color: config.coatColor });

    const armL = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-(config.radius + config.radius * 0.35), body.position.y + 0.2, 0);
    armL.rotation.z = Math.PI / 2.2;
    group.add(armL);

    const armR = armL.clone();
    armR.position.x *= -1;
    armR.rotation.z *= -1;
    group.add(armR);

    return group;
  }

  function createDogMesh(config) {
    const group = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(config.bodyLength, config.bodyHeight, config.bodyWidth);
    const bodyMat = new THREE.MeshStandardMaterial({ color: config.bodyColor, roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = config.bodyHeight / 2 + 0.2;
    group.add(body);

    const headGeo = new THREE.BoxGeometry(config.headSize, config.headSize * 0.9, config.headSize);
    const headMat = new THREE.MeshStandardMaterial({ color: config.headColor });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, body.position.y + config.headSize * 0.55, bodyGeo.parameters.z / 2 + config.headSize * 0.25);
    group.add(head);

    const earGeo = new THREE.BoxGeometry(config.headSize * 0.35, config.headSize * 0.5, config.headSize * 0.15);
    const earMat = new THREE.MeshStandardMaterial({ color: config.earColor });
    const earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-config.headSize * 0.35, head.position.y + config.headSize * 0.25, head.position.z - config.headSize * 0.15);
    group.add(earL);
    const earR = earL.clone();
    earR.position.x *= -1;
    group.add(earR);

    const legGeo = new THREE.CylinderGeometry(config.legRadius, config.legRadius, config.legHeight, 10);
    const legMat = new THREE.MeshStandardMaterial({ color: config.legColor });

    const legOffsetX = bodyGeo.parameters.x / 2 - config.legRadius * 1.2;
    const legOffsetZ = bodyGeo.parameters.z / 2 - config.legRadius * 1.2;

    const positions = [
      [-legOffsetX, legOffsetZ],
      [legOffsetX, legOffsetZ],
      [-legOffsetX, -legOffsetZ],
      [legOffsetX, -legOffsetZ]
    ];
    positions.forEach(([px, pz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(px, config.legHeight / 2, pz);
      group.add(leg);
    });

    const tailGeo = new THREE.CylinderGeometry(config.tailRadius, config.tailRadius * 0.6, config.tailLength, 8);
    const tailMat = new THREE.MeshStandardMaterial({ color: config.bodyColor });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, body.position.y + config.tailLength * 0.1, -bodyGeo.parameters.z / 2 - config.tailLength * 0.2);
    tail.rotation.x = -Math.PI / 4;
    group.add(tail);

    return group;
  }

  const HUMAN_CONFIGS = [
    { radius: 0.7, bodyHeight: 2.1, legHeight: 0.8, headRadius: 0.7, armLength: 1.4, coatColor: 0x1e88e5, hairColor: 0x3e2723 },
    { radius: 0.65, bodyHeight: 2.3, legHeight: 0.9, headRadius: 0.7, armLength: 1.5, coatColor: 0xffb300, hairColor: 0x4e342e },
    { radius: 0.7, bodyHeight: 2.0, legHeight: 0.7, headRadius: 0.75, armLength: 1.3, coatColor: 0x8e24aa, hairColor: 0x212121 },
    { radius: 0.75, bodyHeight: 2.4, legHeight: 0.9, headRadius: 0.8, armLength: 1.6, coatColor: 0x43a047, hairColor: 0x5d4037 },
    { radius: 0.7, bodyHeight: 2.2, legHeight: 0.8, headRadius: 0.7, armLength: 1.5, coatColor: 0xef5350, hairColor: 0x263238 },
    { radius: 0.65, bodyHeight: 2.0, legHeight: 0.7, headRadius: 0.65, armLength: 1.3, coatColor: 0x039be5, hairColor: 0x424242 },
    { radius: 0.72, bodyHeight: 2.3, legHeight: 0.9, headRadius: 0.75, armLength: 1.5, coatColor: 0xff7043, hairColor: 0x6d4c41 },
    { radius: 0.7, bodyHeight: 2.1, legHeight: 0.8, headRadius: 0.7, armLength: 1.4, coatColor: 0x26a69a, hairColor: 0x37474f },
    { radius: 0.68, bodyHeight: 2.2, legHeight: 0.85, headRadius: 0.72, armLength: 1.5, coatColor: 0x7e57c2, hairColor: 0x212121 },
    { radius: 0.7, bodyHeight: 2.4, legHeight: 0.9, headRadius: 0.8, armLength: 1.6, coatColor: 0xf9a825, hairColor: 0x3e2723 }
  ];

  const DOG_CONFIGS = [
    { bodyLength: 2.8, bodyHeight: 1.3, bodyWidth: 1.2, bodyColor: 0x4e342e, headSize: 1.2, headColor: 0x5d4037, earColor: 0x3e2723, legRadius: 0.18, legHeight: 0.8, legColor: 0x2d2926, tailRadius: 0.12, tailLength: 0.9 },
    { bodyLength: 2.4, bodyHeight: 1.2, bodyWidth: 1.1, bodyColor: 0xffcc80, headSize: 1.15, headColor: 0xffe0b2, earColor: 0xffb74d, legRadius: 0.17, legHeight: 0.75, legColor: 0x6d4c41, tailRadius: 0.11, tailLength: 0.8 },
    { bodyLength: 2.6, bodyHeight: 1.4, bodyWidth: 1.3, bodyColor: 0x90a4ae, headSize: 1.25, headColor: 0xcfd8dc, earColor: 0x78909c, legRadius: 0.19, legHeight: 0.85, legColor: 0x37474f, tailRadius: 0.13, tailLength: 1.0 },
    { bodyLength: 2.2, bodyHeight: 1.1, bodyWidth: 1.0, bodyColor: 0x6d4c41, headSize: 1.1, headColor: 0x8d6e63, earColor: 0x4e342e, legRadius: 0.16, legHeight: 0.7, legColor: 0x3e2723, tailRadius: 0.11, tailLength: 0.75 },
    { bodyLength: 2.5, bodyHeight: 1.3, bodyWidth: 1.1, bodyColor: 0xb0bec5, headSize: 1.2, headColor: 0xeceff1, earColor: 0x90a4ae, legRadius: 0.18, legHeight: 0.8, legColor: 0x455a64, tailRadius: 0.12, tailLength: 0.9 },
    { bodyLength: 2.7, bodyHeight: 1.4, bodyWidth: 1.2, bodyColor: 0x795548, headSize: 1.25, headColor: 0xa1887f, earColor: 0x5d4037, legRadius: 0.19, legHeight: 0.85, legColor: 0x3e2723, tailRadius: 0.13, tailLength: 0.95 },
    { bodyLength: 2.3, bodyHeight: 1.2, bodyWidth: 1.0, bodyColor: 0xffccbc, headSize: 1.15, headColor: 0xffe0b2, earColor: 0xffab91, legRadius: 0.17, legHeight: 0.75, legColor: 0x6d4c41, tailRadius: 0.11, tailLength: 0.8 },
    { bodyLength: 2.6, bodyHeight: 1.3, bodyWidth: 1.1, bodyColor: 0x424242, headSize: 1.2, headColor: 0x757575, earColor: 0x212121, legRadius: 0.18, legHeight: 0.8, legColor: 0x111111, tailRadius: 0.12, tailLength: 0.9 },
    { bodyLength: 2.4, bodyHeight: 1.2, bodyWidth: 1.1, bodyColor: 0xd7ccc8, headSize: 1.15, headColor: 0xefebe9, earColor: 0xbca89f, legRadius: 0.17, legHeight: 0.75, legColor: 0x6d4c41, tailRadius: 0.11, tailLength: 0.8 },
    { bodyLength: 2.8, bodyHeight: 1.5, bodyWidth: 1.3, bodyColor: 0x263238, headSize: 1.3, headColor: 0x37474f, earColor: 0x000000, legRadius: 0.2, legHeight: 0.9, legColor: 0x000000, tailRadius: 0.14, tailLength: 1.0 }
  ];

  let currentMode = 'human';

  function randomFrom(array) {
    return array[(Math.random() * array.length) | 0];
  }

  function refreshAvatar() {
    const pos = avatar.position.clone();
    clearAvatarMesh();

    if (currentMode === 'human') {
      const conf = randomFrom(HUMAN_CONFIGS);
      avatar.add(createHumanMesh(conf));
    } else {
      const conf = randomFrom(DOG_CONFIGS);
      avatar.add(createDogMesh(conf));
    }
    avatar.position.copy(pos);
  }

  refreshAvatar();

  // ---------- avatar UI ----------
  const modeButtons = document.querySelectorAll('.avatar-mode-btn');

  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode === currentMode) {
        // 同じモードならランダム着せ替えだけ
        refreshAvatar();
        return;
      }
      currentMode = mode;
      modeButtons.forEach(b => b.classList.toggle('active', b === btn));
      refreshAvatar();
    });
  });

  // ---------- joystick ----------
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');
  let joyCenterX = 0;
  let joyCenterY = 0;
  let joyDragging = false;
  let joyNormX = 0;
  let joyNormY = 0;

  function updateJoyCenter() {
    const rect = joyBg.getBoundingClientRect();
    joyCenterX = rect.left + rect.width / 2;
    joyCenterY = rect.top + rect.height / 2;
  }
  updateJoyCenter();
  window.addEventListener('resize', updateJoyCenter);

  function handleJoyStart(e) {
    joyDragging = true;
    handleJoyMove(e);
  }

  function handleJoyMove(e) {
    if (!joyDragging) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - joyCenterX;
    const dy = touch.clientY - joyCenterY;
    const max = joyBg.clientWidth / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(max, dist);
    const angle = Math.atan2(dy, dx);
    const px = Math.cos(angle) * clamped;
    const py = Math.sin(angle) * clamped;

    joyStick.style.transform = `translate(${px}px, ${py}px)`;

    joyNormX = clamped === 0 ? 0 : px / max; // -1〜1（左右）
    joyNormY = clamped === 0 ? 0 : py / max; // -1〜1（上下）
    // ここ重要：前に倒す＝前進なので Y をマイナスに反転
    joyNormY = -joyNormY;

    e.preventDefault();
  }

  function handleJoyEnd() {
    joyDragging = false;
    joyNormX = 0;
    joyNormY = 0;
    joyStick.style.transform = 'translate(0, 0)';
  }

  joyBg.addEventListener('pointerdown', handleJoyStart);
  window.addEventListener('pointermove', handleJoyMove);
  window.addEventListener('pointerup', handleJoyEnd);
  window.addEventListener('pointercancel', handleJoyEnd);

  // ---------- camera drag (視点回転) ----------
  let dragCam = false;
  let lastX = 0;

  canvas.addEventListener('pointerdown', e => {
    dragCam = true;
    lastX = e.clientX;
  });

  window.addEventListener('pointermove', e => {
    if (!dragCam) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    cameraYaw -= dx * 0.003; // 左ドラッグ＝左向き
  });

  window.addEventListener('pointerup', () => (dragCam = false));
  window.addEventListener('pointercancel', () => (dragCam = false));

  // ---------- tap to open artwork info ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const infoPanel = document.getElementById('info-panel');
  const infoTitle = document.getElementById('info-title');
  const infoDesc = document.getElementById('info-desc');
  const infoClose = document.getElementById('info-close');

  function showInfo(art) {
    if (!art) return;
    infoTitle.textContent = art.title || `TAF DOG #${art.id || ''}`;
    infoDesc.textContent = art.desc || '';
    infoPanel.classList.remove('hidden');
  }

  infoClose.addEventListener('click', () => {
    infoPanel.classList.add('hidden');
  });

  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickableMeshes, false);
    if (hits.length > 0) {
      const art = hits[0].object.userData.art;
      showInfo(art);
    }
  });

  // ---------- animation loop ----------
  function updateCamera() {
    const offset = cameraOffset.clone();
    const rot = new THREE.Matrix4().makeRotationY(cameraYaw);
    offset.applyMatrix4(rot);
    camera.position.copy(avatar.position.clone().add(offset));
    camera.lookAt(avatar.position.x, avatar.position.y + 1.5, avatar.position.z);
  }

  function clampAvatarPosition() {
    const minZ = -corridorLength + 5;
    const maxZ = 10;
    const minX = -wallDistance + 1.5;
    const maxX = wallDistance - 1.5;

    avatar.position.z = Math.max(minZ, Math.min(maxZ, avatar.position.z));
    avatar.position.x = Math.max(minX, Math.min(maxX, avatar.position.x));
  }

  function animate() {
    requestAnimationFrame(animate);

    // ジョイスティック → 移動
    const moveSpeed = 0.12;
    const forward = joyNormY; // 上で反転済み：前に倒すと +1
    const strafe = joyNormX;

    if (forward !== 0 || strafe !== 0) {
      const moveVec = new THREE.Vector3(strafe, 0, -forward); // カメラローカル
      const rot = new THREE.Matrix4().makeRotationY(cameraYaw);
      moveVec.applyMatrix4(rot);
      moveVec.multiplyScalar(moveSpeed);
      avatar.position.add(moveVec);
      clampAvatarPosition();
    }

    updateCamera();
    renderer.render(scene, camera);
  }

  animate();

  // ---------- resize ----------
  window.addEventListener('resize', function () {
    resizeRenderer();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    updateJoyCenter();
  });

  function resizeRenderer() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
  }
})();
