// app.js : TAF DOG MUSEUM / 三人称視点 & アバターチェンジ & ジョイスティック
(function () {
  // ========== 基本セットアップ ==========
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
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

  // プレイヤーの向き（ヨー）と視線の上下（ピッチ）
  let cameraYaw = 0;
  let cameraPitch = -0.3; // 少し下向きにしておく

  // プレイヤー位置
  const playerPos = new THREE.Vector3(0, 0, -10);

  // ========== ライティング ==========
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(6, 10, 4);
  scene.add(dirLight);

  // ========== 廊下 / 壁 / 天井 ==========
  const corridorLength = 80;
  const corridorHalf = corridorLength / 2;
  const corridorWidth = 8;
  const wallHeight = 4;

  // 床
  const floorGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x101015,
    roughness: 0.95,
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

  // 天井ラインライトっぽい板
  const stripeGeo = new THREE.PlaneGeometry(1.2, 0.25);
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 14; i++) {
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.rotation.x = Math.PI / 2;
    stripe.position.set(0, wallHeight - 0.01, -8 - i * 5);
    scene.add(stripe);
  }

  // 壁
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x303036,
    roughness: 0.95,
  });
  const wallGeo = new THREE.PlaneGeometry(corridorLength, wallHeight);

  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(corridorWidth / 2, wallHeight / 2, -corridorHalf);
  scene.add(rightWall);

  const leftWall = new THREE.Mesh(wallGeo, wallMat.clone());
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-corridorWidth / 2, wallHeight / 2, -corridorHalf);
  scene.add(leftWall);

  // ========== 額縁＋作品 ==========
  const clickableMeshes = [];
  const loader = new THREE.TextureLoader();

  const frameColors = [0x1a1a1e, 0x2f2415, 0x4a4a4f, 0x3b2620];
  const frameBorderColors = [0xe6e6ea, 0xf1d8a5, 0xd0d0d4, 0xfff2c7];

  function createFrame(work, index, side) {
    const group = new THREE.Group();

    const fc = frameColors[index % frameColors.length];
    const bc = frameBorderColors[index % frameBorderColors.length];

    // 外枠
    const outerGeo = new THREE.BoxGeometry(1.5, 2.1, 0.12);
    const outerMat = new THREE.MeshStandardMaterial({
      color: fc,
      roughness: 0.7,
      metalness: 0.3,
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    group.add(outer);

    // 内枠
    const innerGeo = new THREE.BoxGeometry(1.25, 1.85, 0.07);
    const innerMat = new THREE.MeshStandardMaterial({
      color: bc,
      roughness: 0.9,
      metalness: 0.05,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.z = 0.035;
    group.add(inner);

    // 画像
    const imgGeo = new THREE.PlaneGeometry(1.05, 1.5);
    const tex = loader.load(work.image);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const imgMat = new THREE.MeshBasicMaterial({ map: tex });
    const img = new THREE.Mesh(imgGeo, imgMat);
    img.position.z = 0.071;
    group.add(img);
    img.userData.work = work;
    clickableMeshes.push(img);

    // ピクチャライト
    const coneGeo = new THREE.ConeGeometry(0.11, 0.3, 16);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0xe0e0ff,
      emissive: 0x7777aa,
      roughness: 0.4,
      metalness: 0.1,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.rotation.x = -Math.PI / 2.3;
    cone.position.set(0, 1.2, 0.18);
    group.add(cone);

    const step = 3;
    const z = -10 - index * step;
    const y = 1.8;

    if (side === 'right') {
      group.position.set(corridorWidth / 2 - 0.25, y, z);
      group.rotation.y = -Math.PI / 2;
    } else {
      group.position.set(-corridorWidth / 2 + 0.25, y, z);
      group.rotation.y = Math.PI / 2;
    }

    scene.add(group);
  }

  if (Array.isArray(WORKS)) {
    WORKS.forEach((w, i) => {
      const side = i % 2 === 0 ? 'right' : 'left';
      createFrame(w, i, side);
    });
  }

  // ========== アバター ==========
  const avatarGroup = new THREE.Group();
  scene.add(avatarGroup);

  function disposeChildren(group) {
    while (group.children.length) {
      const obj = group.children.pop();
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose && m.dispose());
        } else {
          obj.material.dispose && obj.material.dispose();
        }
      }
    }
  }

  function buildHuman(styleIndex) {
    disposeChildren(avatarGroup);

    const coatColors = [0x1b4f72, 0x7d6608, 0x196f3d, 0x922b21, 0x4a235a];
    const coatColor = coatColors[styleIndex % coatColors.length];
    const skinColor = 0xf5d6c6;
    const legColor = 0x181818;

    // 体
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.2, 18);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: coatColor,
      roughness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    avatarGroup.add(body);

    // 頭
    const headGeo = new THREE.SphereGeometry(0.35, 18, 18);
    const headMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.6,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.65;
    avatarGroup.add(head);

    // 髪
    const hairGeo = new THREE.SphereGeometry(
      0.36,
      18,
      18,
      0,
      Math.PI * 2,
      0,
      Math.PI / 1.4
    );
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
    });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.7;
    avatarGroup.add(hair);

    // 腕
    const armGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.9, 14);
    const armMat = bodyMat;
    const armL = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-0.5, 1.0, 0);
    armL.rotation.z = Math.PI / 18;
    avatarGroup.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.5;
    armR.rotation.z = -Math.PI / 18;
    avatarGroup.add(armR);

    // 足
    const legGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.85, 14);
    const legMat = new THREE.MeshStandardMaterial({ color: legColor });
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.18, 0.35, 0);
    avatarGroup.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.18;
    avatarGroup.add(legR);
  }

  function buildDog(styleIndex) {
    disposeChildren(avatarGroup);

    const colors = [0x3b2b1a, 0xd4a15f, 0x808080, 0xf4e3c3, 0x272727];
    const c = colors[styleIndex % colors.length];

    const bodyGeo = new THREE.BoxGeometry(1.0, 0.7, 1.6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    avatarGroup.add(body);

    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.9);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 1.0, 0.9);
    avatarGroup.add(head);

    const earGeo = new THREE.BoxGeometry(0.2, 0.45, 0.12);
    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-0.3, 1.32, 0.7);
    avatarGroup.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.3;
    avatarGroup.add(earR);

    const eyeGeo = new THREE.SphereGeometry(0.08, 14, 14);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.18, 1.03, 1.3);
    avatarGroup.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.18;
    avatarGroup.add(eyeR);

    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.65, 10);
    const legMat = bodyMat;
    const legPos = [
      [-0.35, 0.33, 0.55],
      [0.35, 0.33, 0.55],
      [-0.35, 0.33, -0.55],
      [0.35, 0.33, -0.55],
    ];
    legPos.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, y, z);
      avatarGroup.add(leg);
    });

    const tailGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 10);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.set(0, 1.0, -0.8);
    tail.rotation.x = -Math.PI / 4;
    avatarGroup.add(tail);
  }

  let avatarMode = 'human';
  let avatarStyleIndex = 0;
  buildHuman(avatarStyleIndex);

  function updateAvatarTransform() {
    avatarGroup.position.copy(playerPos);
    avatarGroup.rotation.set(0, cameraYaw, 0);
  }
  updateAvatarTransform();

  // ========== アバターボタン ==========
  const humanBtn = document.getElementById('btn-human');
  const dogBtn = document.getElementById('btn-dog');

  function updateAvatarButtons() {
    if (!humanBtn || !dogBtn) return;
    if (avatarMode === 'human') {
      humanBtn.classList.add('active');
      dogBtn.classList.remove('active');
    } else {
      dogBtn.classList.add('active');
      humanBtn.classList.remove('active');
    }
  }

  if (humanBtn) {
    humanBtn.addEventListener('click', () => {
      avatarMode = 'human';
      avatarStyleIndex = (avatarStyleIndex + 1) % 10;
      buildHuman(avatarStyleIndex);
      updateAvatarTransform();
      updateAvatarButtons();
    });
  }

  if (dogBtn) {
    dogBtn.addEventListener('click', () => {
      avatarMode = 'dog';
      avatarStyleIndex = (avatarStyleIndex + 1) % 10;
      buildDog(avatarStyleIndex);
      updateAvatarTransform();
      updateAvatarButtons();
    });
  }

  updateAvatarButtons();

  // ========== カメラ操作（ドラッグで視点回転） ==========
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  const joyBg = document.getElementById('joy-bg');

  canvas.addEventListener('pointerdown', (e) => {
    // ジョイスティックの円の上はドラッグ回転を無効化
    if (joyBg) {
      const r = joyBg.getBoundingClientRect();
      if (
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom
      ) {
        return;
      }
    }
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    cameraYaw -= dx * 0.005;
    cameraPitch -= dy * 0.003;

    const maxPitch = Math.PI / 4;
    const minPitch = -Math.PI / 3;
    if (cameraPitch > maxPitch) cameraPitch = maxPitch;
    if (cameraPitch < minPitch) cameraPitch = minPitch;
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    canvas.releasePointerCapture(e.pointerId);
  });

  // ========== ジョイスティック ==========
  const joyStick = document.getElementById('joy-stick');
  let joyActive = false;
  let joyCenter = { x: 0, y: 0 };
  let joyVec = { x: 0, y: 0 }; // x:左右, y:上下

  function updateJoyCenter() {
    if (!joyBg) return;
    const r = joyBg.getBoundingClientRect();
    joyCenter.x = r.left + r.width / 2;
    joyCenter.y = r.top + r.height / 2;
  }

  function startJoy(e) {
    joyActive = true;
    updateJoyCenter();
    moveJoy(e);
    window.addEventListener('pointermove', moveJoy);
    window.addEventListener('pointerup', endJoy);
    e.preventDefault();
  }

  function moveJoy(e) {
    if (!joyActive) return;
    const dx = e.clientX - joyCenter.x;
    const dy = e.clientY - joyCenter.y;
    const maxDist = 45;

    let nx = dx;
    let ny = dy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxDist) {
      const ratio = maxDist / dist;
      nx *= ratio;
      ny *= ratio;
    }

    joyVec.x = nx / maxDist;
    joyVec.y = ny / maxDist;

    if (joyStick) {
      joyStick.style.transform = `translate(${nx}px, ${ny}px)`;
    }
  }

  function endJoy() {
    joyActive = false;
    joyVec.x = 0;
    joyVec.y = 0;
    if (joyStick) joyStick.style.transform = 'translate(0px, 0px)';
    window.removeEventListener('pointermove', moveJoy);
    window.removeEventListener('pointerup', endJoy);
  }

  if (joyBg && joyStick) {
    updateJoyCenter();
    joyBg.addEventListener('pointerdown', startJoy);
    window.addEventListener('resize', updateJoyCenter);
  }

  // ========== 作品タップで拡大 ==========
  const infoPanel = document.getElementById('info-panel');
  const infoImage = document.getElementById('info-image');
  const infoTitle = document.getElementById('info-title');
  const infoDesc = document.getElementById('info-desc');
  const infoClose = document.getElementById('info-close');

  function showInfo(work) {
    if (!infoPanel) return;
    if (infoImage && work.image) infoImage.src = work.image;
    if (infoTitle && work.title) infoTitle.textContent = work.title;
    if (infoDesc) infoDesc.textContent = work.desc || '';
    infoPanel.classList.add('show');
  }

  if (infoClose && infoPanel) {
    infoClose.addEventListener('click', () => {
      infoPanel.classList.remove('show');
    });
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function handleTap(e) {
    if (!clickableMeshes.length) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.changedTouches && e.changedTouches[0].clientX);
    const clientY = e.clientY ?? (e.changedTouches && e.changedTouches[0].clientY);
    if (clientX == null || clientY == null) return;

    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickableMeshes, true);
    if (hits.length > 0) {
      const w = hits[0].object.userData.work;
      if (w) showInfo(w);
    }
  }

  canvas.addEventListener('click', handleTap);

  // ========== レイアウト ==========
  function resizeRenderer() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resizeRenderer);
  resizeRenderer();

  // ========== プレイヤー移動制限 ==========
  function clampPlayer() {
    const margin = 1.0;
    const maxX = corridorWidth / 2 - margin;
    const minX = -maxX;
    const nearZ = -6;
    const farZ = -corridorLength + 8;

    if (playerPos.x > maxX) playerPos.x = maxX;
    if (playerPos.x < minX) playerPos.x = minX;
    if (playerPos.z > nearZ) playerPos.z = nearZ;
    if (playerPos.z < farZ) playerPos.z = farZ;
  }

  // ========== メインループ ==========
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    // ジョイスティックで移動
    if (Math.abs(joyVec.x) > 0.02 || Math.abs(joyVec.y) > 0.02) {
      const moveSpeed = 4.0;
      const forwardInput = -joyVec.y; // 上で前進
      const sideInput = joyVec.x;

      let f = forwardInput;
      let s = sideInput;
      const len = Math.hypot(f, s);
      if (len > 1) {
        f /= len;
        s /= len;
      }

      const forward = new THREE.Vector3(
        Math.sin(cameraYaw),
        0,
        -Math.cos(cameraYaw)
      );
      const right = new THREE.Vector3()
        .crossVectors(forward, new THREE.Vector3(0, 1, 0))
        .normalize();

      playerPos.addScaledVector(forward, f * moveSpeed * dt);
      playerPos.addScaledVector(right, s * moveSpeed * dt);

      clampPlayer();
      updateAvatarTransform();
    }

    // カメラ位置をプレイヤー後方に置く
    const targetHeight = avatarMode === 'human' ? 1.5 : 1.0;
    const target = playerPos.clone().add(new THREE.Vector3(0, targetHeight, 0));

    let offset = new THREE.Vector3(0, 1.6, 3.5);
    const rotY = new THREE.Matrix4().makeRotationY(cameraYaw);
    offset.applyMatrix4(rotY);

    const camPos = target.clone().add(offset);
    camera.position.copy(camPos);

    // 視線方向
    const lookDir = new THREE.Vector3(
      Math.sin(cameraYaw),
      Math.sin(cameraPitch),
      -Math.cos(cameraYaw)
    ).normalize();

    const lookTarget = camera.position.clone().add(lookDir);
    camera.lookAt(lookTarget);

    renderer.render(scene, camera);
  }

  animate();
})();
