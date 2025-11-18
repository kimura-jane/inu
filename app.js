// app.js : TAF DOG MUSEUM 3D 廊下 + アバター + ジョイスティック

(function () {
  const canvas = document.getElementById('scene');

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  function resizeRenderer() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ---------- scene & camera ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050509);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  // ---------- light ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.7);
  mainLight.position.set(5, 15, -10);
  scene.add(mainLight);

  // ---------- museum corridor ----------
  const corridorLength = 80;
  const corridorWidth = 14;
  const wallHeight = 8;

  // floor
  const floorGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.9,
    metalness: 0.0
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0);
  scene.add(floor);

  // ceiling
  const ceilGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x050505,
    roughness: 1.0,
    metalness: 0.0
  });
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, wallHeight, 0);
  scene.add(ceiling);

  // ceiling lights (長方形パネルだけ・見た目用)
  const lightPanelGeo = new THREE.PlaneGeometry(3, 0.5);
  const lightPanelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lightPanelCount = 10;
  for (let i = 0; i < lightPanelCount; i++) {
    const panel = new THREE.Mesh(lightPanelGeo, lightPanelMat);
    const z =
      -corridorLength / 2 + 6 + (i / (lightPanelCount - 1)) * (corridorLength - 12);
    panel.position.set(0, wallHeight - 0.05, z);
    panel.rotation.x = Math.PI / 2;
    scene.add(panel);
  }

  // walls
  const wallGeo = new THREE.PlaneGeometry(corridorLength, wallHeight);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x505050,
    roughness: 0.8,
    metalness: 0.0
  });

  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.rotation.y = Math.PI / 2; // 内向き
  leftWall.position.set(-corridorWidth / 2, wallHeight / 2, 0);
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(corridorWidth / 2, wallHeight / 2, 0);
  scene.add(rightWall);

  // ---------- frames & artworks ----------
  const texLoader = new THREE.TextureLoader();
  const clickableMeshes = [];

  const frameColors = [0x1a1a1a, 0x8b6a3f, 0xbbbbbb];

  function createFramedWork(texture, frameColor) {
    const group = new THREE.Group();

    const frameDepth = 0.25;
    const frameGeo = new THREE.BoxGeometry(2.4, 3.2, frameDepth);
    const frameMat = new THREE.MeshStandardMaterial({
      color: frameColor,
      roughness: 0.5,
      metalness: 0.3
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.z = -frameDepth / 2; // 壁にぴったり
    group.add(frame);

    const artGeo = new THREE.PlaneGeometry(2.0, 2.8);
    const artMat = new THREE.MeshBasicMaterial({ map: texture });
    const art = new THREE.Mesh(artGeo, artMat);
    art.position.z = frame.position.z + 0.01;
    group.add(art);

    // 壁用のスポットライト（見た目重視・明るさ控えめ）
    const spot = new THREE.SpotLight(0xffffff, 0.7, 10, Math.PI / 6, 0.5, 1);
    spot.position.set(0, 2.2, 1.3);
    spot.target = art;
    group.add(spot);
    group.add(spot.target);

    clickableMeshes.push(art);
    return group;
  }

  // WORKS (data.js) を使って左右の壁に均等配置
  (function layoutWorks() {
    if (!window.WORKS || !Array.isArray(WORKS)) return;

    const total = WORKS.length;
    const perSide = Math.ceil(total / 2);
    const marginZ = 6;
    const usableLen = corridorLength - marginZ * 2;
    const spacing = usableLen / Math.max(perSide - 1, 1);

    for (let i = 0; i < total; i++) {
      const work = WORKS[i];
      const tex = texLoader.load(work.image);
      tex.encoding = THREE.sRGBEncoding;

      const color = frameColors[i % frameColors.length];
      const group = createFramedWork(tex, color);

      const side = i % 2 === 0 ? -1 : 1; // 左右交互
      const indexOnSide = Math.floor(i / 2);
      const z = -corridorLength / 2 + marginZ + indexOnSide * spacing;
      const x = side * (corridorWidth / 2 - 0.2);
      const y = 3.0;

      group.position.set(x, y, z);
      group.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;

      scene.add(group);
    }
  })();

  // ---------- avatar presets ----------
  const HUMAN_PRESETS = [
    { coat: 0x29527a, legs: 0x111111, skin: 0xffd2b0, hair: 0x111111 },
    { coat: 0xd28b26, legs: 0x111111, skin: 0xffe0c0, hair: 0x331a00 },
    { coat: 0x3c8f5b, legs: 0x111111, skin: 0xffcfb5, hair: 0x222222 },
    { coat: 0x914f94, legs: 0x111111, skin: 0xffe4c7, hair: 0x201b2f },
    { coat: 0x555555, legs: 0x111111, skin: 0xffd9b5, hair: 0x000000 },
    { coat: 0xa13a3a, legs: 0x111111, skin: 0xffc9a0, hair: 0x4a2b16 },
    { coat: 0x006d6f, legs: 0x111111, skin: 0xffe2c9, hair: 0x2a2a2a },
    { coat: 0xe0a800, legs: 0x111111, skin: 0xffd0b0, hair: 0x1b1b1b },
    { coat: 0x336699, legs: 0x111111, skin: 0xffd8bb, hair: 0x101010 },
    { coat: 0x6b8e23, legs: 0x111111, skin: 0xffd0a8, hair: 0x1f130a }
  ];

  const DOG_PRESETS = [
    { body: 0x50402a, accent: 0xd8c3a5 },
    { body: 0x3c3c3c, accent: 0xf2e2c4 },
    { body: 0xa3683a, accent: 0xf5deba },
    { body: 0x2b4b5a, accent: 0xdadada },
    { body: 0x8f552e, accent: 0xf3e0c7 },
    { body: 0x444444, accent: 0xe9d6b0 },
    { body: 0x5b4636, accent: 0xf0dfc2 },
    { body: 0x925c3a, accent: 0xf6e2c0 },
    { body: 0x3a3a52, accent: 0xe4d3b0 },
    { body: 0x6e4a2c, accent: 0xf4dec0 }
  ];

  // ---------- avatar builders ----------
  function buildHumanAvatar(preset) {
    const g = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.7, 0.8, 2.3, 18);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: preset.coat,
      roughness: 0.85,
      metalness: 0.1
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.4;
    g.add(body);

    const headGeo = new THREE.SphereGeometry(0.6, 18, 18);
    const headMat = new THREE.MeshStandardMaterial({
      color: preset.skin,
      roughness: 0.8
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 2.6, -0.1);
    g.add(head);

    const hairGeo = new THREE.SphereGeometry(0.62, 18, 18, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairMat = new THREE.MeshStandardMaterial({
      color: preset.hair,
      roughness: 0.6,
      metalness: 0.1
    });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.copy(head.position);
    hair.position.y += 0.05;
    g.add(hair);

    const armGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.3, 12);
    const armMat = new THREE.MeshStandardMaterial({
      color: preset.coat,
      roughness: 0.85
    });
    const armL = new THREE.Mesh(armGeo, armMat);
    const armR = armL.clone();
    armL.position.set(-0.9, 1.6, -0.1);
    armR.position.set(0.9, 1.6, -0.1);
    g.add(armL, armR);

    const legGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.7, 12);
    const legMat = new THREE.MeshStandardMaterial({
      color: preset.legs,
      roughness: 0.7
    });
    const legL = new THREE.Mesh(legGeo, legMat);
    const legR = legL.clone();
    legL.position.set(-0.35, 0.55, -0.1);
    legR.position.set(0.35, 0.55, -0.1);
    g.add(legL, legR);

    return g;
  }

  function buildDogAvatar(preset) {
    const g = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(1.8, 1.4, 3.0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: preset.body,
      roughness: 0.8
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    g.add(body);

    const headGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const headMat = new THREE.MeshStandardMaterial({
      color: preset.accent,
      roughness: 0.8
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.6, -1.7);
    g.add(head);

    const earGeo = new THREE.BoxGeometry(0.35, 0.7, 0.2);
    const earMat = new THREE.MeshStandardMaterial({
      color: preset.body,
      roughness: 0.8
    });
    const earL = new THREE.Mesh(earGeo, earMat);
    const earR = earL.clone();
    earL.position.set(-0.5, 2.0, -1.6);
    earR.position.set(0.5, 2.0, -1.6);
    g.add(earL, earR);

    const legGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.9, 10);
    const legMat = new THREE.MeshStandardMaterial({
      color: preset.body,
      roughness: 0.8
    });
    const legFL = new THREE.Mesh(legGeo, legMat);
    const legFR = legFL.clone();
    const legBL = legFL.clone();
    const legBR = legFL.clone();
    legFL.position.set(-0.5, 0.45, -1.0);
    legFR.position.set(0.5, 0.45, -1.0);
    legBL.position.set(-0.5, 0.45, 0.9);
    legBR.position.set(0.5, 0.45, 0.9);
    g.add(legFL, legFR, legBL, legBR);

    const tailGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8);
    const tailMat = new THREE.MeshStandardMaterial({
      color: preset.body,
      roughness: 0.8
    });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, 1.4, 1.9);
    tail.rotation.x = -Math.PI / 4;
    g.add(tail);

    return g;
  }

  // ---------- avatar & camera follow ----------
  let avatar = null;
  let avatarYaw = 0; // 0: -Z 方向を向く
  let avatarMode = 'human';

  const cameraOffsetLocal = new THREE.Vector3(0, 3, 6); // アバター後方 + 上

  function setRandomAvatar(type) {
    avatarMode = type;

    const presets = type === 'human' ? HUMAN_PRESETS : DOG_PRESETS;
    const preset = presets[Math.floor(Math.random() * presets.length)];

    const oldPos = avatar ? avatar.position.clone() : null;

    if (avatar) scene.remove(avatar);

    avatar =
      type === 'human'
        ? buildHumanAvatar(preset)
        : buildDogAvatar(preset);

    if (oldPos) {
      avatar.position.copy(oldPos);
    } else {
      avatar.position.set(0, 0, -corridorLength / 2 + 10);
    }
    avatar.rotation.y = avatarYaw;

    scene.add(avatar);
  }

  function updateCamera() {
    if (!avatar) return;
    const offsetWorld = cameraOffsetLocal.clone().applyQuaternion(avatar.quaternion);
    camera.position.copy(avatar.position).add(offsetWorld);
    const lookTarget = avatar.position.clone();
    lookTarget.y += 1.5;
    camera.lookAt(lookTarget);
  }

  // 初期アバター
  setRandomAvatar('human');

  // ---------- joystick ----------
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');

  let joyActive = false;
  let joyCenter = { x: 0, y: 0 };
  let joyValue = { x: 0, y: 0 };

  function setJoyFromEvent(e) {
    const rect = joyBg.getBoundingClientRect();
    joyCenter.x = rect.left + rect.width / 2;
    joyCenter.y = rect.top + rect.height / 2;

    const x = e.clientX - joyCenter.x;
    const y = e.clientY - joyCenter.y;

    const max = rect.width / 2;
    const dx = Math.max(-max, Math.min(max, x));
    const dy = Math.max(-max, Math.min(max, y));

    joyStick.style.transform = `translate(${dx}px, ${dy}px)`;

    joyValue.x = dx / max; // -1〜1
    joyValue.y = dy / max;
  }

  function resetJoystick() {
    joyActive = false;
    joyValue.x = 0;
    joyValue.y = 0;
    joyStick.style.transform = 'translate(0, 0)';
  }

  joyBg.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    joyActive = true;
    setJoyFromEvent(e);
  });

  window.addEventListener('pointermove', (e) => {
    if (!joyActive) return;
    e.preventDefault();
    setJoyFromEvent(e);
  });

  window.addEventListener('pointerup', () => {
    if (!joyActive) return;
    resetJoystick();
  });

  // ---------- drag to rotate視点 ----------
  let rotateActive = false;
  let lastX = 0;

  canvas.addEventListener('pointerdown', (e) => {
    // ジョイスティック領域は除外（イベントが来ないはずだが念のため）
    const rect = joyBg.getBoundingClientRect();
    if (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    ) {
      return;
    }
    rotateActive = true;
    lastX = e.clientX;
  });

  window.addEventListener('pointermove', (e) => {
    if (!rotateActive) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    avatarYaw -= dx * 0.005; // 左右回転速度
  });

  window.addEventListener('pointerup', () => {
    rotateActive = false;
  });

  // ---------- avatar switcher UI ----------
  const avatarButtons = document.querySelectorAll('.avatar-btn');
  avatarButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.avatar;
      avatarButtons.forEach((b) =>
        b.classList.toggle('active', b === btn)
      );
      setRandomAvatar(type);
    });
  });

  // ---------- movement & animation loop ----------
  function clampInsideCorridor(pos) {
    const marginSide = 2.0;
    const marginEnd = 4.0;
    const minX = -corridorWidth / 2 + marginSide;
    const maxX = corridorWidth / 2 - marginSide;
    const minZ = -corridorLength / 2 + marginEnd;
    const maxZ = corridorLength / 2 - marginEnd;
    pos.x = Math.max(minX, Math.min(maxX, pos.x));
    pos.z = Math.max(minZ, Math.min(maxZ, pos.z));
  }

  function updateAvatar(dt) {
    if (!avatar) return;

    // joystick → 前後 / 左右
    const forward = -joyValue.y; // 上で前, 下で後ろ
    const strafe = joyValue.x;

    const moveSpeed = 5.0; // 単位/秒
    const dist = moveSpeed * dt;

    const sin = Math.sin(avatarYaw);
    const cos = Math.cos(avatarYaw);

    // forward: -Z 基準, right: +X 基準
    const forwardX = sin;
    const forwardZ = -cos;
    const rightX = cos;
    const rightZ = sin;

    const vx = (forward * forwardX + strafe * rightX) * dist;
    const vz = (forward * forwardZ + strafe * rightZ) * dist;

    avatar.position.x += vx;
    avatar.position.z += vz;

    avatar.rotation.y = avatarYaw;
    clampInsideCorridor(avatar.position);
  }

  let lastTime = performance.now();

  function animate() {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    updateAvatar(dt);
    updateCamera();

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resizeRenderer);
  resizeRenderer();
  animate();
})();
