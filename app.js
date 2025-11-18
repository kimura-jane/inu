// app.js : TAF DOG MUSEUM / 三人称視点 & アバターチェンジ & ジョイスティック
// ======================================================================

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
  let cameraPitch = 0;

  // プレイヤー（アバター）のワールド位置
  const playerPos = new THREE.Vector3(0, 0, -6); // 廊下の入り口付近

  // ========== ライティング ==========
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
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

  // 天井ラインライト風
  const stripeGeo = new THREE.PlaneGeometry(1.2, 0.25);
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 14; i++) {
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.rotation.x = Math.PI / 2;
    stripe.position.set(0, wallHeight - 0.01, -6 - i * 5);
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
    const coneGeo = new THREE.ConeGeometry(0.11, 0.3, 18);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0xe0e0ff,
      emissive: 0x7777aa,
      roughness: 0.4,
      metalness: 0.1,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.rotation.x = -Math.PI / 2.4;
    cone.position.set(0, 1.2, 0.18);
    group.add(cone);

    const step = 3;
    const z = -8 - index * step;
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
        } else obj.material.dispose();
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
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.5, 1.0, 0);
    leftArm.rotation.z = Math.PI / 14;
    avatarGroup.add(leftArm);

    const rightArm = leftArm.clone();
    rightArm.position.x = 0.5;
    rightArm.rotation.z = -Math.PI / 14;
    avatarGroup.add(rightArm);

    // 足
    const legGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.85, 14);
    const legMat = new THREE.MeshStandardMaterial({ color: legColor });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.18, 0.35, 0);
    avatarGroup.add(leftLeg);

    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.18;
    avatarGroup.add(rightLeg);
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

  // ========== アバターチェンジボタン ==========
  const avatarButtons = Array.from(
    document.querySelectorAll('.avatar-btn')
  );

  function updateAvatarButtons() {
    avatarButtons.forEach((btn) => {
      const type = btn.dataset.type;
      if (type === avatarMode) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }
  updateAvatarButtons();

  avatarButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      if (!type) return;

      avatarMode = type;
      avatarStyleIndex = (avatarStyleIndex + 1) % 10; // 押すたびに服／犬の色だけ変化

      if (avatarMode === 'human') buildHuman(avatarStyleIndex);
      else buildDog(avatarStyleIndex);

      updateAvatarButtons();
      updateAvatarTransform();
    });
  });

  // ========== カメラ操作（ドラッグで視点回転） ==========
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  const joyBg = document.getElementById('joy-bg');

  canvas.addEventListener('pointerdown', (e) => {
    // ジョイスティックエリアは除外
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

    cameraYaw -= dx * 0.005;
    cameraPitch -= dy * 0.003;

    const maxPitch = Math.PI / 4;
    const minPitch = -Math.PI / 6;
    if (cameraPitch > maxPitch) cameraPitch = maxPitch;
    if (cameraPitch < minPitch) cameraPitch = minPitch;
  });

  // ========== ジョイスティック ==========
  const joyStick = document.getElementById('joy-stick');
  let joyActive = false;
  let joyCenter = { x: 0, y: 0 };
  let joyVec = { x: 0, y: 0 }; // x:左右 / y:上下

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
    document.addEventListener('pointermove', moveJoy);
    document.addEventListener('pointerup', endJoy);
    document.addEventListener('touchmove', moveJoy, { passive: false });
    document.addEventListener('touchend', endJoy);
    if (e.cancelable) e.preventDefault();
  }

  function moveJoy(e) {
    if (!joyActive) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - joyCenter.x;
    const dy = p.clientY - joyCenter.y;
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

    // -1〜1 に正規化（上下左右で速度差が出ないように）
    joyVec.x = nx / maxDist;
    joyVec.y = ny / maxDist;

    if (joyStick) {
      joyStick.style.transform = `translate(${nx}px, ${ny}px)`;
    }
    if (e.cancelable) e.preventDefault();
  }

  function endJoy(e) {
    joyActive = false;
    joyVec.x = 0;
    joyVec.y = 0;
    if (joyStick) joyStick.style.transform = 'translate(0, 0)';
    document.removeEventListener('pointermove', moveJoy);
    document.removeEventListener('pointerup', endJoy);
    document.removeEventListener('touchmove', moveJoy);
    document.removeEventListener('touchend', endJoy);
    if (e && e.cancelable) e.preventDefault();
  }

  if (joyBg && joyStick) {
    window.addEventListener('resize', updateJoyCenter);
    updateJoyCenter();
    joyBg.addEventListener('pointerdown', startJoy);
    joyBg.addEventListener('touchstart', startJoy, { passive: false });
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
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

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
  canvas.addEventListener('touchend', handleTap);

  // ========== レイアウト ==========
  function resizeRenderer() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', () => {
    resizeRenderer();
    updateJoyCenter();
  });
  resizeRenderer();

  // ========== プレイヤー移動の制限 ==========
  function clampPlayer() {
    const margin = 1.0;
    const maxX = corridorWidth / 2 - margin;
    const minX = -maxX;
    const nearZ = -3;
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
    if (Math.abs(joyVec.x) > 0.01 || Math.abs(joyVec.y) > 0.01) {
      const moveSpeed = 4.0;
      const forwardInput = -joyVec.y; // 上で前進
      const sideInput = joyVec.x;

      // 斜めの時も速度一定にする
      let len = Math.hypot(forwardInput, sideInput);
      let f = forwardInput;
      let s = sideInput;
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

    // カメラ位置をプレイヤーの「真後ろ＋少し上」に置く
    const target = playerPos.clone().add(new THREE.Vector3(0, 1.4, 0)); // 頭あたり

    // カメラのオフセット（ローカル座標で後ろに 3.5、上に 1.6）
    let offset = new THREE.Vector3(0, 1.6, 3.5);
    const rotY = new THREE.Matrix4().makeRotationY(cameraYaw);
    offset.applyMatrix4(rotY);

    const camPos = target.clone().add(offset);
    camera.position.copy(camPos);

    // ピッチ分だけ上下に振る
    const lookDir = new THREE.Vector3(
      Math.sin(cameraYaw),
      0,
      -Math.cos(cameraYaw)
    );
    // ピッチを反映
    lookDir.y = Math.sin(cameraPitch);
    lookDir.normalize();

    const lookTarget = camera.position.clone().add(lookDir);
    camera.lookAt(lookTarget);

    renderer.render(scene, camera);
  }

  animate();
})();
