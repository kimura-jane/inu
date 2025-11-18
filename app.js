// app.js : TAF DOG MUSEUM
// 三人称視点（アバターの真後ろ）、ジョイスティック移動、ドラッグで視点回転
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

  // 視点角度
  let cameraYaw = 0;   // 左右
  let cameraPitch = 0; // 上下

  // プレイヤー（アバター）の位置
  const playerPos = new THREE.Vector3(0, 0, -4); // 廊下の入り口付近

  // ---------- ライト ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);

  const mainDirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  mainDirLight.position.set(5, 10, 5);
  scene.add(mainDirLight);

  // ---------- 廊下・壁・天井 ----------
  const corridorLength = 80;
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
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 14; i++) {
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.rotation.x = Math.PI / 2;
    const z = -4 - i * 5;
    stripe.position.set(0, wallHeight - 0.01, z);
    scene.add(stripe);
  }

  // 左右の壁
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

  // ---------- 額縁＋作品 ----------
  const clickableMeshes = [];
  const frameGroups = [];

  const frameColors = [0x1a1a1e, 0x2f2415, 0x4a4a4f, 0x3b2620];
  const frameBorderColors = [0xe6e6ea, 0xf1d8a5, 0xd0d0d4, 0xfff2c7];

  const loader = new THREE.TextureLoader();

  function createFrame(work, index, side) {
    const group = new THREE.Group();

    const fIdx = index % frameColors.length;
    const frameColor = frameColors[fIdx];
    const borderColor = frameBorderColors[fIdx];

    const outerGeo = new THREE.BoxGeometry(1.4, 2.0, 0.12);
    const outerMat = new THREE.MeshStandardMaterial({
      color: frameColor,
      roughness: 0.7,
      metalness: 0.2,
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    group.add(outer);

    const innerGeo = new THREE.BoxGeometry(1.2, 1.8, 0.06);
    const innerMat = new THREE.MeshStandardMaterial({
      color: borderColor,
      roughness: 0.9,
      metalness: 0.05,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.z = 0.035;
    group.add(inner);

    const imgPlaneGeo = new THREE.PlaneGeometry(1.0, 1.4);
    const tex = loader.load(work.image);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const imgPlaneMat = new THREE.MeshBasicMaterial({ map: tex });
    const imgPlane = new THREE.Mesh(imgPlaneGeo, imgPlaneMat);
    imgPlane.position.z = 0.07;
    group.add(imgPlane);

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
    clickableMeshes.push(imgPlane);
    imgPlane.userData.work = work;
  }

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
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose && m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
  }

  function buildHumanAvatar(styleIndex) {
    clearAvatar();
    const bodyColors = [0x1b4f72, 0x7d6608, 0x196f3d, 0x922b21, 0x4a235a];
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

    const hairGeo = new THREE.SphereGeometry(
      0.34,
      16,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI / 1.3
    );
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

  function buildDogAvatar(styleIndex) {
    clearAvatar();

    const bodyColors = [0x3b2b1a, 0xd4a15f, 0x7b7b7b, 0xf4e3c3, 0x272727];
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
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.18, 1.05, 1.3);
    avatarGroup.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.18;
    avatarGroup.add(eyeR);

    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 10);
    const legMat = bodyMat;
    const legPos = [
      [-0.35, 0.3, 0.55],
      [0.35, 0.3, 0.55],
      [-0.35, 0.3, -0.55],
      [0.35, 0.3, -0.55],
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
  buildHumanAvatar(avatarStyleIndex);

  function updateAvatarTransform() {
    avatarGroup.position.copy(playerPos);
    avatarGroup.rotation.set(0, cameraYaw, 0);
  }
  updateAvatarTransform();

  // ---------- アバターチェンジ ----------
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
      updateAvatarTransform();
    });
  }
  if (btnDog) {
    btnDog.addEventListener('click', () => {
      avatarMode = 'dog';
      avatarStyleIndex = (avatarStyleIndex + 1) % 10;
      buildDogAvatar(avatarStyleIndex);
      setActiveButton(avatarMode);
      updateAvatarTransform();
    });
  }

  // ---------- カメラ操作（ドラッグで視点回転） ----------
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  const joyBg = document.getElementById('joy-bg'); // 先に取っておく

  canvas.addEventListener('pointerdown', (e) => {
    if (joyBg) {
      const rect = joyBg.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        return; // ジョイスティックエリアは無視
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

  // ---------- ジョイスティック ----------
  const joyStick = document.getElementById('joy-stick');

  let joyActive = false;
  let joyCenter = { x: 0, y: 0 };
  let joyVector = { x: 0, y: 0 };

  function updateJoyCenter() {
    if (!joyBg) return;
    const rect = joyBg.getBoundingClientRect();
    joyCenter.x = rect.left + rect.width / 2;
    joyCenter.y = rect.top + rect.height / 2;
  }

  if (joyBg && joyStick) {
    window.addEventListener('resize', updateJoyCenter);
    updateJoyCenter();

    const startJoy = (e) => {
      joyActive = true;
      const p = e.touches ? e.touches[0] : e;
      updateJoyCenter();
      moveJoy(e);
      document.addEventListener('pointermove', moveJoy);
      document.addEventListener('pointerup', endJoy);
      document.addEventListener('touchmove', moveJoy, { passive: false });
      document.addEventListener('touchend', endJoy);
      if (e.cancelable) e.preventDefault();
    };

    const moveJoy = (e) => {
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

  // ---------- 作品クリック（拡大パネル） ----------
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

  // ---------- レイアウト ----------
  function resizeRenderer() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resizeRenderer);
  resizeRenderer();

  // ---------- 移動制限 ----------
  function clampPlayerPosition() {
    const margin = 1.0;
    const maxX = corridorWidth / 2 - margin;
    const minX = -maxX;
    const nearZ = -2; // 手前
    const farZ = -corridorLength + 6; // 奥

    if (playerPos.x > maxX) playerPos.x = maxX;
    if (playerPos.x < minX) playerPos.x = minX;
    if (playerPos.z > nearZ) playerPos.z = nearZ;
    if (playerPos.z < farZ) playerPos.z = farZ;
  }

  // ---------- メインループ ----------
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    // ジョイスティックでプレイヤー移動
    if (
      joyActive ||
      Math.abs(joyVector.x) > 0.01 ||
      Math.abs(joyVector.y) > 0.01
    ) {
      const moveSpeed = 4.0;
      const forwardInput = -joyVector.y; // 上で前進
      const sideInput = joyVector.x;

      const forward = new THREE.Vector3(
        Math.sin(cameraYaw),
        0,
        -Math.cos(cameraYaw)
      );
      const right = new THREE.Vector3()
        .crossVectors(forward, new THREE.Vector3(0, 1, 0))
        .normalize();

      playerPos.addScaledVector(forward, forwardInput * moveSpeed * dt);
      playerPos.addScaledVector(right, sideInput * moveSpeed * dt);
      clampPlayerPosition();
      updateAvatarTransform();
    }

    // カメラ位置（プレイヤーの後ろから見る）
    const dir = new THREE.Vector3(
      Math.sin(cameraYaw) * Math.cos(cameraPitch),
      Math.sin(cameraPitch),
      -Math.cos(cameraYaw) * Math.cos(cameraPitch)
    );
    const camDistance = 4.5;
    const heightOffset = 1.6;

    const target = playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)); // アバター頭あたり
    const camPos = target.clone().sub(dir.multiplyScalar(camDistance));
    camPos.y += heightOffset;

    camera.position.copy(camPos);
    camera.lookAt(target);

    renderer.render(scene, camera);
  }

  animate();
})();
