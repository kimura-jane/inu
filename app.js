// app.js : ギャラリー1室 + アバター(人/犬) + ジョイスティック
(function () {
  const canvas = document.getElementById('scene');

  // ===== renderer =====
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);

  let camera = null;

  function resizeRenderer() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    if (camera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  // ===== scene & camera =====
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050509);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  scene.add(camera);

  resizeRenderer();

  // ===== light =====
  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(5, 10, -5);
  scene.add(dir);

  // ===== room (1つの部屋) =====
  const ROOM_WIDTH = 22;
  const ROOM_DEPTH = 24;
  const ROOM_HEIGHT = 6;

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x3b3b42,
    roughness: 0.8,
    metalness: 0.1,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x18181d,
    roughness: 0.9,
    metalness: 0.0,
  });
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x101015,
    roughness: 0.9,
    metalness: 0.0,
  });

  // floor
  const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // ceiling
  const ceilGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  const ceil = new THREE.Mesh(ceilGeo, ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = ROOM_HEIGHT;
  scene.add(ceil);

  // walls
  const wallGeoX = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);
  const wallGeoZ = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);

  const wallLeft = new THREE.Mesh(wallGeoX, wallMat);
  wallLeft.rotation.y = Math.PI / 2;
  wallLeft.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  scene.add(wallLeft);

  const wallRight = new THREE.Mesh(wallGeoX, wallMat);
  wallRight.rotation.y = -Math.PI / 2;
  wallRight.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  scene.add(wallRight);

  const wallFront = new THREE.Mesh(wallGeoZ, wallMat);
  wallFront.rotation.y = Math.PI;
  wallFront.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
  scene.add(wallFront);

  const wallBack = new THREE.Mesh(wallGeoZ, wallMat);
  wallBack.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
  scene.add(wallBack);

  // ===== door（入口側・前の壁に扉だけ） =====
  const doorFrameGroup = new THREE.Group();
  const doorWidth = 5;
  const doorHeight = 4;
  const frameThickness = 0.25;

  const doorFrameMat = new THREE.MeshStandardMaterial({
    color: 0x9b8c63,
    metalness: 0.4,
    roughness: 0.4,
  });

  const frameSideGeo = new THREE.BoxGeometry(frameThickness, doorHeight, 0.4);
  const frameTopGeo = new THREE.BoxGeometry(doorWidth, frameThickness, 0.4);

  const leftFrame = new THREE.Mesh(frameSideGeo, doorFrameMat);
  leftFrame.position.set(-doorWidth / 2, doorHeight / 2, -ROOM_DEPTH / 2 + 0.21);
  const rightFrame = leftFrame.clone();
  rightFrame.position.x = doorWidth / 2;
  const topFrame = new THREE.Mesh(frameTopGeo, doorFrameMat);
  topFrame.position.set(0, doorHeight + frameThickness / 2, -ROOM_DEPTH / 2 + 0.21);

  doorFrameGroup.add(leftFrame, rightFrame, topFrame);
  scene.add(doorFrameGroup);

  // ===== ceiling lights =====
  const stripMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.0,
    roughness: 0.3,
  });
  const stripGeo = new THREE.BoxGeometry(2.0, 0.06, 0.35);

  const STRIP_NUM = 6;
  for (let i = 0; i < STRIP_NUM; i++) {
    const strip = new THREE.Mesh(stripGeo, stripMat);
    const z = -ROOM_DEPTH / 2 + 4 + (ROOM_DEPTH - 8) * (i / (STRIP_NUM - 1));
    strip.position.set(0, ROOM_HEIGHT - 0.25, z);
    scene.add(strip);
  }

  // ===== frames & works =====
  const textureLoader = new THREE.TextureLoader();
  const clickableMeshes = [];

  const frameStyles = [
    {
      outerColor: 0x8a6b2f,
      innerColor: 0xf5f0e6,
      trimColor: 0xd9c28a,
      profile: 'crown',
    },
    {
      outerColor: 0x111111,
      innerColor: 0xf0f0f0,
      trimColor: 0x888c92,
      profile: 'double',
    },
    {
      outerColor: 0x4a3320,
      innerColor: 0xe8e1d3,
      trimColor: 0x2b1b10,
      profile: 'flat',
    },
    {
      outerColor: 0xf8f8f8,
      innerColor: 0x111111,
      trimColor: 0xd0d0d0,
      profile: 'thin',
    },
  ];

  function createFrame(work, isLeftWall, indexOnWall) {
    const g = new THREE.Group();
    const style = frameStyles[indexOnWall % frameStyles.length];

    const picW = 2.2;
    const picH = 3.0;

    // 背板
    const baseGeo = new THREE.BoxGeometry(picW + 0.6, picH + 0.6, 0.12);
    const baseMat = new THREE.MeshStandardMaterial({
      color: style.outerColor,
      metalness: 0.55,
      roughness: 0.4,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    g.add(base);

    // 内側
    const innerGeo = new THREE.BoxGeometry(picW + 0.25, picH + 0.25, 0.08);
    const innerMat = new THREE.MeshStandardMaterial({
      color: style.innerColor,
      metalness: 0.2,
      roughness: 0.7,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.z = 0.03;
    g.add(inner);

    // 装飾
    if (style.profile === 'crown' || style.profile === 'double') {
      const crownGeo = new THREE.BoxGeometry(picW + 0.9, 0.35, 0.14);
      const crownMat = new THREE.MeshStandardMaterial({
        color: style.trimColor,
        metalness: 0.8,
        roughness: 0.25,
      });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.set(0, (picH + 0.6) / 2 + 0.23, 0.01);
      g.add(crown);
    }
    if (style.profile === 'double') {
      const sideGeo = new THREE.BoxGeometry(0.18, picH + 0.45, 0.14);
      const sideMat = new THREE.MeshStandardMaterial({
        color: style.trimColor,
        metalness: 0.8,
        roughness: 0.25,
      });
      const leftTrim = new THREE.Mesh(sideGeo, sideMat);
      leftTrim.position.set(-(picW + 0.6) / 2 - 0.05, 0, 0.01);
      const rightTrim = leftTrim.clone();
      rightTrim.position.x *= -1;
      g.add(leftTrim, rightTrim);
    }

    // 画像
    const tex = textureLoader.load(work.image);
    tex.minFilter = THREE.LinearFilter;
    const picGeo = new THREE.PlaneGeometry(picW, picH);
    const picMat = new THREE.MeshBasicMaterial({ map: tex });
    const pic = new THREE.Mesh(picGeo, picMat);
    pic.position.z = 0.07;
    g.add(pic);

    // 見た目用スポットライト
    const lampGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.4, 12);
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xdcdcdc,
      metalness: 0.6,
      roughness: 0.4,
    });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.rotation.x = -Math.PI / 4;
    lamp.position.set(0, (picH + 0.9) / 2, 0.2);
    g.add(lamp);

    const spot = new THREE.SpotLight(0xffffff, 0.7, 6, Math.PI / 4, 0.6, 1.2);
    spot.position.set(0, (picH + 0.9) / 2, 0.7);
    spot.target = pic;
    g.add(spot);
    g.add(spot.target);

    // 壁に水平に貼り付ける
    const marginFromCorner = 2.5;
    const spacing = 3.0;
    const zStart = -ROOM_DEPTH / 2 + marginFromCorner;
    const z = zStart + indexOnWall * spacing;
    const x = isLeftWall ? -ROOM_WIDTH / 2 + 0.01 : ROOM_WIDTH / 2 - 0.01;
    const y = ROOM_HEIGHT / 2;

    g.position.set(x, y, z);
    g.rotation.y = isLeftWall ? Math.PI / 2 : -Math.PI / 2;

    scene.add(g);

    clickableMeshes.push(pic);
    pic.userData.work = work;
  }

  if (typeof WORKS !== 'undefined' && Array.isArray(WORKS)) {
    const half = Math.ceil(WORKS.length / 2);
    const left = WORKS.slice(0, half);
    const right = WORKS.slice(half);
    left.forEach((w, i) => createFrame(w, true, i));
    right.forEach((w, i) => createFrame(w, false, i));
  }

  // ===== Avatar =====
  const avatarGroup = new THREE.Group();
  scene.add(avatarGroup);

  function createHuman(color) {
    const g = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.6, 0.7, 2.0, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.0;
    g.add(body);

    const headGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xf2d3b0,
      roughness: 0.7,
      metalness: 0.0,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.2;
    g.add(head);

    const hairGeo = new THREE.SphereGeometry(0.6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
      metalness: 0.1,
    });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 2.35;
    g.add(hair);

    const legGeo = new THREE.BoxGeometry(0.4, 0.9, 0.4);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const legL = new THREE.Mesh(legGeo, legMat);
    const legR = legL.clone();
    legL.position.set(-0.25, 0.45, 0);
    legR.position.set(0.25, 0.45, 0);
    g.add(legL, legR);

    return g;
  }

  function createDog(color) {
    const g = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(1.4, 0.9, 2.0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    g.add(body);

    const headGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const headMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.1,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.1, 0.8);
    g.add(head);

    const earGeo = new THREE.BoxGeometry(0.25, 0.5, 0.15);
    const earMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const earL = new THREE.Mesh(earGeo, earMat);
    const earR = earL.clone();
    earL.position.set(-0.4, 1.4, 0.7);
    earR.position.set(0.4, 1.4, 0.7);
    g.add(earL, earR);

    const legGeo = new THREE.BoxGeometry(0.25, 0.6, 0.25);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const legFL = new THREE.Mesh(legGeo, legMat);
    const legFR = legFL.clone();
    const legBL = legFL.clone();
    const legBR = legFL.clone();
    legFL.position.set(-0.45, 0.3, 0.6);
    legFR.position.set(0.45, 0.3, 0.6);
    legBL.position.set(-0.45, 0.3, -0.6);
    legBR.position.set(0.45, 0.3, -0.6);
    g.add(legFL, legFR, legBL, legBR);

    return g;
  }

  const humanColors = [0x3467d8, 0xe39c25, 0x1e9f7a, 0xb94e6b];
  const dogColors = [0x3a3a3a, 0x70401f, 0xc9a46a, 0x22223b];

  let currentAvatarMesh = null;
  let currentAvatarType = 'human';

  function setAvatar(type) {
    if (currentAvatarMesh) avatarGroup.remove(currentAvatarMesh);
    if (type === 'human') {
      const c = humanColors[Math.floor(Math.random() * humanColors.length)];
      currentAvatarMesh = createHuman(c);
    } else {
      const c = dogColors[Math.floor(Math.random() * dogColors.length)];
      currentAvatarMesh = createDog(c);
    }
    avatarGroup.add(currentAvatarMesh);
    currentAvatarType = type;
  }

  // 入口付近に立つ
  avatarGroup.position.set(0, 0, -ROOM_DEPTH / 2 + 3.5);
  avatarGroup.rotation.y = 0;

  setAvatar('human');

  // ===== camera follow =====
  function updateCamera() {
    const basePos = avatarGroup.position;
    const yaw = avatarGroup.rotation.y;

    const offset = new THREE.Vector3(0, 2.4, 6); // 真後ろ+少し上
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    camera.position.copy(basePos).add(offset);

    const look = basePos.clone();
    look.y += 1.6;
    camera.lookAt(look);
  }

  updateCamera();

  // ===== joystick =====
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');

  const joyRect = { x: 0, y: 0, r: 0 };
  let joyPointerId = null;
  let joyVector = { x: 0, y: 0 };

  function updateJoyRect() {
    const r = joyBg.getBoundingClientRect();
    joyRect.x = r.left + r.width / 2;
    joyRect.y = r.top + r.height / 2;
    joyRect.r = r.width / 2;
  }

  updateJoyRect();

  function pointInCircle(px, py) {
    const dx = px - joyRect.x;
    const dy = py - joyRect.y;
    return dx * dx + dy * dy <= joyRect.r * joyRect.r;
  }

  function moveStick(px, py) {
    const dx = px - joyRect.x;
    const dy = py - joyRect.y;
    const maxDist = joyRect.r * 0.75;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= 0.0001) {
      joyVector.x = 0;
      joyVector.y = 0;
      joyStick.style.transform = 'translate3d(-50%, -50%, 0)';
      return;
    }

    const clamped = Math.min(dist, maxDist);
    const nx = dx / dist;
    const ny = dy / dist;

    joyVector.x = (clamped / maxDist) * nx;
    joyVector.y = (clamped / maxDist) * ny;

    const sx = nx * clamped;
    const sy = ny * clamped;
    joyStick.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
  }

  function joyStart(e) {
    if (joyPointerId !== null) return;
    const t = e.changedTouches ? e.changedTouches[0] : e;
    if (!pointInCircle(t.clientX, t.clientY)) return;
    joyPointerId = t.identifier != null ? t.identifier : 'mouse';
    moveStick(t.clientX, t.clientY);
  }

  function joyMove(e) {
    if (joyPointerId === null) return;
    const ts = e.changedTouches ? e.changedTouches : [e];
    for (const t of ts) {
      const id = t.identifier != null ? t.identifier : 'mouse';
      if (id !== joyPointerId) continue;
      moveStick(t.clientX, t.clientY);
    }
  }

  function joyEnd(e) {
    if (joyPointerId === null) return;
    const ts = e.changedTouches ? e.changedTouches : [e];
    for (const t of ts) {
      const id = t.identifier != null ? t.identifier : 'mouse';
      if (id !== joyPointerId) continue;
      joyPointerId = null;
      joyVector.x = 0;
      joyVector.y = 0;
      joyStick.style.transform = 'translate3d(-50%, -50%, 0)';
    }
  }

  joyBg.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    joyStart(e);
  });
  window.addEventListener('pointermove', joyMove);
  window.addEventListener('pointerup', joyEnd);
  window.addEventListener('pointercancel', joyEnd);

  // ===== avatar switch buttons =====
  const humanBtn = document.getElementById('avatar-human');
  const dogBtn = document.getElementById('avatar-dog');

  if (humanBtn && dogBtn) {
    humanBtn.addEventListener('click', () => {
      setAvatar('human');
      humanBtn.classList.add('active');
      dogBtn.classList.remove('active');
    });
    dogBtn.addEventListener('click', () => {
      setAvatar('dog');
      dogBtn.classList.add('active');
      humanBtn.classList.remove('active');
    });
  }

  // ===== click picture -> info =====
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const infoPanel = document.getElementById('info-panel');
  const infoTitle = document.getElementById('info-title');
  const infoDesc = document.getElementById('info-desc');
  const infoClose = document.getElementById('info-close');

  function openInfo(work) {
    if (!infoPanel || !infoTitle || !infoDesc) return;
    infoTitle.textContent = work.title || '';
    infoDesc.textContent = work.desc || '';
    infoPanel.classList.add('visible');
  }

  if (infoClose && infoPanel) {
    infoClose.addEventListener('click', () => {
      infoPanel.classList.remove('visible');
    });
  }

  canvas.addEventListener('click', (event) => {
    // ジョイスティック上のタップは無視
    const jr = joyBg.getBoundingClientRect();
    if (
      event.clientX >= jr.left &&
      event.clientX <= jr.right &&
      event.clientY >= jr.top &&
      event.clientY <= jr.bottom
    ) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickableMeshes);
    if (hits.length > 0) {
      const m = hits[0].object;
      const work = m.userData.work;
      if (work) openInfo(work);
    }
  });

  // ===== animation loop =====
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    // joystick -> 移動
    const len = Math.min(
      1,
      Math.sqrt(joyVector.x * joyVector.x + joyVector.y * joyVector.y)
    );

    if (len > 0.05) {
      const baseSpeed = 4.0; // m/s
      const angle = Math.atan2(joyVector.x, -joyVector.y); // 前:上、右:右
      avatarGroup.rotation.y = angle;

      const moveSpeed = baseSpeed * len * dt;
      const dirVec = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
      avatarGroup.position.addScaledVector(dirVec, moveSpeed);

      const margin = 1.5;
      avatarGroup.position.x = THREE.MathUtils.clamp(
        avatarGroup.position.x,
        -ROOM_WIDTH / 2 + margin,
        ROOM_WIDTH / 2 - margin
      );
      avatarGroup.position.z = THREE.MathUtils.clamp(
        avatarGroup.position.z,
        -ROOM_DEPTH / 2 + margin,
        ROOM_DEPTH / 2 - margin
      );
    }

    updateCamera();
    renderer.render(scene, camera);
  }

  animate(performance.now());

  // ===== resize =====
  window.addEventListener('resize', () => {
    resizeRenderer();
    updateJoyRect();
  });
})();
