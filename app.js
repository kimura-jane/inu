// app.js - ジョイスティックで前後＋左右移動 & 美術館廊下
(function () {
  const canvas = document.getElementById('scene');

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  resizeRenderer();

  // ---------- scene & camera ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080810);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  camera.position.set(0, 1.6, 6);
  camera.lookAt(0, 1.6, -10);

  // ---------- lights ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(4, 6, 3);
  scene.add(dir);

  // 天井ライト
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 12; i++) {
    const geo = new THREE.PlaneGeometry(1.8, 0.5);
    const mesh = new THREE.Mesh(geo, lightMat);
    mesh.position.set(0, 3.15, -3 - i * 4);
    mesh.rotation.x = Math.PI / 2;
    scene.add(mesh);
  }

  // ---------- gallery geometry ----------
  const floorGeo = new THREE.PlaneGeometry(8, 200);
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

  const wallGeo = new THREE.PlaneGeometry(200, 3.2);
  const wallLeft = new THREE.Mesh(wallGeo, wallMat);
  wallLeft.position.set(-3, 1.6, -100);
  wallLeft.rotation.y = Math.PI / 2;
  scene.add(wallLeft);

  const wallRight = wallLeft.clone();
  wallRight.position.x = 3;
  wallRight.rotation.y = -Math.PI / 2;
  scene.add(wallRight);

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.6 });
  const baseGeo = new THREE.BoxGeometry(0.1, 0.3, 200);
  const baseLeft = new THREE.Mesh(baseGeo, baseMat);
  baseLeft.position.set(-2.95, 0.15, -100);
  scene.add(baseLeft);
  const baseRight = baseLeft.clone();
  baseRight.position.x = 2.95;
  scene.add(baseRight);

  // ---------- works ----------
  const textureLoader = new THREE.TextureLoader();
  const clickableMeshes = [];

  const frameWidth = 1.4;
  const frameHeight = 1.4;
  const spacingZ = 3.0;

  (WORKS || []).forEach(function (work, index) {
    const side = index % 2 === 0 ? -1 : 1;
    const idxOnSide = Math.floor(index / 2);
    const z = -idxOnSide * spacingZ - 4;

    const frameGeo = new THREE.PlaneGeometry(frameWidth, frameHeight);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.2,
      roughness: 0.5
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.set(side * 2.3, 1.6, z);
    scene.add(frameMesh);

    const planeGeo = new THREE.PlaneGeometry(1.2, 1.2);
    const tex = textureLoader.load(work.image);
    const planeMat = new THREE.MeshStandardMaterial({
      map: tex,
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.0
    });
    const artMesh = new THREE.Mesh(planeGeo, planeMat);
    artMesh.position.set(side * 2.3, 1.6, z + 0.01 * side);
    artMesh.userData.work = work;
    scene.add(artMesh);

    clickableMeshes.push(artMesh);
  });

  // ---------- ドラッグで視線回転 ----------
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
    scene.rotation.y += dx * 0.004;
  });

  // ---------- ジョイスティックで前後＋左右移動 ----------
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');
  const joyRect = { x: 0, y: 0, r: 0 };
  let joyActive = false;
  let joyDX = 0; // 左右
  let joyDY = 0; // 前後

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

    joyDX = ndx / max; // -1〜1（右が＋）
    joyDY = ndy / max; // -1〜1（下が＋）

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

  // ---------- ループ ----------
  function animate() {
    requestAnimationFrame(animate);

    const deadZone = 0.08;
    let moveX = 0;
    let moveZ = 0;

    if (Math.abs(joyDX) > deadZone || Math.abs(joyDY) > deadZone) {
      const speedBase = 0.12;
      const mag = Math.min(1, Math.hypot(joyDX, joyDY));
      const speed = speedBase * mag;

      const forward = -joyDY; // 上に倒すと前に進む
      const strafe = joyDX;   // 右に倒すと右へ

      moveZ = forward * speed;
      moveX = strafe * speed * 0.7;
    }

    if (moveZ !== 0 || moveX !== 0) {
      const minZ = -spacingZ * (Math.ceil(WORKS.length / 2)) - 4;
      const maxZ = 6;
      const minX = -2.2;
      const maxX = 2.2;

      camera.position.z += moveZ;
      camera.position.x += moveX;

      if (camera.position.z < minZ) camera.position.z = minZ;
      if (camera.position.z > maxZ) camera.position.z = maxZ;
      if (camera.position.x < minX) camera.position.x = minX;
      if (camera.position.x > maxX) camera.position.x = maxX;
    }

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
