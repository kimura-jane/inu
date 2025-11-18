// app.js

(() => {
  // ========= DOM 取得 =========
  const canvas =
    document.querySelector('#webgl') ||
    document.querySelector('canvas') ||
    undefined;

  // アバター切り替えボタン（IDが違ってもテキストで拾うフォールバック付き）
  const avatarHumanBtn =
    document.getElementById('avatar-human') ||
    document.querySelector('[data-avatar="human"]') ||
    Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent.trim().includes('人間')
    );

  const avatarDogBtn =
    document.getElementById('avatar-dog') ||
    document.querySelector('[data-avatar="dog"]') ||
    Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent.trim().includes('犬')
    );

  // ジョイスティック
  const joystickBase =
    document.getElementById('joystick-base') ||
    document.querySelector('.joystick-base') ||
    document.querySelector('.joystick');

  const joystickStick =
    document.getElementById('joystick-stick') ||
    document.querySelector('.joystick-stick') ||
    (joystickBase ? joystickBase.firstElementChild : null);

  // ========= Three.js 基本セットアップ =========
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101012);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  scene.add(camera);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // ========= ライティング =========
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.7);
  mainLight.position.set(10, 20, 10);
  scene.add(mainLight);

  // ========= ギャラリールーム =========
  const room = new THREE.Group();
  scene.add(room);

  const ROOM_WIDTH = 26;
  const ROOM_DEPTH = 14;
  const ROOM_HEIGHT = 5;

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xf4f4f4,
    roughness: 0.7,
    metalness: 0.0,
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xe0e0e0,
    roughness: 0.9,
    metalness: 0.0,
  });

  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0xfafafa,
    roughness: 0.9,
    metalness: 0.0,
  });

  // 床
  const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  const floor = new THREE.Mesh(floorGeo, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  room.add(floor);

  // 天井
  const ceilGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  const ceiling = new THREE.Mesh(ceilGeo, ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM_HEIGHT;
  room.add(ceiling);

  // 壁（前・後・左右）
  const wallGeoFrontBack = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
  const wallGeoSide = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);

  const wallFront = new THREE.Mesh(wallGeoFrontBack, wallMaterial);
  wallFront.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
  room.add(wallFront);

  const wallBack = new THREE.Mesh(wallGeoFrontBack, wallMaterial);
  wallBack.rotation.y = Math.PI;
  wallBack.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
  room.add(wallBack);

  const wallLeft = new THREE.Mesh(wallGeoSide, wallMaterial);
  wallLeft.rotation.y = Math.PI / 2;
  wallLeft.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  room.add(wallLeft);

  const wallRight = new THREE.Mesh(wallGeoSide, wallMaterial);
  wallRight.rotation.y = -Math.PI / 2;
  wallRight.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  room.add(wallRight);

  // ========= 額装された作品 =========
  const textureLoader = new THREE.TextureLoader();
  const framesGroup = new THREE.Group();
  room.add(framesGroup);

  const works = (typeof WORKS !== 'undefined' && WORKS) || [];

  const maxAniso = renderer.capabilities.getMaxAnisotropy?.() || 1;

  const frameCount = works.length || 12;
  const spacing = (ROOM_WIDTH - 6) / (frameCount - 1); // 余白込み
  const startX = -ROOM_WIDTH / 2 + 3;

  works.forEach((work, index) => {
    const frameGroup = new THREE.Group();

    // 額のベース
    const frameOuterGeo = new THREE.BoxGeometry(1.8, 2.6, 0.12);
    const frameOuterMat = new THREE.MeshStandardMaterial({
      color: 0x3b3b3b,
      metalness: 0.3,
      roughness: 0.5,
    });
    const frameOuter = new THREE.Mesh(frameOuterGeo, frameOuterMat);
    frameGroup.add(frameOuter);

    // 内側の縁
    const frameInnerGeo = new THREE.BoxGeometry(1.6, 2.4, 0.08);
    const frameInnerMat = new THREE.MeshStandardMaterial({
      color: 0xd8c9a6,
      metalness: 0.1,
      roughness: 0.8,
    });
    const frameInner = new THREE.Mesh(frameInnerGeo, frameInnerMat);
    frameInner.position.z = 0.02;
    frameGroup.add(frameInner);

    // 作品テクスチャ
    const imageUrl = work.image;
    const tex = textureLoader.load(imageUrl || '', (t) => {
      t.encoding = THREE.sRGBEncoding;
      t.anisotropy = maxAniso;
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
    });

    const artGeo = new THREE.PlaneGeometry(1.4, 2.1);
    const artMat = new THREE.MeshBasicMaterial({ map: tex });
    const art = new THREE.Mesh(artGeo, artMat);
    art.position.z = 0.07;
    frameGroup.add(art);

    // スポットライト
    const spot = new THREE.SpotLight(0xffffff, 1.6, 8, Math.PI / 5, 0.4, 1.5);
    const spotTarget = new THREE.Object3D();
    frameGroup.add(spot);
    frameGroup.add(spotTarget);
    spotTarget.position.set(0, 0, 0.1);
    spot.target = spotTarget;

    spot.position.set(0, 1.4, 0.7);

    // 小さなスポットの筐体
    const lampGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.28, 16);
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.7,
      roughness: 0.2,
    });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.rotation.x = -Math.PI / 2.8;
    lamp.position.copy(spot.position);
    frameGroup.add(lamp);

    // 壁への配置（右側の壁）
    const x = startX + spacing * index;
    frameGroup.position.set(x, 2.2, -ROOM_DEPTH / 2 + 0.02);
    // 壁に対して水平に
    // （右の壁に並べたければ rotation.y = -Math.PI/2 などで変える）
    // ここでは「正面の壁」に揃えているので回転不要

    framesGroup.add(frameGroup);
  });

  // ========= アバター =========
  const avatarRoot = new THREE.Group();
  scene.add(avatarRoot);

  const humanAvatar = new THREE.Group();
  const dogAvatar = new THREE.Group();

  avatarRoot.add(humanAvatar);
  avatarRoot.add(dogAvatar);

  // 人間アバター
  (() => {
    const bodyGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.8, 24);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x234b9b,
      roughness: 0.7,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    humanAvatar.add(body);

    const headGeo = new THREE.SphereGeometry(0.45, 24, 24);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf2d3b1 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.9;
    humanAvatar.add(head);

    const hairGeo = new THREE.SphereGeometry(0.46, 24, 24, 0, Math.PI * 2, 0, Math.PI / 1.5);
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x202020,
      roughness: 0.85,
      metalness: 0.0,
    });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.copy(head.position);
    humanAvatar.add(hair);

    const footGeo = new THREE.BoxGeometry(0.28, 0.22, 0.45);
    const footMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.8,
      metalness: 0.0,
    });
    const leftFoot = new THREE.Mesh(footGeo, footMat);
    const rightFoot = new THREE.Mesh(footGeo, footMat);
    leftFoot.position.set(-0.18, 0.11, 0.05);
    rightFoot.position.set(0.18, 0.11, 0.05);
    humanAvatar.add(leftFoot, rightFoot);
  })();

  // 犬アバター（シンプルなローポリ犬）
  (() => {
    const bodyGeo = new THREE.BoxGeometry(0.9, 0.5, 1.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xd9a15e,
      roughness: 0.8,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.5, 0);
    dogAvatar.add(body);

    const headGeo = new THREE.BoxGeometry(0.7, 0.6, 0.7);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xd9a15e,
      roughness: 0.8,
      metalness: 0.1,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.95, 0.6);
    dogAvatar.add(head);

    const earGeo = new THREE.BoxGeometry(0.18, 0.45, 0.08);
    const earMat = new THREE.MeshStandardMaterial({
      color: 0x8b5b2c,
      roughness: 0.7,
      metalness: 0.1,
    });
    const leftEar = new THREE.Mesh(earGeo, earMat);
    const rightEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.32, 1.1, 0.5);
    rightEar.position.set(0.32, 1.1, 0.5);
    dogAvatar.add(leftEar, rightEar);

    const legGeo = new THREE.BoxGeometry(0.18, 0.45, 0.18);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0xd9a15e,
      roughness: 0.8,
      metalness: 0.1,
    });
    const lf = new THREE.Mesh(legGeo, legMat);
    const rf = new THREE.Mesh(legGeo, legMat);
    const lb = new THREE.Mesh(legGeo, legMat);
    const rb = new THREE.Mesh(legGeo, legMat);
    lf.position.set(-0.28, 0.23, 0.45);
    rf.position.set(0.28, 0.23, 0.45);
    lb.position.set(-0.28, 0.23, -0.45);
    rb.position.set(0.28, 0.23, -0.45);
    dogAvatar.add(lf, rf, lb, rb);

    const tailGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.55, 10);
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xd9a15e,
      roughness: 0.8,
      metalness: 0.1,
    });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.rotation.x = -Math.PI / 3;
    tail.position.set(0, 0.85, -0.75);
    dogAvatar.add(tail);
  })();

  // 初期位置
  avatarRoot.position.set(0, 0, ROOM_DEPTH / 2 - 3);
  let currentAvatar = 'human';
  dogAvatar.visible = false;

  function setAvatarMode(mode) {
    currentAvatar = mode === 'dog' ? 'dog' : 'human';
    const isDog = currentAvatar === 'dog';
    dogAvatar.visible = isDog;
    humanAvatar.visible = !isDog;

    if (avatarHumanBtn && avatarDogBtn) {
      avatarHumanBtn.classList.toggle('active', !isDog);
      avatarDogBtn.classList.toggle('active', isDog);
    }
  }

  // ========= カメラ制御 =========
  let yaw = Math.PI; // 正面の壁を見る向き
  let pitch = 0.1; // 少し下向き
  const PITCH_LIMIT = Math.PI / 3;

  function updateCamera() {
    const avatarObj = currentAvatar === 'dog' ? dogAvatar : humanAvatar;

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      yaw
    );

    // アバターの向き
    avatarRoot.rotation.y = yaw;

    const headHeight = currentAvatar === 'dog' ? 0.9 : 1.8;
    const avatarWorldPos = avatarRoot.position.clone();

    // カメラ位置（アバターの後ろかつ少し上）
    const backOffset = forward.clone().multiplyScalar(-4.0); // 後ろ方向
    const upOffset = new THREE.Vector3(0, headHeight * 0.7 + 0.7, 0);

    const cameraPos = avatarWorldPos.clone().add(backOffset).add(upOffset);

    // ピッチを反映（上下ののぞき込み）
    const pitchOffset = new THREE.Vector3(0, 0, 0);
    pitchOffset.copy(forward).multiplyScalar(Math.sin(-pitch) * 1.5);
    cameraPos.add(pitchOffset);

    camera.position.copy(cameraPos);

    const lookTarget = avatarWorldPos
      .clone()
      .add(new THREE.Vector3(0, headHeight * 0.7, 0));
    camera.lookAt(lookTarget);
  }

  // ========= ドラッグで視線操作 =========
  let isLookDragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;

  function onPointerDownLook(e) {
    // ジョイスティック領域は無視
    if (joystickBase) {
      const rect = joystickBase.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        return;
      }
    }
    isLookDragging = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  }

  function onPointerMoveLook(e) {
    if (!isLookDragging) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;

    const ROT_SPEED = 0.004;
    yaw -= dx * ROT_SPEED;
    pitch -= dy * ROT_SPEED;
    if (pitch > PITCH_LIMIT) pitch = PITCH_LIMIT;
    if (pitch < -PITCH_LIMIT) pitch = -PITCH_LIMIT;
  }

  function onPointerUpLook() {
    isLookDragging = false;
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDownLook);
  window.addEventListener('pointermove', onPointerMoveLook);
  window.addEventListener('pointerup', onPointerUpLook);
  window.addEventListener('pointercancel', onPointerUpLook);

  // ========= ジョイスティック =========
  let joystickActive = false;
  let joyX = 0;
  let joyY = 0;

  function setJoystickFromEvent(e) {
    if (!joystickBase || !joystickStick) return;
    const rect = joystickBase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let dx = e.clientX - cx;
    let dy = e.clientY - cy;

    const radius = rect.width / 2;

    // 正規化：上方向を +Y（前進）にする
    let nx = dx / radius;
    let ny = -dy / radius;

    const len = Math.hypot(nx, ny);
    if (len > 1) {
      nx /= len;
      ny /= len;
    }

    joyX = nx;
    joyY = ny;

    const stickRadius = rect.width / 2.7;
    const stickX = cx + dx;
    const stickY = cy + dy;

    joystickStick.style.transform = `translate(${stickX - rect.left - rect.width / 2}px, ${
      stickY - rect.top - rect.height / 2
    }px)`;
  }

  function resetJoystick() {
    joyX = 0;
    joyY = 0;
    joystickActive = false;
    if (joystickStick) {
      joystickStick.style.transform = 'translate(0,0)';
    }
  }

  if (joystickBase && joystickStick) {
    joystickBase.style.touchAction = 'none';

    joystickBase.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      joystickActive = true;
      setJoystickFromEvent(e);
    });

    window.addEventListener(
      'pointermove',
      (e) => {
        if (!joystickActive) return;
        e.preventDefault();
        setJoystickFromEvent(e);
      },
      { passive: false }
    );

    window.addEventListener('pointerup', resetJoystick);
    window.addEventListener('pointercancel', resetJoystick);
  }

  // ========= アバターの移動 =========
  const tmpForward = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  function updateAvatarPosition(delta) {
    if (!joystickActive) return;
    if (Math.abs(joyX) < 0.001 && Math.abs(joyY) < 0.001) return;

    const SPEED = 4.0; // m/s
    const moveSpeed = SPEED * delta;

    // yaw に基づく前方向
    tmpForward.set(0, 0, -1).applyAxisAngle(up, yaw).normalize();
    tmpRight.copy(tmpForward).cross(up).normalize(); // 右

    // joyY: 上に倒すと +1 → 前進
    const move = new THREE.Vector3();
    move.addScaledVector(tmpForward, joyY * moveSpeed);
    move.addScaledVector(tmpRight, joyX * moveSpeed);

    avatarRoot.position.add(move);

    // 壁の外に出ないように簡単な制限
    const margin = 1.5;
    const halfW = ROOM_WIDTH / 2 - margin;
    const halfD = ROOM_DEPTH / 2 - margin;

    avatarRoot.position.x = Math.max(
      -halfW,
      Math.min(halfW, avatarRoot.position.x)
    );
    avatarRoot.position.z = Math.max(
      -halfD,
      Math.min(halfD, avatarRoot.position.z)
    );
  }

  // ========= UI イベント =========
  if (avatarHumanBtn) {
    avatarHumanBtn.addEventListener('click', () => setAvatarMode('human'));
  }
  if (avatarDogBtn) {
    avatarDogBtn.addEventListener('click', () => setAvatarMode('dog'));
  }

  // 初期モード
  setAvatarMode('human');
  updateCamera();

  // ========= リサイズ対応 =========
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // ========= アニメーションループ =========
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    updateAvatarPosition(delta);
    updateCamera();

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
})();
