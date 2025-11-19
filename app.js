// app.js
// TAF DOG MUSEUM 3D ギャラリー（フレーム付き＆視点調整版）

(() => {
  'use strict';

  // ======================
  // 基本セットアップ
  // ======================
  const WORKS =
    (window.WORKS && Array.isArray(window.WORKS)) ? window.WORKS : [];
  const canvas = document.getElementById('scene');

  // デバッグ表示
  const dbg = document.createElement('div');
  dbg.id = 'debug-info';
  dbg.textContent = 'INIT...';
  dbg.style.position = 'fixed';
  dbg.style.left = '8px';
  dbg.style.top = '8px';
  dbg.style.padding = '4px 8px';
  dbg.style.fontSize = '10px';
  dbg.style.background = 'rgba(0,0,0,0.6)';
  dbg.style.color = '#fff';
  dbg.style.zIndex = '9999';
  document.body.appendChild(dbg);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111116);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 4, 10);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const clock = new THREE.Clock();

  // ルーム寸法
  const ROOM_WIDTH = 20;
  const ROOM_DEPTH = 14;
  const ROOM_HEIGHT = 5;

  // ======================
  // ライト
  // ======================
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.7);
  mainLight.position.set(10, 15, 10);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(2048, 2048);
  scene.add(mainLight);

  // ======================
  // 床・壁
  // ======================
  function createRoom() {
    // 床
    const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0xdddddd });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 天井
    const ceilGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    const ceilMat = new THREE.MeshPhongMaterial({ color: 0xf4f4f4 });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = ROOM_HEIGHT;
    scene.add(ceil);

    // 壁
    const wallMat = new THREE.MeshPhongMaterial({ color: 0xe5e5e8 });
    const wallGeoW = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
    const wallGeoD = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);

    const wallFront = new THREE.Mesh(wallGeoW, wallMat);
    wallFront.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
    scene.add(wallFront);

    const wallBack = new THREE.Mesh(wallGeoW, wallMat);
    wallBack.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
    wallBack.rotation.y = Math.PI;
    scene.add(wallBack);

    const wallLeft = new THREE.Mesh(wallGeoD, wallMat);
    wallLeft.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    wallLeft.rotation.y = Math.PI / 2;
    scene.add(wallLeft);

    const wallRight = new THREE.Mesh(wallGeoD, wallMat);
    wallRight.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    wallRight.rotation.y = -Math.PI / 2;
    scene.add(wallRight);
  }

  createRoom();

  // ======================
  // アート（額装＋スポットライト）
  // ======================
  const textureLoader = new THREE.TextureLoader();
  let loadOk = 0;
  let loadNg = 0;

  function updateDebug() {
    dbg.textContent =
      `WORKS: ${WORKS.length}  loaded: ${loadOk}  error: ${loadNg}`;
  }
  updateDebug();

  function createFrame(texture, position, rotationY) {
    const frameWidth = 2.0;
    const frameHeight = 2.6;
    const frameDepth = 0.12;

    // テクスチャ設定
    if (texture) {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }

    const materials = [
      new THREE.MeshPhongMaterial({ color: 0x111111 }), // right
      new THREE.MeshPhongMaterial({ color: 0x111111 }), // left
      new THREE.MeshPhongMaterial({ color: 0x111111 }), // top
      new THREE.MeshPhongMaterial({ color: 0x111111 }), // bottom
      texture
        ? new THREE.MeshPhongMaterial({ map: texture })
        : new THREE.MeshPhongMaterial({ color: 0x333333 }),
      new THREE.MeshPhongMaterial({ color: 0x111111 })  // back
    ];

    const geo = new THREE.BoxGeometry(frameWidth, frameHeight, frameDepth);
    const frame = new THREE.Mesh(geo, materials);
    frame.position.copy(position);
    frame.rotation.y = rotationY;
    frame.castShadow = true;
    frame.receiveShadow = true;
    scene.add(frame);

    // スポットライト（上から当てる）
    const spot = new THREE.SpotLight(0xffffff, 0.8, 10, Math.PI / 5, 0.4, 1);
    spot.position.set(
      position.x,
      position.y + 1.3,
      position.z + (Math.cos(rotationY) * 0.8) - (Math.sin(rotationY) * 0.8)
    );
    spot.target = frame;
    spot.castShadow = true;
    scene.add(spot);
    scene.add(spot.target);
  }

  function layoutArtworks() {
    if (!WORKS.length) return;

    const total = WORKS.length;
    const perWall = Math.ceil(total / 4);

    const frontZ = -ROOM_DEPTH / 2 + 0.05;
    const backZ = ROOM_DEPTH / 2 - 0.05;
    const leftX = -ROOM_WIDTH / 2 + 0.05;
    const rightX = ROOM_WIDTH / 2 - 0.05;

    const frontLen = ROOM_WIDTH - 4;
    const sideLen = ROOM_DEPTH - 4;

    const frontStep = perWall > 1 ? frontLen / (perWall - 1) : 0;
    const sideStep = perWall > 1 ? sideLen / (perWall - 1) : 0;

    WORKS.forEach((work, i) => {
      const imgPath =
        work.img || work.image || work.src || work.url || work.path;
      if (!imgPath) return;

      const wallIndex = Math.floor(i / perWall);
      const indexOnWall = i % perWall;

      const h = 2.0;
      let pos = new THREE.Vector3();
      let rotY = 0;

      switch (wallIndex) {
        case 0: { // 前
          const startX = -frontLen / 2;
          pos.set(startX + frontStep * indexOnWall, h, frontZ);
          rotY = 0;
          break;
        }
        case 1: { // 右
          const startZ = -sideLen / 2;
          pos.set(rightX, h, startZ + sideStep * indexOnWall);
          rotY = -Math.PI / 2;
          break;
        }
        case 2: { // 後ろ
          const startX = frontLen / 2;
          pos.set(startX - frontStep * indexOnWall, h, backZ);
          rotY = Math.PI;
          break;
        }
        default: { // 左
          const startZ = sideLen / 2;
          pos.set(leftX, h, startZ - sideStep * indexOnWall);
          rotY = Math.PI / 2;
          break;
        }
      }

      textureLoader.load(
        imgPath,
        (tex) => {
          loadOk++;
          updateDebug();
          createFrame(tex, pos, rotY);
        },
        undefined,
        () => {
          loadNg++;
          updateDebug();
          createFrame(null, pos, rotY); // 失敗時は黒フレームだけ
        }
      );
    });
  }

  layoutArtworks();

  // ======================
  // アバター
  // ======================
  let avatarGroup = null;
  let avatarType = 'human'; // 'human' or 'dog'

  function clearAvatar() {
    if (!avatarGroup) return;
    scene.remove(avatarGroup);
    avatarGroup.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose && m.dispose());
        } else if (obj.material && obj.material.dispose) {
          obj.material.dispose();
        }
      }
    });
    avatarGroup = null;
  }

  function createHumanAvatar() {
    const group = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.6, 0.6, 2.0, 24);
    const colors = [0x2166ac, 0x8c510a, 0x5c3566, 0x1a9850];
    const bodyMat = new THREE.MeshPhongMaterial({
      color: colors[Math.floor(Math.random() * colors.length)]
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.position.y = 1.0;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.7, 24, 16);
    const headMat = new THREE.MeshPhongMaterial({ color: 0xf1c27d });
    const head = new THREE.Mesh(headGeo, headMat);
    head.castShadow = true;
    head.position.y = 2.1;
    group.add(head);

    const footGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16);
    const footMat = new THREE.MeshPhongMaterial({ color: 0x222222 });

    const leftFoot = new THREE.Mesh(footGeo, footMat);
    leftFoot.position.set(-0.25, 0.1, 0.2);
    leftFoot.castShadow = true;
    group.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, footMat);
    rightFoot.position.set(0.25, 0.1, 0.2);
    rightFoot.castShadow = true;
    group.add(rightFoot);

    group.position.set(0, 0, 4);
    group.rotation.y = Math.PI;

    return group;
  }

  function createDogAvatar() {
    const group = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(1.4, 0.8, 2.0);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x8d5a2b });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.position.y = 0.6;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.6, 20, 16);
    const headMat = new THREE.MeshPhongMaterial({ color: 0x8d5a2b });
    const head = new THREE.Mesh(headGeo, headMat);
    head.castShadow = true;
    head.position.set(0, 1.1, 0.9);
    group.add(head);

    const earGeo = new THREE.BoxGeometry(0.2, 0.4, 0.1);
    const earMat = new THREE.MeshPhongMaterial({ color: 0x5b3b1a });
    const earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.35, 1.4, 0.8);
    earL.castShadow = true;
    group.add(earL);
    const earR = earL.clone();
    earR.position.x *= -1;
    group.add(earR);

    const legGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 12);
    const legMat = new THREE.MeshPhongMaterial({ color: 0x4a2d13 });

    const legPositions = [
      [-0.4, 0.3, 0.7],
      [0.4, 0.3, 0.7],
      [-0.4, 0.3, -0.7],
      [0.4, 0.3, -0.7]
    ];

    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.castShadow = true;
      leg.position.set(x, y, z);
      group.add(leg);
    });

    group.position.set(0, 0, 4);
    group.rotation.y = Math.PI;

    return group;
  }

  // 視点オフセット（目線を高め・遠めに）
  function getCameraOffset() {
    if (avatarType === 'dog') {
      return new THREE.Vector3(0, 2.2, 5.5);
    }
    return new THREE.Vector3(0, 3.0, 6.0);
  }

  function setAvatar(type) {
    avatarType = type;
    clearAvatar();
    avatarGroup = (type === 'dog') ? createDogAvatar() : createHumanAvatar();
    scene.add(avatarGroup);
    updateAvatarButtons();
  }

  const btnHuman = document.getElementById('btn-human');
  const btnDog = document.getElementById('btn-dog');

  function updateAvatarButtons() {
    if (!btnHuman || !btnDog) return;
    if (avatarType === 'human') {
      btnHuman.classList.add('active');
      btnDog.classList.remove('active');
    } else {
      btnDog.classList.add('active');
      btnHuman.classList.remove('active');
    }
  }

  if (btnHuman) btnHuman.addEventListener('click', () => setAvatar('human'));
  if (btnDog) btnDog.addEventListener('click', () => setAvatar('dog'));

  setAvatar('human'); // 初期アバター

  // ======================
  // 視線ドラッグ
  // ======================
  let isDraggingView = false;
  let lastPointerX = 0;

  function onPointerDownView(e) {
    isDraggingView = true;
    lastPointerX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
  }

  function onPointerMoveView(e) {
    if (!isDraggingView || !avatarGroup) return;
    const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const dx = x - lastPointerX;
    lastPointerX = x;
    const rotateSpeed = 0.004;
    avatarGroup.rotation.y -= dx * rotateSpeed;
  }

  function onPointerUpView() {
    isDraggingView = false;
  }

  canvas.addEventListener('mousedown', onPointerDownView);
  canvas.addEventListener('mousemove', onPointerMoveView);
  canvas.addEventListener('mouseup', onPointerUpView);
  canvas.addEventListener('mouseleave', onPointerUpView);

  canvas.addEventListener('touchstart', onPointerDownView, { passive: false });
  canvas.addEventListener('touchmove', onPointerMoveView, { passive: false });
  canvas.addEventListener('touchend', onPointerUpView);
  canvas.addEventListener('touchcancel', onPointerUpView);

  // ======================
  // ジョイスティック
  // ======================
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');

  let joyActive = false;
  let joyVector = { x: 0, y: 0 };

  function setJoyStickPosition(dx, dy) {
    if (!joyBg || !joyStick) return;
    const r = joyBg.clientWidth / 2;
    const len = Math.sqrt(dx * dx + dy * dy);
    const max = r;
    const scale = len > max ? max / len : 1;
    const px = dx * scale;
    const py = dy * scale;
    joyStick.style.transform = `translate(${px}px, ${py}px)`;
  }

  function handleJoyPointerDown(e) {
    if (!joyBg || !joyStick) return;
    joyActive = true;

    const rect = joyBg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    const dx = clientX - cx;
    const dy = clientY - cy;

    const r = rect.width / 2;
    joyVector.x = dx / r;
    joyVector.y = dy / r;

    setJoyStickPosition(dx, dy);
    e.preventDefault();
  }

  function handleJoyPointerMove(e) {
    if (!joyActive || !joyBg || !joyStick) return;

    const rect = joyBg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    const dx = clientX - cx;
    const dy = clientY - cy;

    const r = rect.width / 2;
    joyVector.x = dx / r;
    joyVector.y = dy / r;

    setJoyStickPosition(dx, dy);
    e.preventDefault();
  }

  function handleJoyPointerUp() {
    joyActive = false;
    joyVector.x = 0;
    joyVector.y = 0;
    setJoyStickPosition(0, 0);
  }

  if (joyBg) {
    joyBg.addEventListener('mousedown', handleJoyPointerDown);
    window.addEventListener('mousemove', handleJoyPointerMove);
    window.addEventListener('mouseup', handleJoyPointerUp);

    joyBg.addEventListener('touchstart', handleJoyPointerDown, { passive: false });
    window.addEventListener('touchmove', handleJoyPointerMove, { passive: false });
    window.addEventListener('touchend', handleJoyPointerUp);
    window.addEventListener('touchcancel', handleJoyPointerUp);
  }

  // ======================
  // 移動 & カメラ
  // ======================
  function updateMovement(delta) {
    if (!avatarGroup) return;

    const speed = 4.0;
    const forward = -joyVector.y;
    const strafe = -joyVector.x; // ← 左右を反転

    if (Math.abs(forward) < 0.01 && Math.abs(strafe) < 0.01) return;

    const yaw = avatarGroup.rotation.y;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);

    const worldX = strafe * cos - forward * sin;
    const worldZ = strafe * sin + forward * cos;

    avatarGroup.position.x += worldX * speed * delta;
    avatarGroup.position.z += worldZ * speed * delta;

    const margin = 1.5;
    const limitX = ROOM_WIDTH / 2 - margin;
    const limitZ = ROOM_DEPTH / 2 - margin;
    avatarGroup.position.x = Math.max(-limitX, Math.min(limitX, avatarGroup.position.x));
    avatarGroup.position.z = Math.max(-limitZ, Math.min(limitZ, avatarGroup.position.z));
  }

  function updateCamera() {
    if (!avatarGroup) return;

    const offset = getCameraOffset();
    const yaw = avatarGroup.rotation.y;

    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);

    const ox = offset.x * cos - offset.z * sin;
    const oz = offset.x * sin + offset.z * cos;

    camera.position.set(
      avatarGroup.position.x - ox,
      avatarGroup.position.y + offset.y,
      avatarGroup.position.z - oz
    );

    const lookTarget = new THREE.Vector3(
      avatarGroup.position.x,
      avatarGroup.position.y + (avatarType === 'dog' ? 0.8 : 1.6),
      avatarGroup.position.z
    );
    camera.lookAt(lookTarget);
  }

  // ======================
  // リサイズ & メインループ
  // ======================
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  function animate() {
    const delta = clock.getDelta();
    updateMovement(delta);
    updateCamera();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
})();
