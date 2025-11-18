// app.js
// THREE.js + window.WORKS を前提にした単体スクリプト

(() => {
  'use strict';

  // ===== DOM 取得 =====
  const canvas = document.getElementById('scene');
  const btnHuman = document.getElementById('btn-human');
  const btnDog = document.getElementById('btn-dog');
  const joyContainer = document.getElementById('joy-container');
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');

  const works = (window.WORKS || []).slice();

  // ===== Three.js 基本セットアップ =====
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  // ライト
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.6);
  mainLight.position.set(5, 10, 7);
  scene.add(mainLight);

  // ===== 部屋（白いギャラリー） =====
  const roomSize = 24;
  const wallHeight = 6;

  const roomMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.9,
    metalness: 0.0
  });

  // 床
  const floorGeo = new THREE.PlaneGeometry(roomSize, roomSize);
  const floor = new THREE.Mesh(floorGeo, roomMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);

  // 壁 4 面
  const wallGeo = new THREE.PlaneGeometry(roomSize, wallHeight);

  function makeWall() {
    const wall = new THREE.Mesh(wallGeo, roomMat);
    wall.position.y = wallHeight / 2;
    return wall;
  }

  const wallBack = makeWall();
  wallBack.position.z = -roomSize / 2;
  scene.add(wallBack);

  const wallFront = makeWall();
  wallFront.position.z = roomSize / 2;
  wallFront.rotation.y = Math.PI;
  scene.add(wallFront);

  const wallLeft = makeWall();
  wallLeft.position.x = -roomSize / 2;
  wallLeft.rotation.y = Math.PI / 2;
  scene.add(wallLeft);

  const wallRight = makeWall();
  wallRight.position.x = roomSize / 2;
  wallRight.rotation.y = -Math.PI / 2;
  scene.add(wallRight);

  // ===== 絵（1 面に等間隔で配置） =====
  const textureLoader = new THREE.TextureLoader();

  const paintingWidth = 2.2;
  const paintingHeight = 3.0;
  const paintingSpacing = 1.0;

  if (works.length > 0) {
    const totalWidth =
      works.length * paintingWidth + (works.length - 1) * paintingSpacing;
    const startX = -totalWidth / 2 + paintingWidth / 2;
    const wallZ = -roomSize / 2 + 0.02;

    works.forEach((work, index) => {
      const group = new THREE.Group();

      // 額
      const frameGeo = new THREE.BoxGeometry(
        paintingWidth + 0.3,
        paintingHeight + 0.3,
        0.15
      );
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.7
      });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      group.add(frame);

      // キャンバス
      const canvasGeo = new THREE.PlaneGeometry(
        paintingWidth,
        paintingHeight
      );
      const tex = textureLoader.load(work.image);
      tex.encoding = THREE.sRGBEncoding;
      const canvasMat = new THREE.MeshStandardMaterial({
        map: tex
      });
      const painting = new THREE.Mesh(canvasGeo, canvasMat);
      painting.position.z = 0.08;
      group.add(painting);

      // 壁面位置
      const x =
        startX + index * (paintingWidth + paintingSpacing);
      group.position.set(x, wallHeight * 0.55, wallZ);
      group.rotation.y = 0; // 壁に水平

      scene.add(group);

      // スポットライト
      const spot = new THREE.SpotLight(0xffffff, 0.9, 10, Math.PI / 6, 0.4);
      spot.position.set(x, wallHeight - 0.3, wallZ + 1.2);
      spot.target = group;
      scene.add(spot);
      scene.add(spot.target);
    });
  }

  // ===== アバター作成 =====
  function createHuman(color) {
    const group = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.6, 0.6, 3.0, 20);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: color || 0x0040ff
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.5;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.7, 24, 24);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xd1a171 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 3.3;
    group.add(head);

    const footGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.25, 12);
    const footMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const lf = new THREE.Mesh(footGeo, footMat);
    lf.position.set(-0.25, 0.125, 0.2);
    const rf = lf.clone();
    rf.position.x = 0.25;
    group.add(lf);
    group.add(rf);

    return { group, body };
  }

  function createDog() {
    const group = new THREE.Group();

    const bodyGeo = new THREE.CapsuleGeometry(0.5, 1.2, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xaa7733 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.z = Math.PI / 2;
    body.position.set(0, 0.7, 0);
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.5, 20, 20);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xaa8855 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0.6, 1.1, 0);
    group.add(head);

    const earGeo = new THREE.BoxGeometry(0.15, 0.4, 0.05);
    const earMat = new THREE.MeshStandardMaterial({ color: 0x553322 });
    const le = new THREE.Mesh(earGeo, earMat);
    le.position.set(0.7, 1.4, 0.15);
    const re = le.clone();
    re.position.z = -0.15;
    group.add(le);
    group.add(re);

    const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.5, 10);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x553322 });
    const l1 = new THREE.Mesh(legGeo, legMat);
    l1.position.set(0.2, 0.25, 0.2);
    const l2 = l1.clone();
    l2.position.z = -0.2;
    const l3 = l1.clone();
    l3.position.x = -0.4;
    const l4 = l3.clone();
    l4.position.z = -0.2;
    group.add(l1, l2, l3, l4);

    group.scale.set(0.9, 0.9, 0.9);

    return { group };
  }

  const human = createHuman(0x0040ff);
  const dog = createDog();

  scene.add(human.group);
  scene.add(dog.group);

  let currentAvatarType = 'human';
  let avatar = human.group;

  human.group.visible = true;
  dog.group.visible = false;

  // アバター初期位置（部屋の中央やや前）
  avatar.position.set(0, 0, roomSize / 2 - 4);

  // ===== カメラ制御（追従 + ドラッグ視点） =====
  let yaw = Math.PI; // 後ろ（奥の壁）を向く
  let pitch = 0;
  const cameraDistance = 5;
  const cameraHeight = 2.6;

  function updateCamera() {
    const offsetX = Math.sin(yaw) * cameraDistance;
    const offsetZ = Math.cos(yaw) * cameraDistance;

    camera.position.set(
      avatar.position.x - offsetX,
      avatar.position.y + cameraHeight + pitch * 0.5,
      avatar.position.z - offsetZ
    );

    const target = avatar.position.clone();
    target.y += 2.2;
    camera.lookAt(target);
  }

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    const rotSpeed = 0.005;
    yaw -= dx * rotSpeed;
    pitch -= dy * rotSpeed;

    const maxPitch = Math.PI / 4;
    if (pitch > maxPitch) pitch = maxPitch;
    if (pitch < -maxPitch) pitch = -maxPitch;
  });

  canvas.addEventListener('pointerup', (e) => {
    dragging = false;
    canvas.releasePointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointercancel', () => {
    dragging = false;
  });

  // ===== ジョイスティック制御 =====
  let moveX = 0; // 左右
  let moveY = 0; // 前後
  const moveSpeed = 0.08;

  let joyActiveId = null;
  let joyOriginX = 0;
  let joyOriginY = 0;
  let joyRadius = 0;

  function resetJoy() {
    moveX = 0;
    moveY = 0;
    if (joyStick) {
      joyStick.style.transform = 'translate3d(0,0,0)';
    }
    joyActiveId = null;
  }

  function initJoystick() {
    if (!joyBg || !joyStick || !joyContainer) return;

    const rect = joyBg.getBoundingClientRect();
    joyRadius = rect.width / 2;

    function onPointerDown(e) {
      joyActiveId = e.pointerId;
      const bgRect = joyBg.getBoundingClientRect();
      joyOriginX = bgRect.left + bgRect.width / 2;
      joyOriginY = bgRect.top + bgRect.height / 2;
      joyBg.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      if (joyActiveId === null || e.pointerId !== joyActiveId) return;

      const dx = e.clientX - joyOriginX;
      const dy = e.clientY - joyOriginY;

      // 半径内にクランプ
      let dist = Math.sqrt(dx * dx + dy * dy);
      let clampedX = dx;
      let clampedY = dy;
      if (dist > joyRadius) {
        const r = joyRadius / dist;
        clampedX *= r;
        clampedY *= r;
        dist = joyRadius;
      }

      joyStick.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;

      // -1〜1 に正規化（上が前、右が右）
      moveX = clampedX / joyRadius;
      moveY = -clampedY / joyRadius;
    }

    function onPointerUp(e) {
      if (joyActiveId !== null && e.pointerId === joyActiveId) {
        joyBg.releasePointerCapture(e.pointerId);
        resetJoy();
      }
    }

    joyBg.addEventListener('pointerdown', onPointerDown);
    joyBg.addEventListener('pointermove', onPointerMove);
    joyBg.addEventListener('pointerup', onPointerUp);
    joyBg.addEventListener('pointercancel', onPointerUp);
    joyBg.addEventListener('pointerleave', onPointerUp);
  }

  initJoystick();

  function updateMovement() {
    // ジョイスティックの入力をカメラの向きに合わせて変換
    if (moveX === 0 && moveY === 0) return;

    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3().crossVectors(
      forward,
      new THREE.Vector3(0, 1, 0)
    ).negate();

    const dir = new THREE.Vector3();
    dir.addScaledVector(forward, moveY);
    dir.addScaledVector(right, moveX);

    if (dir.lengthSq() > 0) {
      dir.normalize();
      avatar.position.addScaledVector(dir, moveSpeed);

      const half = roomSize / 2 - 1.0;
      avatar.position.x = THREE.MathUtils.clamp(
        avatar.position.x,
        -half,
        half
      );
      avatar.position.z = THREE.MathUtils.clamp(
        avatar.position.z,
        -half,
        half
      );
    }
  }

  // ===== アバターチェンジ =====
  function setAvatar(type) {
    if (type === currentAvatarType) return;

    if (type === 'human') {
      human.group.visible = true;
      dog.group.visible = false;
      avatar = human.group;
      currentAvatarType = 'human';
      btnHuman.classList.add('active');
      btnDog.classList.remove('active');
    } else if (type === 'dog') {
      human.group.visible = false;
      dog.group.visible = true;
      avatar = dog.group;
      currentAvatarType = 'dog';
      btnDog.classList.add('active');
      btnHuman.classList.remove('active');
    }

    // 位置は引き継ぐ
    avatar.position.copy(human.group.visible ? human.group.position : dog.group.position);
  }

  if (btnHuman) {
    btnHuman.addEventListener('click', () => {
      // 服の色をランダムで変える
      const colors = [0x0040ff, 0x8e44ad, 0x16a085, 0xe67e22];
      const col = colors[Math.floor(Math.random() * colors.length)];
      human.body.material.color.setHex(col);
      setAvatar('human');
    });
  }

  if (btnDog) {
    btnDog.addEventListener('click', () => {
      setAvatar('dog');
    });
  }

  // ===== リサイズ対応 =====
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  });

  // ===== メインループ =====
  function animate() {
    requestAnimationFrame(animate);
    updateMovement();
    updateCamera();
    renderer.render(scene, camera);
  }

  updateCamera();
  animate();
})();
