// app.js
(() => {
  'use strict';

  // ================================
  // DOM 取得
  // ================================
  const canvas = document.getElementById('scene');
  const btnHuman = document.getElementById('btn-human');
  const btnDog = document.getElementById('btn-dog');
  const joyContainer = document.getElementById('joy-container');
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');

  if (!canvas) {
    console.error('#scene が見つからない');
    return;
  }

  // ================================
  // Three.js 基本セットアップ
  // ================================
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const camera = new THREE.PerspectiveCamera(
    60,
    1,
    0.1,
    1000
  );

  function onResize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);
  onResize();

  const clock = new THREE.Clock();

  // ================================
  // ライティング
  // ================================
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(2, 5, 2);
  scene.add(dir);

  // ================================
  // 部屋（ホワイトキューブ）
  // ================================
  const ROOM_SIZE = 12;
  const ROOM_HEIGHT = 4;

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.95,
    metalness: 0.0,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    roughness: 0.98,
    metalness: 0.0,
  });

  // 床
  const floorGeo = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  function createWall(width, height, pos, rotY) {
    const g = new THREE.PlaneGeometry(width, height);
    const m = wallMat;
    const w = new THREE.Mesh(g, m);
    w.position.copy(pos);
    w.rotation.y = rotY;
    scene.add(w);
    return w;
  }

  const frontWall = createWall(
    ROOM_SIZE,
    ROOM_HEIGHT,
    new THREE.Vector3(0, ROOM_HEIGHT / 2, -ROOM_SIZE / 2),
    0
  );
  createWall(
    ROOM_SIZE,
    ROOM_HEIGHT,
    new THREE.Vector3(0, ROOM_HEIGHT / 2, ROOM_SIZE / 2),
    Math.PI
  );
  createWall(
    ROOM_SIZE,
    ROOM_HEIGHT,
    new THREE.Vector3(ROOM_SIZE / 2, ROOM_HEIGHT / 2, 0),
    -Math.PI / 2
  );
  createWall(
    ROOM_SIZE,
    ROOM_HEIGHT,
    new THREE.Vector3(-ROOM_SIZE / 2, ROOM_HEIGHT / 2, 0),
    Math.PI / 2
  );

  // ================================
  // 額縁 & 絵
  // ================================
  const texLoader = new THREE.TextureLoader();
  const paintings = [];

  function createPainting(work, index, total) {
    const frameW = 1.4;
    const frameH = 1.8;
    const frameD = 0.08;

    const frameGeo = new THREE.BoxGeometry(frameW, frameH, frameD);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x333333 + (work.id * 123457) % 0x202020,
      roughness: 0.6,
      metalness: 0.2,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);

    const artGeo = new THREE.PlaneGeometry(frameW * 0.86, frameH * 0.86);
    const artMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0,
    });
    const art = new THREE.Mesh(artGeo, artMat);
    art.position.z = frameD / 2 + 0.001;
    frame.add(art);

    // frontWall 上で等間隔
    const margin = 1.0;
    const usableW = ROOM_SIZE - margin * 2;
    const step = usableW / (total + 1);
    const x = -usableW / 2 + step * (index + 1);

    frame.position.set(
      x,
      ROOM_HEIGHT * 0.55,
      frontWall.position.z + 0.01
    );

    // スポットライト
    const spot = new THREE.SpotLight(0xffffff, 1.2, 6, Math.PI / 4, 0.4, 1);
    spot.position.set(
      frame.position.x,
      ROOM_HEIGHT - 0.1,
      frame.position.z + 0.4
    );
    spot.target = frame;
    scene.add(spot);
    scene.add(spot.target);

    scene.add(frame);

    // テクスチャ
    if (work.image) {
      texLoader.load(
        work.image,
        (tex) => {
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          artMat.map = tex;
          artMat.needsUpdate = true;
        },
        undefined,
        (err) => console.error('画像読み込み失敗', work.image, err)
      );
    }

    paintings.push({ frame, art, spot });
  }

  const works = (window.WORKS || []).slice(0, 20);
  works.forEach((w, i) => createPainting(w, i, works.length));

  // ================================
  // アバター
  // ================================
  function createHumanAvatar() {
    const g = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.6, 24);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0044aa,
      roughness: 0.6,
      metalness: 0.15,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    g.add(body);

    const headGeo = new THREE.SphereGeometry(0.38, 24, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xd7b28c,
      roughness: 0.8,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.7;
    g.add(head);

    const hairGeo = new THREE.SphereGeometry(0.39, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.5);
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.5,
    });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.copy(head.position);
    g.add(hair);

    const footGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.25, 16);
    const footMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.7,
    });
    const footL = new THREE.Mesh(footGeo, footMat);
    const footR = new THREE.Mesh(footGeo, footMat);
    footL.position.set(-0.13, 0.13, 0);
    footR.position.set(0.13, 0.13, 0);
    g.add(footL, footR);

    return g;
  }

  function createDogAvatar() {
    const g = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.2, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x996633,
      roughness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    g.add(body);

    const headGeo = new THREE.SphereGeometry(0.4, 20, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xaa7744,
      roughness: 0.7,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.2;
    g.add(head);

    const earGeo = new THREE.BoxGeometry(0.12, 0.3, 0.06);
    const earL = new THREE.Mesh(earGeo, headMat);
    const earR = new THREE.Mesh(earGeo, headMat);
    earL.position.set(-0.25, 1.35, 0);
    earR.position.set(0.25, 1.35, 0);
    g.add(earL, earR);

    const legGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.35, 10);
    const legMat = bodyMat;
    const legPos = [
      [-0.18, 0.18, 0.18],
      [0.18, 0.18, 0.18],
      [-0.18, 0.18, -0.18],
      [0.18, 0.18, -0.18],
    ];
    legPos.forEach((p) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(p[0], p[1], p[2]);
      g.add(leg);
    });

    return g;
  }

  let avatar = createHumanAvatar();
  avatar.position.set(0, 0, ROOM_SIZE * 0.15);
  scene.add(avatar);

  let currentAvatarType = 'human';

  function applyAvatarButtonState() {
    if (!btnHuman || !btnDog) return;
    if (currentAvatarType === 'human') {
      btnHuman.classList.add('active');
      btnDog.classList.remove('active');
    } else {
      btnDog.classList.add('active');
      btnHuman.classList.remove('active');
    }
  }

  function switchAvatar(type) {
    if (type === currentAvatarType) return;
    const pos = avatar.position.clone();
    const rotY = avatar.rotation.y;

    scene.remove(avatar);
    avatar = type === 'dog' ? createDogAvatar() : createHumanAvatar();
    avatar.position.copy(pos);
    avatar.rotation.y = rotY;
    scene.add(avatar);

    currentAvatarType = type;
    applyAvatarButtonState();
  }

  if (btnHuman) {
    btnHuman.addEventListener('click', (e) => {
      e.preventDefault();
      switchAvatar('human');
    });
  }
  if (btnDog) {
    btnDog.addEventListener('click', (e) => {
      e.preventDefault();
      switchAvatar('dog');
    });
  }
  applyAvatarButtonState();

  // ================================
  // カメラ制御（ドラッグで視線）
  // ================================
  let yaw = 0;
  let pitch = 0.2;
  const PITCH_LIMIT = Math.PI / 3;

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function onCamDown(ev) {
    dragging = true;
    if (ev.touches && ev.touches.length > 0) {
      lastX = ev.touches[0].clientX;
      lastY = ev.touches[0].clientY;
    } else {
      lastX = ev.clientX;
      lastY = ev.clientY;
    }
  }

  function onCamMove(ev) {
    if (!dragging) return;
    let x, y;
    if (ev.touches && ev.touches.length > 0) {
      x = ev.touches[0].clientX;
      y = ev.touches[0].clientY;
    } else {
      x = ev.clientX;
      y = ev.clientY;
    }
    const dx = x - lastX;
    const dy = y - lastY;
    lastX = x;
    lastY = y;

    const rotSpeed = 0.005;
    yaw -= dx * rotSpeed;
    pitch -= dy * rotSpeed;
    if (pitch > PITCH_LIMIT) pitch = PITCH_LIMIT;
    if (pitch < -PITCH_LIMIT) pitch = -PITCH_LIMIT;
  }

  function onCamUp() {
    dragging = false;
  }

  canvas.addEventListener('mousedown', onCamDown);
  window.addEventListener('mousemove', onCamMove);
  window.addEventListener('mouseup', onCamUp);

  canvas.addEventListener('touchstart', onCamDown, { passive: true });
  window.addEventListener('touchmove', onCamMove, { passive: true });
  window.addEventListener('touchend', onCamUp);
  window.addEventListener('touchcancel', onCamUp);

  function updateCamera() {
    const dist = 3.5;
    const height = 1.6;

    const offset = new THREE.Vector3(
      Math.sin(yaw) * dist,
      height,
      Math.cos(yaw) * dist
    );

    const target = new THREE.Vector3(
      avatar.position.x,
      avatar.position.y + 1.0,
      avatar.position.z
    );

    camera.position.copy(target).add(offset);
    camera.lookAt(
      target.x,
      target.y + Math.tan(pitch),
      target.z
    );
  }

  // ================================
  // ジョイスティック
  // ================================
  const joystick = {
    active: false,
    dx: 0,
    dy: 0,
  };

  function getJoyCenter() {
    const rect = joyBg.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      radius: rect.width / 2,
    };
  }

  function joyStart(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    joystick.active = true;

    const p = ev.touches ? ev.touches[0] : ev;
    const c = getJoyCenter();
    joyMoveInternal(p.clientX, p.clientY, c);
  }

  function joyMove(ev) {
    if (!joystick.active) return;
    ev.preventDefault();
    ev.stopPropagation();

    const p = ev.touches ? ev.touches[0] : ev;
    const c = getJoyCenter();
    joyMoveInternal(p.clientX, p.clientY, c);
  }

  function joyEnd(ev) {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    joystick.active = false;
    joystick.dx = 0;
    joystick.dy = 0;
    if (joyStick) {
      joyStick.style.transform = 'translate3d(0,0,0)';
    }
  }

  function joyMoveInternal(x, y, c) {
    const dx = x - c.x;
    const dy = y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = c.radius;
    const clamped = Math.min(dist, maxDist || 1);

    const nx = dx / (maxDist || 1);
    const ny = dy / (maxDist || 1);

    // 前＝上方向 に倒すと前進
    joystick.dx = nx;     // 左右
    joystick.dy = -ny;    // 上で +、下で -

    const angle = Math.atan2(dy, dx);
    const stickX = Math.cos(angle) * clamped;
    const stickY = Math.sin(angle) * clamped;

    if (joyStick) {
      joyStick.style.transform =
        `translate3d(${stickX}px, ${stickY}px, 0)`;
    }
  }

  if (joyBg && joyStick && joyContainer) {
    joyBg.addEventListener('mousedown', joyStart);
    joyBg.addEventListener('touchstart', joyStart, { passive: false });

    window.addEventListener('mousemove', joyMove);
    window.addEventListener('touchmove', joyMove, { passive: false });

    window.addEventListener('mouseup', joyEnd);
    window.addEventListener('touchend', joyEnd);
    window.addEventListener('touchcancel', joyEnd);
  }

  // ================================
  // 移動処理
  // ================================
  const moveVel = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  function updateMovement(delta) {
    const accel = 4.0;
    const damping = 8.0;

    forward.set(Math.sin(yaw), 0, Math.cos(yaw));
    right.set(forward.z, 0, -forward.x);

    const inF = joystick.dy;
    const inR = joystick.dx;

    if (joystick.active && (inF !== 0 || inR !== 0)) {
      const dirVec = new THREE.Vector3();
      dirVec
        .addScaledVector(forward, inF)
        .addScaledVector(right, inR);
      if (dirVec.lengthSq() > 0) {
        dirVec.normalize();
        moveVel.addScaledVector(dirVec, accel * delta);
        avatar.rotation.y = Math.atan2(dirVec.x, dirVec.z);
      }
    } else {
      // 減速
      moveVel.multiplyScalar(Math.max(0, 1 - damping * delta));
    }

    avatar.position.addScaledVector(moveVel, delta);

    const margin = 1.0;
    const half = ROOM_SIZE / 2 - margin;
    avatar.position.x = Math.max(-half, Math.min(half, avatar.position.x));
    avatar.position.z = Math.max(-half, Math.min(half, avatar.position.z));
  }

  // ================================
  // メインループ
  // ================================
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    updateMovement(delta);
    updateCamera();

    renderer.render(scene, camera);
  }

  updateCamera();
  animate();
})();
