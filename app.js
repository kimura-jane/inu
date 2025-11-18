// app.js  TAF DOG MUSEUM
(function () {
  'use strict';

  // ---------- 基本セット ----------
  const canvas = document.getElementById('scene');
  if (!canvas || !window.THREE) {
    console.error('canvas または THREE が見つかりません');
    return;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050509);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  // カメラはアバターの真後ろ・少し上
  const cameraBaseOffset = new THREE.Vector3(0, 2.0, -6);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x202020, 0.7);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 10, -5);
  scene.add(dirLight);

  // ---------- グローバル状態 ----------
  const textureLoader = new THREE.TextureLoader();
  const clickablePaints = [];

  const corridor = {
    length: 80,
    halfWidth: 4.0,
    wallHeight: 5,
  };

  const avatarGroup = new THREE.Group();
  scene.add(avatarGroup);

  let avatarType = 'human'; // 'human' | 'dog'
  let avatarYaw = 0;        // Y軸回転（ラジアン）

  // ---------- アバターのバリエーション ----------
  const humanPresets = [
    { coat: 0x264653, pants: 0x000000, skin: 0xf2c09a },
    { coat: 0xe76f51, pants: 0x2b2d42, skin: 0xffd1a3 },
    { coat: 0x2a9d8f, pants: 0x1d3557, skin: 0xf4c095 },
    { coat: 0xf4a261, pants: 0x000000, skin: 0xffc9a3 },
    { coat: 0x6d597a, pants: 0x22223b, skin: 0xf1c0a0 },
    { coat: 0x457b9d, pants: 0x1d3557, skin: 0xf5c19c },
    { coat: 0xd62828, pants: 0x000000, skin: 0xffc8a2 },
    { coat: 0x1b4332, pants: 0x000000, skin: 0xfad1a4 },
    { coat: 0x8ecae6, pants: 0x023047, skin: 0xf7c7a3 },
    { coat: 0x343a40, pants: 0x000000, skin: 0xf1c49b },
  ];

  const dogPresets = [
    { body: 0x444444, face: 0x777777 },
    { body: 0x222222, face: 0xaaaaaa },
    { body: 0x3a2a1a, face: 0xc39a6b },
    { body: 0x111827, face: 0x4b5563 },
    { body: 0x1f2933, face: 0x9fb3c8 },
    { body: 0x4b3f72, face: 0xd9bbf9 },
    { body: 0x283618, face: 0xdda15e },
    { body: 0x1f2937, face: 0xe5e7eb },
    { body: 0x0f172a, face: 0xfbbf24 },
    { body: 0x2d3748, face: 0x63b3ed },
  ];

  // ---------- 廊下と額縁 ----------
  buildCorridor();
  placePaintings();

  // ---------- アバター初期生成 ----------
  createAvatar('human');
  avatarGroup.position.set(0, 0, 8); // 入口付近
  updateCameraPosition();

  // ---------- ジョイスティック ----------
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');
  let joyActive = false;
  let joyOrigin = { x: 0, y: 0 };
  let joyVector = { x: 0, y: 0 };

  function getPoint(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function handleJoyStart(e) {
    e.preventDefault();
    joyActive = true;
    const rect = joyBg.getBoundingClientRect();
    joyOrigin.x = rect.left + rect.width / 2;
    joyOrigin.y = rect.top + rect.height / 2;
    updateJoy(e);
  }

  function handleJoyMove(e) {
    if (!joyActive) return;
    e.preventDefault();
    updateJoy(e);
  }

  function handleJoyEnd(e) {
    if (!joyActive) return;
    e.preventDefault();
    joyActive = false;
    joyVector.x = 0;
    joyVector.y = 0;
    joyStick.style.transform = 'translate(-50%, -50%)';
  }

  function updateJoy(e) {
    const p = getPoint(e);
    const dx = p.x - joyOrigin.x;
    const dy = p.y - joyOrigin.y;
    const max = 40;
    let nx = dx;
    let ny = dy;
    const dist = Math.sqrt(nx * nx + ny * ny);
    if (dist > max) {
      nx = (nx / dist) * max;
      ny = (ny / dist) * max;
    }
    joyStick.style.transform =
      'translate(calc(-50% + ' + nx + 'px), calc(-50% + ' + ny + 'px))';
    joyVector.x = nx / max; // 左右
    joyVector.y = ny / max; // 上下
  }

  if (joyBg) {
    joyBg.addEventListener('pointerdown', handleJoyStart);
    window.addEventListener('pointermove', handleJoyMove);
    window.addEventListener('pointerup', handleJoyEnd);
    joyBg.addEventListener('touchstart', handleJoyStart, { passive: false });
    window.addEventListener('touchmove', handleJoyMove, { passive: false });
    window.addEventListener('touchend', handleJoyEnd, { passive: false });
  }

  // ---------- カメラのドラッグ回転 ----------
  let isDraggingCamera = false;
  let lastX = 0;

  canvas.addEventListener('pointerdown', (e) => {
    if (e.target === joyBg || e.target === joyStick) return;
    isDraggingCamera = true;
    lastX = e.clientX;
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDraggingCamera) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    avatarYaw -= dx * 0.005;
  });

  window.addEventListener('pointerup', () => {
    isDraggingCamera = false;
  });

  // ---------- アバターチェンジ ----------
  const btnHuman = document.getElementById('btn-human');
  const btnDog = document.getElementById('btn-dog');

  function setAvatarButtons() {
    if (!btnHuman || !btnDog) return;
    if (avatarType === 'human') {
      btnHuman.classList.add('active');
      btnDog.classList.remove('active');
    } else {
      btnDog.classList.add('active');
      btnHuman.classList.remove('active');
    }
  }

  if (btnHuman && btnDog) {
    btnHuman.addEventListener('click', () => {
      avatarType = 'human';
      createAvatar('human');
      setAvatarButtons();
    });
    btnDog.addEventListener('click', () => {
      avatarType = 'dog';
      createAvatar('dog');
      setAvatarButtons();
    });
  }
  setAvatarButtons();

  // ---------- クリックで絵を拡大表示 ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const infoPanel = document.getElementById('info-panel');
  const infoImage = document.getElementById('info-image');
  const infoTitle = document.getElementById('info-title');
  const infoDesc = document.getElementById('info-desc');
  const infoClose = document.getElementById('info-close');

  if (infoPanel && infoClose) {
    infoPanel.style.display = 'none';

    infoClose.addEventListener('click', () => {
      infoPanel.style.display = 'none';
    });

    canvas.addEventListener('click', (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      pointer.set(x, y);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickablePaints, false);
      if (hits.length > 0) {
        const mesh = hits[0].object;
        const work = mesh.userData.work;
        if (work && infoImage && infoTitle && infoDesc) {
          infoImage.src = work.image;
          infoTitle.textContent = work.title;
          infoDesc.textContent = work.description || '';
          infoPanel.style.display = 'flex';
        }
      }
    });
  }

  // ---------- メインループ ----------
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    updateAvatarMovement(dt);
    updateCameraPosition();
    renderer.render(scene, camera);
  }

  animate();

  // ---------- 関数群 ----------

  function buildCorridor() {
    const floorGeo = new THREE.PlaneGeometry(
      corridor.length,
      corridor.halfWidth * 2
    );
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
      metalness: 0.0,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, corridor.length / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    const ceilGeo = new THREE.PlaneGeometry(
      corridor.length,
      corridor.halfWidth * 2
    );
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0x050509,
      roughness: 1.0,
      metalness: 0.0,
    });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, corridor.wallHeight, corridor.length / 2);
    scene.add(ceil);

    // 左右の壁
    const wallGeo = new THREE.PlaneGeometry(
      corridor.length,
      corridor.wallHeight
    );
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x303030,
      roughness: 0.9,
      metalness: 0.0,
    });

    const wallLeft = new THREE.Mesh(wallGeo, wallMat);
    wallLeft.position.set(-corridor.halfWidth, corridor.wallHeight / 2, corridor.length / 2);
    wallLeft.rotation.y = Math.PI / 2;
    scene.add(wallLeft);

    const wallRight = new THREE.Mesh(wallGeo, wallMat);
    wallRight.position.set(corridor.halfWidth, corridor.wallHeight / 2, corridor.length / 2);
    wallRight.rotation.y = -Math.PI / 2;
    scene.add(wallRight);

    // 天井照明
    const stripGeo = new THREE.PlaneGeometry(2, 0.25);
    const stripMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const count = 10;
    for (let i = 0; i < count; i++) {
      const strip = new THREE.Mesh(stripGeo, stripMat);
      const z = (corridor.length / (count + 1)) * (i + 1);
      strip.position.set(0, corridor.wallHeight - 0.1, z);
      strip.rotation.x = Math.PI / 2;
      scene.add(strip);
    }
  }

  function placePaintings() {
    if (!window.WORKS || !Array.isArray(window.WORKS)) {
      console.warn('WORKS がまだ定義されていません');
      return;
    }

    const works = window.WORKS;
    const total = works.length;
    const spacing = corridor.length / (total / 2 + 2);
    const frameHeight = 2.4;
    const centerY = 2.6;
    const frameDepth = 0.08;

    for (let i = 0; i < total; i++) {
      const work = works[i];
      const isLeft = i < total / 2;
      const indexInSide = isLeft ? i : i - total / 2;
      const z = spacing * (indexInSide + 1.5);

      const group = new THREE.Group();

      const frameColor =
        i % 3 === 0 ? 0x3a3a3a : i % 3 === 1 ? 0x91672c : 0x222222;

      const frameGeo = new THREE.BoxGeometry(1.6, frameHeight, frameDepth);
      const frameMat = new THREE.MeshStandardMaterial({
        color: frameColor,
        metalness: 0.3,
        roughness: 0.5,
      });
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.castShadow = true;
      frameMesh.receiveShadow = true;
      group.add(frameMesh);

      const imgGeo = new THREE.PlaneGeometry(1.4, frameHeight - 0.3);
      const tex = textureLoader.load(work.image);
      const imgMat = new THREE.MeshBasicMaterial({ map: tex });
      const imgMesh = new THREE.Mesh(imgGeo, imgMat);
      imgMesh.position.z = frameDepth / 2 + 0.005;
      imgMesh.userData.work = work;
      group.add(imgMesh);
      clickablePaints.push(imgMesh);

      const coneGeo = new THREE.ConeGeometry(0.18, 0.5, 16, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(0, frameHeight / 2 + 0.35, frameDepth * 0.25);
      cone.rotation.x = -Math.PI / 2.2;
      group.add(cone);

      if (isLeft) {
        group.position.set(-corridor.halfWidth + 0.02, centerY, z);
        group.rotation.y = Math.PI / 2;  // 壁に水平
      } else {
        group.position.set(corridor.halfWidth - 0.02, centerY, z);
        group.rotation.y = -Math.PI / 2;
      }

      scene.add(group);
    }
  }

  function createAvatar(type) {
    const currentPos = avatarGroup.position.clone();

    while (avatarGroup.children.length > 0) {
      const obj = avatarGroup.children.pop();
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    }

    if (type === 'human') {
      const cfg = humanPresets[Math.floor(Math.random() * humanPresets.length)];

      const bodyGeo = new THREE.CylinderGeometry(0.4, 0.5, 1.6, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: cfg.coat,
        roughness: 0.6,
        metalness: 0.1,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 1.0;
      avatarGroup.add(body);

      const headGeo = new THREE.SphereGeometry(0.35, 24, 16);
      const headMat = new THREE.MeshStandardMaterial({
        color: cfg.skin,
        roughness: 0.5,
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 1.9;
      avatarGroup.add(head);

      const hairGeo = new THREE.SphereGeometry(0.36, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const hairMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.4,
      });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = 2.0;
      avatarGroup.add(hair);

      const armGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.1, 12);
      const armMat = new THREE.MeshStandardMaterial({
        color: cfg.coat,
        roughness: 0.6,
      });
      const armL = new THREE.Mesh(armGeo, armMat);
      armL.position.set(-0.55, 1.05, 0);
      avatarGroup.add(armL);
      const armR = armL.clone();
      armR.position.x = 0.55;
      avatarGroup.add(armR);

      const legGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.9, 12);
      const legMat = new THREE.MeshStandardMaterial({
        color: cfg.pants,
        roughness: 0.7,
      });
      const legL = new THREE.Mesh(legGeo, legMat);
      legL.position.set(-0.18, 0.45, 0);
      avatarGroup.add(legL);
      const legR = legL.clone();
      legR.position.x = 0.18;
      avatarGroup.add(legR);
    } else {
      const cfg = dogPresets[Math.floor(Math.random() * dogPresets.length)];

      const bodyGeo = new THREE.BoxGeometry(1.1, 0.7, 1.6);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: cfg.body,
        roughness: 0.7,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.6;
      avatarGroup.add(body);

      const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.9);
      const headMat = new THREE.MeshStandardMaterial({
        color: cfg.face,
        roughness: 0.6,
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(0, 1.1, 0.9);
      avatarGroup.add(head);

      const earGeo = new THREE.BoxGeometry(0.18, 0.45, 0.1);
      const earMat = new THREE.MeshStandardMaterial({
        color: cfg.body,
        roughness: 0.7,
      });
      const earL = new THREE.Mesh(earGeo, earMat);
      earL.position.set(-0.3, 1.4, 0.8);
      avatarGroup.add(earL);
      const earR = earL.clone();
      earR.position.x = 0.3;
      avatarGroup.add(earR);

      const legGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.55, 10);
      const legMat = new THREE.MeshStandardMaterial({
        color: cfg.body,
        roughness: 0.8,
      });
      const legPos = [
        [-0.35, 0.3, 0.55],
        [0.35, 0.3, 0.55],
        [-0.35, 0.3, -0.55],
        [0.35, 0.3, -0.55],
      ];
      legPos.forEach((p) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(p[0], p[1], p[2]);
        avatarGroup.add(leg);
      });

      const tailGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.6, 8);
      const tailMat = new THREE.MeshStandardMaterial({
        color: cfg.body,
        roughness: 0.7,
      });
      const tail = new THREE.Mesh(tailGeo, tailMat);
      tail.position.set(0, 0.9, -0.9);
      tail.rotation.x = Math.PI / 3;
      avatarGroup.add(tail);
    }

    avatarGroup.position.copy(currentPos);
  }

  function updateAvatarMovement(dt) {
    if (!dt) return;

    const forward = -joyVector.y; // 上で前進
    const strafe = joyVector.x;   // 右で右移動

    if (Math.abs(forward) < 0.02 && Math.abs(strafe) < 0.02) return;

    const speed = 4.0 * dt;
    const sin = Math.sin(avatarYaw);
    const cos = Math.cos(avatarYaw);

    const dx = (forward * cos - strafe * sin) * speed;
    const dz = (forward * sin + strafe * cos) * speed;

    avatarGroup.position.x += dx;
    avatarGroup.position.z += dz;

    const margin = 1.0;
    const minX = -corridor.halfWidth + margin;
    const maxX = corridor.halfWidth - margin;
    const minZ = 1.5;
    const maxZ = corridor.length - 1.5;

    avatarGroup.position.x = Math.max(minX, Math.min(maxX, avatarGroup.position.x));
    avatarGroup.position.z = Math.max(minZ, Math.min(maxZ, avatarGroup.position.z));
  }

  function updateCameraPosition() {
    const offset = cameraBaseOffset.clone();
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), avatarYaw);

    const target = avatarGroup.position.clone();
    const camPos = target.clone().add(offset);

    camera.position.copy(camPos);
    camera.lookAt(target.x, target.y + 1.5, target.z);
  }

  function resizeRenderer() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resizeRenderer);
  resizeRenderer();
})();
