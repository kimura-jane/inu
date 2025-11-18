// app.js
(() => {
  'use strict';

  // =====================================================
  // DOM 取得
  // =====================================================
  const canvas = document.getElementById('scene');
  const btnHuman = document.getElementById('btn-human');
  const btnDog = document.getElementById('btn-dog');
  const joyContainer = document.getElementById('joy-container');
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');

  if (!canvas) {
    console.error('canvas#scene が見つからない');
    return;
  }

  // =====================================================
  // Three.js 基本セットアップ
  // =====================================================
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const camera = new THREE.PerspectiveCamera(
    60,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000
  );

  const clock = new THREE.Clock();

  function handleResize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', handleResize);
  handleResize();

  // =====================================================
  // ライティング
  // =====================================================
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const ceilingLight = new THREE.DirectionalLight(0xffffff, 0.7);
  ceilingLight.position.set(2, 5, 2);
  scene.add(ceilingLight);

  // =====================================================
  // 部屋（ホワイトキューブ風）
  // =====================================================
  const ROOM_SIZE = 12;
  const ROOM_HEIGHT = 4;
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.9,
    metalness: 0.0,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    roughness: 0.95,
    metalness: 0.0,
  });

  // 床
  const floorGeo = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // 壁（4枚）
  function createWall(width, height, position, rotationY) {
    const geo = new THREE.PlaneGeometry(width, height);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.copy(position);
    mesh.rotation.y = rotationY;
    scene.add(mesh);
    return mesh;
  }

  // Z+ 面（正面）
  const frontWall = createWall(
    ROOM_SIZE,
    ROOM_HEIGHT,
    new THREE.Vector3(0, ROOM_HEIGHT / 2, -ROOM_SIZE / 2),
    0
  );
  // Z- 面（背面）
  const backWall = createWall(
    ROOM_SIZE,
    ROOM_HEIGHT,
    new THREE.Vector3(0, ROOM_HEIGHT / 2, ROOM_SIZE / 2),
    Math.PI
  );
  // X+ 面（右）
  const rightWall = createWall(
    ROOM_SIZE,
    ROOM_HEIGHT,
    new THREE.Vector3(ROOM_SIZE / 2, ROOM_HEIGHT / 2, 0),
    -Math.PI / 2
  );
  // X- 面（左）
  const leftWall = createWall(
    ROOM_SIZE,
    ROOM_HEIGHT,
    new THREE.Vector3(-ROOM_SIZE / 2, ROOM_HEIGHT / 2, 0),
    Math.PI / 2
  );

  // =====================================================
  // 額縁 & 絵
  // =====================================================
  const textureLoader = new THREE.TextureLoader();
  const paintings = [];

  function createFrameWithPainting(work, wall, index, total) {
    const frameWidth = 1.4;
    const frameHeight = 1.8;
    const frameDepth = 0.08;

    // 額縁（枠）
    const frameGeo = new THREE.BoxGeometry(frameWidth, frameHeight, frameDepth);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x333333 + (work.id * 123456) % 0x222222,
      metalness: 0.3,
      roughness: 0.6,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);

    // 絵（少し前に出した平面）
    const paintingGeo = new THREE.PlaneGeometry(frameWidth * 0.86, frameHeight * 0.86);
    const paintingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0,
    });
    const paintingMesh = new THREE.Mesh(paintingGeo, paintingMat);
    paintingMesh.position.z = frameDepth / 2 + 0.001;
    frame.add(paintingMesh);

    // スポットライト
    const spot = new THREE.SpotLight(0xffffff, 1.3, 6, Math.PI / 4, 0.3, 1);
    spot.castShadow = false;
    spot.target = frame;
    scene.add(spot);
    scene.add(spot.target);

    // 壁の上で等間隔配置
    const margin = 1.0;
    const usableWidth = ROOM_SIZE - margin * 2;
    const step = usableWidth / (total + 1);
    const offsetX = -usableWidth / 2 + step * (index + 1);

    // 正面の壁にだけ飾る
    frame.position.set(
      offsetX,
      ROOM_HEIGHT * 0.55,
      frontWall.position.z + 0.01
    );

    frame.rotation.y = 0;
    paintingMesh.rotation.y = 0;

    // スポットの位置
    spot.position.set(
      frame.position.x,
      ROOM_HEIGHT - 0.2,
      frame.position.z + 0.4
    );

    scene.add(frame);

    // テクスチャ読み込み
    if (work.image) {
      textureLoader.load(
        work.image,
        (tex) => {
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          paintingMat.map = tex;
          paintingMat.needsUpdate = true;
        },
        undefined,
        (err) => {
          console.error('画像読み込み失敗: ', work.image, err);
        }
      );
    }

    paintings.push({ frame, painting: paintingMesh, spotlight: spot });
  }

  const works = (window.WORKS || []).slice(0, 12); // ひとまず12枚まで
  works.forEach((w, i) => {
    createFrameWithPainting(w, frontWall, i, works.length);
  });

  // =====================================================
  // アバター生成
  // =====================================================
  function createHumanMaterial(colorHex) {
    return new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.6,
      metalness: 0.1,
    });
  }

  function createHumanAvatar() {
    const group = new THREE.Group();

    // 体
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.6, 24);
    const bodyMat = createHumanMaterial(0x0044aa);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = false;
    body.receiveShadow = false;
    body.position.y = 0.8;
    group.add(body);

    // 頭
    const headGeo = new THREE.SphereGeometry(0.38, 24, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xd7b28c,
      roughness: 0.8,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.8 + 0.9;
    group.add(head);

    // 髪
    const hairGeo = new THREE.SphereGeometry(0.39, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.4);
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.5,
      metalness: 0.1,
    });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.copy(head.position);
    group.add(hair);

    // 足
    const footGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.25, 16);
    const footMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.7,
    });
    const footL = new THREE.Mesh(footGeo, footMat);
    const footR = new THREE.Mesh(footGeo, footMat);
    footL.position.set(-0.13, 0.13, 0);
    footR.position.set(0.13, 0.13, 0);
    group.add(footL, footR);

    return group;
  }

  function createDogAvatar() {
    const group = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.2, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x996633,
      roughness: 0.7,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.4, 20, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xaa7744,
      roughness: 0.7,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.6 + 0.6;
    group.add(head);

    const earGeo = new THREE.BoxGeometry(0.12, 0.3, 0.06);
    const earMat = headMat;
    const earL = new THREE.Mesh(earGeo, earMat);
    const earR = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.25, head.position.y + 0.05, 0);
    earR.position.set(0.25, head.position.y + 0.05, 0);
    group.add(earL, earR);

    const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.35, 10);
    const legMat = bodyMat;
    const legPositions = [
      [-0.18, 0.18, 0.18],
      [0.18, 0.18, 0.18],
      [-0.18, 0.18, -0.18],
      [0.18, 0.18, -0.18],
    ];
    legPositions.forEach((p) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(p[0], p[1], p[2]);
      group.add(leg);
    });

    return group;
  }

  let avatar = createHumanAvatar();
  avatar.position.set(0, 0, ROOM_SIZE * 0.15);
  scene.add(avatar);

  let currentAvatarType = 'human';

  function switchAvatar(type) {
    if (type === currentAvatarType) return;

    const pos = avatar.position.clone();
    const rotY = avatar.rotation.y;

    scene.remove(avatar);
    if (type === 'dog') {
      avatar = createDogAvatar();
    } else {
      avatar = createHumanAvatar();
    }
    avatar.position.copy(pos);
    avatar.rotation.y = rotY;
    scene.add(avatar);

    currentAvatarType = type;

    if (btnHuman && btnDog) {
      if (type === 'human') {
        btnHuman.classList.add('active');
        btnDog.classList.remove('active');
      } else {
        btnDog.classList.add('active');
        btnHuman.classList.remove('active');
      }
    }
  }

  if (btnHuman) {
    btnHuman.addEventListener('click', () => {
      switchAvatar('human');
    });
  }
  if (btnDog) {
    btnDog.addEventListener('click', () => {
      switchAvatar('dog');
    });
  }

  // =====================================================
  // カメラ制御（アバター追従 & ドラッグ視点）
  // =====================================================
  let yaw = 0;         // 左右向き
  let pitch = 0.2;     // 上下向き
  const PITCH_LIMIT = Math.PI / 3;

  let isDragging = false;
  let lastDragX = 0;
  let lastDragY = 0;

  function onPointerDown(e) {
    isDragging = true;
    lastDragX = e.touches ? e.touches[0].clientX : e.clientX;
    lastDragY = e.touches ? e.touches[0].clientY : e.clientY;
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = x - lastDragX;
    const dy = y - lastDragY;
    lastDragX = x;
    lastDragY = y;

    const rotSpeed = 0.005;
    yaw -= dx * rotSpeed;
    pitch -= dy * rotSpeed;
    if (pitch > PITCH_LIMIT) pitch = PITCH_LIMIT;
    if (pitch < -PITCH_LIMIT) pitch = -PITCH_LIMIT;
  }

  function onPointerUp() {
    isDragging = false;
  }

  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  canvas.addEventListener('touchstart', onPointerDown, { passive: true });
  canvas.addEventListener('touchmove', onPointerMove, { passive: true });
  window.addEventListener('touchend', onPointerUp);

  function updateCamera() {
    const distance = 3.4;
    const height = 1.6;

    const offset = new THREE.Vector3(
      Math.sin(yaw) * distance,
      height,
      Math.cos(yaw) * distance
    );

    const target = new THREE.Vector3(
      avatar.position.x,
      avatar.position.y + 1.0,
      avatar.position.z
    );

    camera.position.copy(target).add(offset);
    camera.lookAt(target.x, target.y + Math.tan(pitch), target.z);
  }

  // =====================================================
  // ジョイスティック制御
  // =====================================================
  const joystickState = {
    active: false,
    dirX: 0,
    dirY: 0,
  };

  function getJoystickCenter() {
    const rect = joyBg.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      radius: rect.width / 2,
    };
  }

  function handleJoystickStart(e) {
    e.preventDefault();
    joystickState.active = true;

    const point = e.touches ? e.touches[0] : e;
    const center = getJoystickCenter();
    updateJoystick(point.clientX, point.clientY, center);
  }

  function handleJoystickMove(e) {
    if (!joystickState.active) return;
    e.preventDefault();

    const point = e.touches ? e.touches[0] : e;
    const center = getJoystickCenter();
    updateJoystick(point.clientX, point.clientY, center);
  }

  function handleJoystickEnd(e) {
    joystickState.active = false;
    joystickState.dirX = 0;
    joystickState.dirY = 0;
    if (joyStick) {
      joyStick.style.transform = 'translate3d(0, 0, 0)';
    }
  }

  function updateJoystick(clientX, clientY, center) {
    const dx = clientX - center.x;
    const dy = clientY - center.y;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = center.radius;
    const clampedDist = Math.min(dist, maxDist);

    const nx = dx / (maxDist || 1);
    const ny = dy / (maxDist || 1);

    // ここで上下左右の方向を決定
    joystickState.dirX = nx;       // 左右移動
    joystickState.dirY = -ny;      // 上方向が前進

    const angle = Math.atan2(dy, dx);
    const stickX = Math.cos(angle) * clampedDist;
    const stickY = Math.sin(angle) * clampedDist;

    if (joyStick) {
      joyStick.style.transform =
        'translate3d(' + stickX + 'px,' + stickY + 'px,0)';
    }
  }

  if (joyBg && joyStick && joyContainer) {
    joyBg.addEventListener('mousedown', handleJoystickStart);
    window.addEventListener('mousemove', handleJoystickMove);
    window.addEventListener('mouseup', handleJoystickEnd);

    joyBg.addEventListener('touchstart', handleJoystickStart, { passive: false });
    window.addEventListener('touchmove', handleJoystickMove, { passive: false });
    window.addEventListener('touchend', handleJoystickEnd);
    window.addEventListener('touchcancel', handleJoystickEnd);
  }

  // =====================================================
  // 移動処理
  // =====================================================
  const moveVelocity = new THREE.Vector3();
  const forwardVec = new THREE.Vector3();
  const rightVec = new THREE.Vector3();

  function updateMovement(delta) {
    const accel = 4.0; // 速度
    const damping = 8.0;

    // ジョイスティック入力をワールド方向に変換
    forwardVec.set(Math.sin(yaw), 0, Math.cos(yaw));
    rightVec.set(forwardVec.z, 0, -forwardVec.x); // 右向きベクトル

    const inputForward = joystickState.dirY || 0;
    const inputRight = joystickState.dirX || 0;

    if (joystickState.active && (inputForward !== 0 || inputRight !== 0)) {
      const moveDir = new THREE.Vector3();
      moveDir
        .addScaledVector(forwardVec, inputForward)
        .addScaledVector(rightVec, inputRight);
      if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        moveVelocity.addScaledVector(moveDir, accel * delta);
      }
      // アバター向きも進行方向に
      avatar.rotation.y = Math.atan2(moveDir.x, moveDir.z);
