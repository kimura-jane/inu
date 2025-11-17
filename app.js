// app.js - 3人称視点＋ジョイスティック歩行の TAF DOG MUSEUM
(function () {
  const canvas = document.getElementById('scene');

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  resizeRenderer();

  // ---------- scene ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080810);

  // ---------- camera ----------
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );

  // 視点の回転（ドラッグで変更）
  let viewAngle = 0;

  // ---------- lights ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(4, 6, 3);
  scene.add(dir);

  // 天井ライト
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 16; i++) {
    const geo = new THREE.PlaneGeometry(1.8, 0.5);
    const mesh = new THREE.Mesh(geo, lightMat);
    mesh.position.set(0, 3.15, -3 - i * 4);
    mesh.rotation.x = Math.PI / 2;
    scene.add(mesh);
  }

  // ---------- gallery geometry ----------
  const floorGeo = new THREE.PlaneGeometry(8, 220);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.9,
    metalness: 0.1
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  const ceiling = floor.clone();
  ceiling.position.y = 3.2;
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf3f3f3,
    roughness: 0.8,
    metalness: 0.0
  });

  const wallGeo = new THREE.PlaneGeometry(220, 3.2);
  const wallLeft = new THREE.Mesh(wallGeo, wallMat);
  wallLeft.position.set(-3, 1.6, -110);
  wallLeft.rotation.y = Math.PI / 2;
  scene.add(wallLeft);

  const wallRight = wallLeft.clone();
  wallRight.position.x = 3;
  wallRight.rotation.y = -Math.PI / 2;
  scene.add(wallRight);

  // 巾木
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.6 });
  const baseGeo = new THREE.BoxGeometry(0.08, 0.3, 220);
  const baseLeft = new THREE.Mesh(baseGeo, baseMat);
  baseLeft.position.set(-2.96, 0.15, -110);
  scene.add(baseLeft);
  const baseRight = baseLeft.clone();
  baseRight.position.x = 2.96;
  scene.add(baseRight);

  // ---------- アバター ----------
  const avatar = new THREE.Object3D();
  avatar.position.set(0, 0, 6); // 廊下の手前スタート
  scene.add(avatar);

  const avatarMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeff,
    roughness: 0.5,
    metalness: 0.1
  });

  // 体
  const bodyGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 16);
  const body = new THREE.Mesh(bodyGeo, avatarMat);
  body.position.y = 0.9;
  avatar.add(body);

  // 頭
  const headGeo = new THREE.SphereGeometry(0.32, 16, 16);
  const head = new THREE.Mesh(headGeo, avatarMat);
  head.position.y = 1.45;
  avatar.add(head);

  // ---------- works ----------
  const textureLoader = new THREE.TextureLoader();
  const clickableMeshes = [];

  const frameWidth = 1.4;
  const frameHeight = 1.4;
  const spacingZ = 3.0;

  (WORKS || []).forEach(function (work, index) {
    const side = index % 2 === 0 ? -1 : 1; // 左右交互
    const idxOnSide = Math.floor(index / 2);
    const z = -idxOnSide * spacingZ - 4;

    // 額縁（壁に近づける：x=±2.8 くらい）
    const frameGeo = new THREE.PlaneGeometry(frameWidth, frameHeight);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.2,
      roughness: 0.5
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.set(side * 2.8, 1.6, z);
    scene.add(frameMesh);

    // 絵（z-fighting防止でほんの少しだけ浮かせる）
    const planeGeo = new THREE.PlaneGeometry(1.2, 1.2);
    const tex = textureLoader.load(work.image);
    const planeMat = new THREE.MeshStandardMaterial({
      map: tex,
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.0
    });
    const artMesh = new THREE.Mesh(planeGeo, planeMat);
    artMesh.position.set(side * 2.8, 1.6, z + 0.01 * side);
    artMesh.userData.work = work;
    scene.add(artMesh);

    clickableMeshes.push(artMesh);
  });

  // ---------- ドラッグで視点回転（scene ではなく viewAngle を変える） ----------
  let dragging = false;
  let lastX = 0;

  canvas.addEventListener('pointerdown', function (e) {
    dragging = true;
    lastX = e.clientX;
  });

  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointerleave', () => { dragging = false; });

  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    viewAngle -= dx * 0.004; // 左右にぐるっと回す
  });

  // ---------- ジョイスティック ----------
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');
  const joyRect = { x: 0, y: 0, r: 0 };
  let joyActive = false;
  let joyDX = 0; // 左右（右＋）
  let joyDY = 0; // 前後（上− 下＋）

  function updateJoyRect() {
    const rect = joyBg.getBoundingClientRect();
    joyRect.x = rect.left + rect.width / 2;
    joyRect.y = rect.top + rect.height / 2;
    joyRect.r = rect.width / 2;
  }
  updateJoyRect();
  window.addEventListener('resize', updateJoyRect);

  joyBg.addEventListener('pointerdown', function (e) {
    joyActive = true;
    joyBg.setPointerCapture(e.pointerId);
    handleJoyMove(e);
  });

  joyBg.addEventListener('pointermove', function (e) {
    if (!joyActive) return;
    handleJoyMove(e);
  });

  joyBg.addEventListener('pointerup', function () {
    joyActive = false;
    joyDX = 0;
    joyDY = 0;
    joyStick.style.transform = 'translate(-50%, -50%)';
  });

  function handleJoyMove(e) {
    const dx = e.clientX - joyRect.x;
    const dy = e.clientY - joyRect.y;
    const max = joyRect.r - 16;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const ratio = dist > max ? max / dist : 1;
    const ndx = dx * ratio;
    const ndy = dy * ratio;

    joyDX = ndx / max; // -1〜1
    joyDY = ndy / max; // -1〜1

    joyStick.style.transform =
      `translate(calc(-50% + ${ndx}px), calc(-50% + ${ndy}px))`;
  }

  // ---------- タップで作品詳細 ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  canvas.addEventListener('click', onTap);

  function onTap(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    pointer.set(x, y);

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clickableMeshes, false);
    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const work = mesh.userData.work;
      if (work) showInfo(work);
    }
  }

  const infoPanel = document.getElementById('info-panel');
  const infoClose = document.getElementById('info-close');
  const infoImage = document.getElementById('info-image');
  const infoTitle = document.getElementById('info-title');
  const infoDesc = document.getElementById('info-desc');

  function showInfo(work) {
    infoImage.src = work.image;
    infoTitle.textContent = work.title || ('TAF DOG #' + work.id);
    infoDesc.textContent = work.description || '';
    infoPanel.classList.remove('hidden');
  }

  infoClose.addEventListener('click', function () {
    infoPanel.classList.add('hidden');
  });

  infoPanel.addEventListener('click', function (e) {
    if (e.target === infoPanel) {
      infoPanel.classList.add('hidden');
    }
  });

  // ---------- アニメーション ----------
  function animate() {
    requestAnimationFrame(animate);

    const deadZone = 0.12;
    let moveX = 0;
    let moveZ = 0;

    if (Math.abs(joyDX) > deadZone || Math.abs(joyDY) > deadZone) {
      const speedBase = 0.07;
      const mag = Math.min(1, Math.hypot(joyDX, joyDY));
      const speed = speedBase * mag;

      // 「前後」と「左右」を viewAngle に合わせて回転させて移動
      const forwardInput = -joyDY; // 上に倒すと +1
      const strafeInput = joyDX;

      const cosA = Math.cos(viewAngle);
      const sinA = Math.sin(viewAngle);

      // 視線方向に対して前後・左右
      moveZ = (forwardInput * cosA - strafeInput * sinA) * speed;
      moveX = (forwardInput * sinA + strafeInput * cosA) * speed * 0.7;
    }

    if (moveZ !== 0 || moveX !== 0) {
      const minZ = -spacingZ * (Math.ceil(WORKS.length / 2)) - 6;
      const maxZ = 6;
      const minX = -2.0;
      const maxX = 2.0;

      avatar.position.z += moveZ;
      avatar.position.x += moveX;

      if (avatar.position.z < minZ) avatar.position.z = minZ;
      if (avatar.position.z > maxZ) avatar.position.z = maxZ;
      if (avatar.position.x < minX) avatar.position.x = minX;
      if (avatar.position.x > maxX) avatar.position.x = maxX;
    }

    // カメラをアバターの少し後ろ＆上に配置（3人称）
    const camOffset = new THREE.Vector3(0, 2.6, 5.2); // 高さ・距離
    camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), viewAngle);

    const camPos = avatar.position.clone().add(camOffset);
    camera.position.copy(camPos);
    camera.lookAt(
      avatar.position.x,
      avatar.position.y + 1.4,
      avatar.position.z
    );

    renderer.render(scene, camera);
  }
  animate();

  // ---------- リサイズ ----------
  window.addEventListener('resize', function () {
    resizeRenderer();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  function resizeRenderer() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
  }
})();
