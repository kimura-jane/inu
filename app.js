// app.js : TAF DOG MUSEUM 3D 廊下 + ジョイスティック + アバターチェンジ
// ======================================================================

(function () {
  // ---------- 基本セットアップ ----------
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050509);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  // カメラの状態（ヨー＝左右、ピッチ＝上下）
  let cameraYaw = 0;
  let cameraPitch = 0;

  // カメラ位置（歩き回るのはこの座標）
  camera.position.set(0, 1.5, 10);

  // ---------- ライト ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);

  const mainDirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  mainDirLight.position.set(5, 10, 5);
  scene.add(mainDirLight);

  // ---------- 廊下・壁・天井 ----------
  const corridorLength = 80; // z方向の長さ
  const corridorHalf = corridorLength / 2;
  const corridorWidth = 8;
  const wallHeight = 4;

  // 床
  const floorGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111116,
    roughness: 0.9,
    metalness: 0.0,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -corridorHalf);
  scene.add(floor);

  // 天井
  const ceilGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x07070a,
    roughness: 1.0,
  });
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, wallHeight, -corridorHalf);
  scene.add(ceiling);

  // 天井のラインライト風
  const stripeGeo = new THREE.PlaneGeometry(1.2, 0.25);
  const stripeMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  for (let i = 0; i < 14; i++) {
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.rotation.x = Math.PI / 2;
    const z = -4 - i * 5;
    stripe.position.set(0, wallHeight - 0.01, z);
    scene.add(stripe);
  }

  // 左右の壁
  const wallMatLeft = new THREE.MeshStandardMaterial({
    color: 0x303036,
    roughness: 0.95,
  });
  const wallMatRight = wallMatLeft.clone();

  const wallGeo = new THREE.PlaneGeometry(corridorLength, wallHeight);

  // 右壁（x = +width/2）
  const rightWall = new THREE.Mesh(wallGeo, wallMatRight);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(corridorWidth / 2, wallHeight / 2, -corridorHalf);
  scene.add(rightWall);

  // 左壁（x = -width/2）
  const leftWall = new THREE.Mesh(wallGeo, wallMatLeft);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-corridorWidth / 2, wallHeight / 2, -corridorHalf);
  scene.add(leftWall);

  // ---------- 額縁＋作品 ----------
  const clickableMeshes = [];
  const frameGroups = [];

  const frameColors = [
    0x1a1a1e, // 黒
    0x2f2415, // 木目
    0x4a4a4f, // メタル
    0x3b2620, // 濃い木
  ];

  const frameBorderColors = [
    0xe6e6ea,
    0xf1d8a5,
    0xd0d0d4,
    0xfff2c7,
  ];

  const loader = new THREE.TextureLoader();

  function createFrame(work, index, side) {
    // side: 'left' | 'right'
    // ベースグループ
    const group = new THREE.Group();

    // ランダムに額縁タイプ
    const fIdx = index % frameColors.length;
    const frameColor = frameColors[fIdx];
    const borderColor = frameBorderColors[fIdx];

    // 額縁（外枠）
    const outerGeo = new THREE.BoxGeometry(1.4, 2.0, 0.12);
    const outerMat = new THREE.MeshStandardMaterial({
      color: frameColor,
      roughness: 0.7,
      metalness: 0.2,
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    group.add(outer);

    // 内側の白い縁
    const innerGeo = new THREE.BoxGeometry(1.2, 1.8, 0.06);
    const innerMat = new THREE.MeshStandardMaterial({
      color: borderColor,
      roughness: 0.9,
      metalness: 0.05,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.z = 0.035;
    group.add(inner);

    // 作品テクスチャ
    const imgPlaneGeo = new THREE.PlaneGeometry(1.0, 1.4);
    const tex = loader.load(work.image);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const imgPlaneMat = new THREE.MeshBasicMaterial({
      map: tex,
    });
    const imgPlane = new THREE.Mesh(imgPlaneGeo, imgPlaneMat);
    imgPlane.position.z = 0.07;
    group.add(imgPlane);

    // スポットライト風の円錐メッシュ（本当のライトじゃない）
    const coneGeo = new THREE.ConeGeometry(0.1, 0.25, 16);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0xddddff,
      emissive: 0x7777aa,
      roughness: 0.4,
      metalness: 0.1,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.rotation.x = -Math.PI / 2.5;
    cone.position.set(0, 1.2, 0.15);
    group.add(cone);

    // 壁への配置
    const step = 3.0;
    const offsetZ = -6 - index * step;
    const y = 1.8;

    if (side === 'right') {
      group.position.set(corridorWidth / 2 - 0.25, y, offsetZ);
      group.rotation.y = -Math.PI / 2;
    } else {
      group.position.set(-corridorWidth / 2 + 0.25, y, offsetZ);
      group.rotation.y = Math.PI / 2;
    }

    scene.add(group);
    frameGroups.push(group);
    clickableMeshes.push(imgPlane); // クリック対象は画像部分

    // クリックでどの作品か分かるように
    imgPlane.userData.work = work;
  }

  // 左右交互に作品を並べる
  if (Array.isArray(WORKS)) {
    WORKS.forEach((w, i) => {
      const side = i % 2 === 0 ? 'right' : 'left';
      createFrame(w, i, side);
    });
  }

  // ---------- アバター ----------
  const avatarGroup = new THREE.Group();
  scene.add(avatarGroup);

  function clearAvatar() {
    while (avatarGroup.children.length > 0) {
      const obj = avatarGroup.children.pop();
      obj.geometry && obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose && m.dispose());
      } else if (obj.material) {
        obj.material.dispose();
      }
    }
  }

  // シンプルローポリ人間
  function buildHumanAvatar(styleIndex) {
    clearAvatar();
    const bodyColors = [
      0x1b4f72,
      0x7d6608,
      0x196f3d,
      0x922b21,
      0x4a235a,
    ];
    const coatColor = bodyColors[styleIndex % bodyColors.length];

    const skinColor = 0xf5d6c6;
    const legColor = 0x181818;

    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.2, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: coatColor,
      roughness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.7;
    avatarGroup.add(body);

    const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.6,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.6;
    avatarGroup.add(head);

    const hairGeo = new THREE.SphereGeometry(0.34, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.3);
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
    });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.63;
    avatarGroup.add(hair);

    const armGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.9, 12);
    const armMat = bodyMat;
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.5, 0.95, 0);
    leftArm.rotation.z = Math.PI / 14;
    avatarGroup.add(leftArm);

    const rightArm = leftArm.clone();
    rightArm.position.x = 0.5;
    rightArm.rotation.z = -Math.PI / 14;
    avatarGroup.add(rightArm);

    const legGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.9, 12);
    const legMat = new THREE.MeshStandardMaterial({ color: legColor });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.18, 0.15, 0);
    avatarGroup.add(leftLeg);

    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.18;
    avatarGroup.add(rightLeg);
  }

  // シンプルローポリ犬
  function buildDogAvatar(styleIndex) {
    clearAvatar();

    const bodyColors = [
      0x3b2b1a,
      0xd4a15f,
      0x7b7b7b,
      0xf4e3c3,
      0x272727,
    ];
    const c = bodyColors[styleIndex % bodyColors.length];

    const bodyGeo = new THREE.BoxGeometry(1.0, 0.7, 1.6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    avatarGroup.add(body);

    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.9);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 1.0, 0.9);
    avatarGroup.add(head);

    const earGeo = new THREE.BoxGeometry(0.2, 0.4, 0.1);
    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-0.3, 1.3, 0.7);
    avatarGroup.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.3;
    avatarGroup.add(earR);

    const eyeGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
    });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.18, 1.05, 1.3);
    avatarGroup.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.18;
    avatarGroup.add(eyeR);

    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 10);
    const legMat = bodyMat;
    const legs = [];
    const legPos = [
      [-0.35, 0.3, 0.55],
      [0.35, 0.3, 0.55],
      [-0.35, 0.3, -0.55],
      [0.35, 0.3, -0.55],
    ];
    legPos.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, y, z);
      legs.push(leg);
      avatarGroup.add(leg);
    });

    const tailGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 10);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.set(0, 1.0, -0.8);
    tail.rotation.x = -Math.PI / 4;
    avatarGroup.add(tail);
  }

  // 初期は人間
  let avatarMode = 'human'; // 'human' | 'dog'
  let avatarStyleIndex = 0;
  buildHumanAvatar(avatarStyleIndex);

  // ---------- アバターチェンジ（ボタン） ----------
  const btnHuman = document.getElementById('avatar-human-btn');
  const btnDog = document.getElementById('avatar-dog-btn');

  function setActiveButton(mode) {
    if (!btnHuman || !btnDog) return;
    if (mode === 'human') {
      btnHuman.classList.add('active');
      btnDog.classList.remove('active');
    } else {
      btnDog.classList.add('active');
      btnHuman.classList.remove('active');
    }
  }

  setActiveButton(avatarMode);

  if (btnHuman) {
    btnHuman.addEventListener('click', () => {
      avatarMode = 'human';
      avatarStyleIndex = (avatarStyleIndex + 1) % 10;
      buildHumanAvatar(avatarStyleIndex);
      setActiveButton(avatarMode);
    });
  }

  if (btnDog) {
    btnDog.addEventListener('click', () => {
      avatarMode = 'dog';
      avatarStyleIndex = (avatarStyleIndex + 1) % 10;
      buildDogAvatar(avatarStyleIndex);
      setActiveButton(avatarMode);
    });
  }

  // ---------- カメラ操作（ドラッグで視点回転） ----------
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    // ジョイスティックエリア外のときだけ視点ドラッグ
    const joyRect = joyBg.getBoundingClientRect();
    if (
      e.clientX >= joyRect.left &&
      e.clientX <= joyRect.right &&
      e.clientY >= joyRect.top &&
      e.clientY <= joyRect.bottom
    ) {
      return;
    }
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointerup', (e) => {
    if (isDragging) {
      isDragging = false;
      canvas.releasePointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    // 左右回転
    cameraYaw -= dx * 0.005;

    // 上下回転
    cameraPitch -= dy * 0.003;
    const maxPitch = Math.PI / 4;
    const minPitch = -Math.PI / 6;
    if (cameraPitch > maxPitch) cameraPitch = maxPitch;
    if (cameraPitch < minPitch) cameraPitch = minPitch;
  });

  // ---------- ジョイスティック ----------
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');

  let joyActive = false;
  let joyCenter = { x: 0, y: 0 };
  let joyVector = { x: 0, y: 0 };

  function updateJoyCenter() {
    const rect = joyBg.getBoundingClientRect();
    joyCenter.x = rect.left + rect.width / 2;
    joyCenter.y = rect.top + rect.height / 2;
  }

  if (joyBg && joyStick) {
    window.addEventListener('resize', updateJoyCenter);
    updateJoyCenter();

    const startJoy = (e) => {
      joyActive = true;
      const point = e.touches ? e.touches[0] : e;
      updateJoyCenter();
      moveJoy(point);
      document.addEventListener('pointermove', moveJoy);
      document.addEventListener('pointerup', endJoy);
      document.addEventListener('touchmove', moveJoy, { passive: false });
      document.addEventListener('touchend', endJoy);
    };

    const moveJoy = (e) => {
      if (!joyActive) return;
      const point = e.touches ? e.touches[0] : e;
      const dx = point.clientX - joyCenter.x;
      const dy = point.clientY - joyCenter.y;
      const maxDist = 45;
      let dist = Math.sqrt(dx * dx + dy * dy);
      let nx = dx;
      let ny = dy;
      if (dist > maxDist) {
        const ratio = maxDist / dist;
        nx *= ratio;
        ny *= ratio;
        dist = maxDist;
      }
      joyVector.x = nx / maxDist; // -1〜1
      joyVector.y = ny / maxDist;

      joyStick.style.transform = `translate(${nx}px, ${ny}px)`;

      if (e.cancelable) e.preventDefault();
    };

    const endJoy = (e) => {
      joyActive = false;
      joyVector.x = 0;
      joyVector.y = 0;
      joyStick.style.transform = 'translate(0, 0)';
      document.removeEventListener('pointermove', moveJoy);
      document.removeEventListener('pointerup', endJoy);
      document.removeEventListener('touchmove', moveJoy);
      document.removeEventListener('touchend', endJoy);
      if (e && e.cancelable) e.preventDefault();
    };

    joyBg.addEventListener('pointerdown', startJoy);
    joyBg.addEventListener('touchstart', startJoy, { passive: false });
  }

  // ---------- 作品クリック（拡大表示用パネル：すでに index.html にある前提） ----------
  const infoPanel = document.getElementById('info-panel');
  const infoImage = document.getElementById('info-image');
  const infoTitle = document.getElementById('info-title');
  const infoDesc = document.getElementById('info-desc');
  const infoClose = document.getElementById('info-close');

  function showInfo(work) {
    if (!infoPanel) return;
    if (infoImage && work.image) {
      infoImage.src = work.image;
    }
    if (infoTitle && work.title) {
      infoTitle.textContent = work.title;
    }
    if (infoDesc) {
      infoDesc.textContent = work.desc || '';
    }
    infoPanel.classList.add('show');
  }

  if (infoClose && infoPanel) {
    infoClose.addEventListener('click', () => {
      infoPanel.classList.remove('show');
    });
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function onCanvasTap(e) {
    if (!clickableMeshes.length) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickableMeshes, true);
    if (hits.length > 0) {
      const work = hits[0].object.userData.work;
      if (work) showInfo(work);
    }
  }

  canvas.addEventListener('click', onCanvasTap);
  canvas.addEventListener('touchend', (e) => {
    if (e.touches && e.touches.length > 0) return;
    onCanvasTap(e);
  });

  // ---------- レイアウト・リサイズ ----------
  function resizeRenderer() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resizeRenderer);
  resizeRenderer();

  // ---------- メインループ ----------
  const clock = new THREE.Clock();

  function clampCameraPosition() {
    // 廊下の範囲から出ないように clamp
    const margin = 1.0;
    const maxX = corridorWidth / 2 - margin;
    const minX = -maxX;
    const startZ = 2; // 手前
    const endZ = -corridorLength + 5; // 奥

    if (camera.position.x > maxX) camera.position.x = maxX;
    if (camera.position.x < minX) camera.position.x = minX;
    if (camera.position.z > startZ) camera.position.z = startZ;
    if (camera.position.z < endZ) camera.position.z = endZ;
  }

  function updateAvatarFromCamera() {
    // カメラの少し前・少し下にアバターを配置（三人称視点）
    const offset = new THREE.Vector3(0, -1.1, -3.2); // カメラ座標系
    const rot = new THREE.Euler(cameraPitch, cameraYaw, 0, 'YXZ');
    const worldOffset = offset.clone().applyEuler(rot);
    avatarGroup.position.copy(camera.position).add(worldOffset);

    // アバターはカメラと同じ向き（Y回転のみ）にする
    avatarGroup.rotation.set(0, cameraYaw, 0);
  }

  function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();

    // ジョイスティックによる移動
    if (joyActive || Math.abs(joyVector.x) > 0.01 || Math.abs(joyVector.y) > 0.01) {
      const moveSpeed = 4.0;
      const forwardInput = -joyVector.y; // 上で前進
      const sideInput = joyVector.x;

      const forward = new THREE.Vector3(
        Math.sin(cameraYaw),
        0,
        -Math.cos(cameraYaw)
      );
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      camera.position.addScaledVector(forward, forwardInput * moveSpeed * dt);
      camera.position.addScaledVector(right, sideInput * moveSpeed * dt);
      clampCameraPosition();
    }

    // カメラの回転適用
    camera.rotation.order = 'YXZ';
    camera.rotation.y = cameraYaw;
    camera.rotation.x = cameraPitch;

    // アバターをカメラ基準で更新
    updateAvatarFromCamera();

    renderer.render(scene, camera);
  }

  animate();
})();
