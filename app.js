// app.js  TAF DOG MUSEUM
// 三人称視点＋ジョイスティック＋アバターチェンジ（人間/犬）

(function () {
  const canvas = document.getElementById('scene');
  if (!canvas) return;

  // ---------- 基本セットアップ ----------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  resizeRenderer();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050508);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    300
  );

  // ホールサイズ
  const HALL_LENGTH = 80;
  const HALL_WIDTH = 14;
  const WALL_HEIGHT = 7;

  // ---------- ライト ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const ceilingLightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.3
  });

  const pointLights = [];

  // ---------- 床・天井・壁 ----------
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.9,
    metalness: 0.0
  });
  const floorGeo = new THREE.PlaneGeometry(HALL_LENGTH, HALL_WIDTH);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0x050505,
    roughness: 1.0,
    metalness: 0.0
  });
  const ceilingGeo = new THREE.PlaneGeometry(HALL_LENGTH, HALL_WIDTH);
  const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  scene.add(ceiling);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x777777,
    roughness: 0.9,
    metalness: 0.0
  });
  const wallGeo = new THREE.PlaneGeometry(HALL_LENGTH, WALL_HEIGHT);

  // 左壁
  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.position.set(-HALL_WIDTH / 2, WALL_HEIGHT / 2, HALL_LENGTH / 2);
  leftWall.rotation.y = Math.PI / 2;
  scene.add(leftWall);

  // 右壁
  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.position.set(HALL_WIDTH / 2, WALL_HEIGHT / 2, HALL_LENGTH / 2);
  rightWall.rotation.y = -Math.PI / 2;
  scene.add(rightWall);

  // ---------- 天井の照明パネル ----------
  const lightPanelGeo = new THREE.BoxGeometry(4, 0.05, 0.6);
  const NUM_LIGHTS = 10;
  for (let i = 0; i < NUM_LIGHTS; i++) {
    const panel = new THREE.Mesh(lightPanelGeo, ceilingLightMat);
    const z = 6 + ((HALL_LENGTH - 16) / (NUM_LIGHTS - 1)) * i;
    panel.position.set(0, WALL_HEIGHT - 0.15, z);
    scene.add(panel);

    const pLight = new THREE.PointLight(0xffffff, 0.6, 25, 2);
    pLight.position.set(0, WALL_HEIGHT - 0.1, z);
    scene.add(pLight);
    pointLights.push(pLight);
  }

  // ---------- 額縁 & 絵 ----------
  const clickablePaintings = [];
  const textureLoader = new THREE.TextureLoader();

  const frameDepth = 0.4;
  const frameOuterW = 3.2;
  const frameOuterH = 4.4;
  const frameInnerW = 2.6;
  const frameInnerH = 3.8;

  const frameGeos = {
    gold: new THREE.BoxGeometry(frameOuterW, frameOuterH, frameDepth),
    dark: new THREE.BoxGeometry(frameOuterW, frameOuterH, frameDepth),
    metal: new THREE.BoxGeometry(frameOuterW, frameOuterH, frameDepth)
  };

  const frameMats = {
    gold: new THREE.MeshStandardMaterial({
      color: 0x8c6b2e,
      metalness: 0.8,
      roughness: 0.3
    }),
    dark: new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.4,
      roughness: 0.6
    }),
    metal: new THREE.MeshStandardMaterial({
      color: 0xb0b0b0,
      metalness: 1.0,
      roughness: 0.3
    })
  };

  const pictureGeo = new THREE.PlaneGeometry(frameInnerH, frameInnerW);

  const frameTypes = ['gold', 'dark', 'metal'];

  const spotlightMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35
  });
  const spotlightGeo = new THREE.ConeGeometry(0.7, 2.4, 16, 1, true);

  function addPaintings() {
    const works = window.WORKS;
    if (!Array.isArray(works)) return;

    const spacing = (HALL_LENGTH - 20) / works.length;

    for (let i = 0; i < works.length; i++) {
      const work = works[i];

      const isLeft = i % 2 === 0;
      const sideSign = isLeft ? -1 : 1;
      const wallX = (HALL_WIDTH / 2 - 0.1 - frameDepth / 2) * sideSign;
      const baseZ = 10 + spacing * i;

      const frameType = frameTypes[i % frameTypes.length];
      const frameGeo = frameGeos[frameType];
      const frameMat = frameMats[frameType];

      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.position.set(wallX, WALL_HEIGHT * 0.55, baseZ);
      frameMesh.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
      scene.add(frameMesh);

      const tex = textureLoader.load(work.image);
      tex.minFilter = THREE.LinearFilter;
      const picMat = new THREE.MeshBasicMaterial({ map: tex });

      const picture = new THREE.Mesh(pictureGeo, picMat);
      const frontOffset = frameDepth / 2 + 0.01;
      picture.position.set(
        wallX + (isLeft ? frontOffset : -frontOffset),
        WALL_HEIGHT * 0.55,
        baseZ
      );
      picture.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
      picture.userData.work = work;
      scene.add(picture);
      clickablePaintings.push(picture);

      const cone = new THREE.Mesh(spotlightGeo, spotlightMat);
      cone.position.set(
        wallX + (isLeft ? frontOffset * 0.3 : -frontOffset * 0.3),
        WALL_HEIGHT - 0.4,
        baseZ
      );
      cone.rotation.x = Math.PI;
      cone.rotation.z = isLeft ? -Math.PI / 2 : Math.PI / 2;
      scene.add(cone);
    }
  }

  addPaintings();

  // ---------- アバター ----------
  const avatarGroup = new THREE.Group();
  scene.add(avatarGroup);

  const AVATAR_START_Z = 4;
  const AVATAR_Y = 0;

  let currentAvatar = null;
  let currentAvatarType = 'human';

  const HUMAN_COLORS = [
    0x4477ff,
    0xff9933,
    0x55aa55,
    0xaa55aa,
    0xcccc33,
    0xff5555,
    0x339999,
    0x996633,
    0x7777ff,
    0xff77aa
  ];

  const DOG_COLORS = [
    0x333333,
    0x886644,
    0xffffff,
    0xffe4b5,
    0x444444,
    0xaa7744,
    0xd2b48c,
    0x555555,
    0xdeb887,
    0x666666
  ];

  function createHuman(index) {
    const g = new THREE.Group();

    const skinColor = 0xd8b49c;
    const bodyColor = HUMAN_COLORS[index % HUMAN_COLORS.length];
    const hairColor = index % 2 === 0 ? 0x111111 : 0x553322;

    const legGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.2, 12);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const legL = new THREE.Mesh(legGeo, legMat);
    const legR = legL.clone();
    legL.position.set(-0.35, 0.6, 0);
    legR.position.set(0.35, 0.6, 0);
    g.add(legL, legR);

    const bodyGeo = new THREE.CylinderGeometry(0.9, 0.9, 2.2, 20);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.7,
      metalness: 0.1
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 2.2;
    g.add(body);

    const armGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.6, 12);
    const armMat = bodyMat;
    const armL = new THREE.Mesh(armGeo, armMat);
    const armR = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-1.15, 2.4, 0);
    armR.position.set(1.15, 2.4, 0);
    armL.rotation.z = Math.PI / 16;
    armR.rotation.z = -Math.PI / 16;
    g.add(armL, armR);

    const neckGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 12);
    const neckMat = new THREE.MeshStandardMaterial({ color: skinColor });
    const neck = new THREE.Mesh(neckGeo, neckMat);
    neck.position.y = 3.5;
    g.add(neck);

    const headGeo = new THREE.SphereGeometry(0.9, 20, 20);
    const headMat = neckMat;
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 4.6;
    g.add(head);

    const hairGeo = new THREE.SphereGeometry(0.95, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.8,
      metalness: 0.2
    });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 4.7;
    g.add(hair);

    return g;
  }

  function createDog(index) {
    const g = new THREE.Group();
    const color = DOG_COLORS[index % DOG_COLORS.length];

    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.1
    });

    const bodyGeo = new THREE.BoxGeometry(2.2, 1.8, 3.0);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2;
    g.add(body);

    const headGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 2.2, 1.7);
    g.add(head);

    const earGeo = new THREE.BoxGeometry(0.4, 0.9, 0.2);
    const earL = new THREE.Mesh(earGeo, bodyMat);
    const earR = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-0.6, 3.0, 1.4);
    earR.position.set(0.6, 3.0, 1.4);
    g.add(earL, earR);

    const legGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.1, 10);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const legPositions = [
      [-0.7, 0.55, 1.0],
      [0.7, 0.55, 1.0],
      [-0.7, 0.55, -1.0],
      [0.7, 0.55, -1.0]
    ];
    legPositions.forEach(p => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(p[0], p[1], p[2]);
      g.add(leg);
    });

    const tailGeo = new THREE.CylinderGeometry(0.15, 0.25, 1.4, 10);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.set(0, 2.0, -1.7);
    tail.rotation.x = -Math.PI / 3;
    g.add(tail);

    return g;
  }

  const humans = [];
  const dogs = [];

  for (let i = 0; i < 10; i++) {
    const h = createHuman(i);
    h.visible = false;
    humans.push(h);
    avatarGroup.add(h);

    const d = createDog(i);
    d.visible = false;
    dogs.push(d);
    avatarGroup.add(d);
  }

  let currentHumanIndex = 0;
  let currentDogIndex = 0;

  function activateAvatar(type) {
    currentAvatarType = type;

    humans.forEach(h => (h.visible = false));
    dogs.forEach(d => (d.visible = false));

    if (type === 'human') {
      currentAvatar = humans[currentHumanIndex];
    } else {
      currentAvatar = dogs[currentDogIndex];
    }

    currentAvatar.visible = true;
    currentAvatar.position.set(0, AVATAR_Y, AVATAR_START_Z);
    currentAvatar.rotation.y = 0;
  }

  activateAvatar('human');

  // ---------- カメラ ----------
  let cameraYaw = 0;
  let cameraPitch = 0;

  const CAMERA_DIST = 8;
  const CAMERA_HEIGHT = 4;

  function updateCamera() {
    if (!currentAvatar) return;

    const target = currentAvatar.position.clone();
    target.y += 2.5;

    const offset = new THREE.Vector3(
      Math.sin(cameraYaw) * CAMERA_DIST,
      CAMERA_HEIGHT,
      -Math.cos(cameraYaw) * CAMERA_DIST
    );

    const camPos = target.clone().add(offset);
    camera.position.copy(camPos);

    const lookTarget = target.clone();
    lookTarget.y += cameraPitch;
    camera.lookAt(lookTarget);
  }

  // ---------- 画面ドラッグで視点変更 ----------
  let draggingView = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' || e.button === 0) {
      draggingView = true;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });

  window.addEventListener('pointermove', e => {
    if (!draggingView) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    cameraYaw -= dx * 0.005;
    cameraPitch -= dy * 0.003;
    cameraPitch = Math.max(-1.0, Math.min(1.0, cameraPitch));
  });

  window.addEventListener('pointerup', () => {
    draggingView = false;
  });

  // ---------- ジョイスティック ----------
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');
  let joyActive = false;
  let joyCenter = { x: 0, y: 0 };
  let joyDX = 0;
  let joyDY = 0;

  function updateJoyCenter() {
    const rect = joyBg.getBoundingClientRect();
    joyCenter.x = rect.left + rect.width / 2;
    joyCenter.y = rect.top + rect.height / 2;
  }
  updateJoyCenter();
  window.addEventListener('resize', updateJoyCenter);

  function handleJoyStart(e) {
    joyActive = true;
    const p = e.touches ? e.touches[0] : e;
    moveJoy(p.clientX, p.clientY);
  }

  function handleJoyMove(e) {
    if (!joyActive) return;
    const p = e.touches ? e.touches[0] : e;
    moveJoy(p.clientX, p.clientY);
  }

  function handleJoyEnd() {
    joyActive = false;
    joyDX = 0;
    joyDY = 0;
    joyStick.style.transform = 'translate(-50%, -50%)';
  }

  function moveJoy(x, y) {
    const dx = x - joyCenter.x;
    const dy = y - joyCenter.y;
    const maxR = 40;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxR);
    const ang = Math.atan2(dy, dx);
    const nx = Math.cos(ang) * dist;
    const ny = Math.sin(ang) * dist;

    joyStick.style.transform = `translate(${nx}px, ${ny}px)`;

    joyDX = nx / maxR;
    joyDY = ny / maxR;
  }

  joyBg.addEventListener('pointerdown', handleJoyStart);
  window.addEventListener('pointermove', handleJoyMove);
  window.addEventListener('pointerup', handleJoyEnd);
  joyBg.addEventListener('touchstart', handleJoyStart, { passive: true });
  window.addEventListener('touchmove', handleJoyMove, { passive: true });
  window.addEventListener('touchend', handleJoyEnd);

  // ---------- アバター移動 ----------
  const avatarSpeed = 0.12;

  function updateAvatarPosition() {
    if (!currentAvatar) return;
    if (!joyActive && Math.abs(joyDX) < 0.01 && Math.abs(joyDY) < 0.01) return;

    const forward = -joyDY;
    const strafe = joyDX;

    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);

    const moveX = (strafe * cos + forward * sin) * avatarSpeed;
    const moveZ = (-strafe * sin + forward * cos) * avatarSpeed;

    currentAvatar.position.x += moveX;
    currentAvatar.position.z += moveZ;

    const margin = 1.6;
    const maxX = HALL_WIDTH / 2 - margin;
    currentAvatar.position.x = Math.max(-maxX, Math.min(maxX, currentAvatar.position.x));

    const minZ = 2;
    const maxZ = HALL_LENGTH - 4;
    currentAvatar.position.z = Math.max(minZ, Math.min(maxZ, currentAvatar.position.z));
  }

  // ---------- アバターチェンジ ----------
  const btnHuman = document.getElementById('btn-human') ||
    document.querySelector('[data-avatar-type="human"]') ||
    document.querySelector('#avatar-human');
  const btnDog = document.getElementById('btn-dog') ||
    document.querySelector('[data-avatar-type="dog"]') ||
    document.querySelector('#avatar-dog');

  function setAvatarButtons(type) {
    if (!btnHuman || !btnDog) return;
    if (type === 'human') {
      btnHuman.classList.add('active');
      btnDog.classList.remove('active');
    } else {
      btnHuman.classList.remove('active');
      btnDog.classList.add('active');
    }
  }

  if (btnHuman) {
    btnHuman.addEventListener('click', () => {
      currentHumanIndex = (currentHumanIndex + 1) % humans.length;
      activateAvatar('human');
      setAvatarButtons('human');
    });
  }

  if (btnDog) {
    btnDog.addEventListener('click', () => {
      currentDogIndex = (currentDogIndex + 1) % dogs.length;
      activateAvatar('dog');
      setAvatarButtons('dog');
    });
  }

  setAvatarButtons('human');

  // ---------- 絵の拡大表示 ----------
  let overlay = document.getElementById('info-panel');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'info-panel';
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.display = 'none';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '20';
    overlay.style.padding = '16px';
    document.body.appendChild(overlay);

    const inner = document.createElement('div');
    inner.id = 'info-inner';
    inner.style.maxWidth = '96vw';
    inner.style.maxHeight = '90vh';
    inner.style.background = '#111';
    inner.style.borderRadius = '16px';
    inner.style.overflow = 'hidden';
    inner.style.position = 'relative';
    overlay.appendChild(inner);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.right = '12px';
    closeBtn.style.top = '6px';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'transparent';
    closeBtn.style.color = '#fff';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.cursor = 'pointer';
    inner.appendChild(closeBtn);

    const img = document.createElement('img');
    img.id = 'info-image';
    img.style.display = 'block';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '80vh';
    img.style.margin = '32px auto 8px';
    inner.appendChild(img);

    const cap = document.createElement('div');
    cap.id = 'info-caption';
    cap.style.color = '#fff';
    cap.style.fontSize = '14px';
    cap.style.textAlign = 'center';
    cap.style.padding = '0 12px 12px';
    inner.appendChild(cap);

    closeBtn.addEventListener('click', () => {
      overlay.style.display = 'none';
    });
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.style.display = 'none';
    });
  }

  const infoImg = document.getElementById('info-image');
  const infoCaption = document.getElementById('info-caption');

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function onCanvasTap(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    pointer.set(x, y);

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clickablePaintings, false);
    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const work = mesh.userData.work;
      if (infoImg && infoCaption && overlay) {
        infoImg.src = work.image;
        infoCaption.textContent = work.title || '';
        overlay.style.display = 'flex';
      }
    }
  }

  canvas.addEventListener('click', onCanvasTap);

  // ---------- アニメーション ----------
  function animate() {
    requestAnimationFrame(animate);
    updateAvatarPosition();
    updateCamera();
    renderer.render(scene, camera);
  }
  animate();

  // ---------- リサイズ ----------
  window.addEventListener('resize', resizeRenderer);

  function resizeRenderer() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
})();
