// app.js - OrbitControlsなしのシンプル版
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
  scene.background = new THREE.Color(0x050510); // 少し明るめの紺

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  camera.position.set(0, 1.6, 6);
  camera.lookAt(0, 1.6, -10);

  // ---------- light ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(3, 5, 2);
  scene.add(dir);

  // ---------- floor & walls ----------
  const floorGeo = new THREE.PlaneGeometry(20, 200);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x303030,
    roughness: 1,
    metalness: 0
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
    color: 0x111118,
    roughness: 0.9,
    metalness: 0.1
  });

  const wallLeftGeo = new THREE.PlaneGeometry(200, 3.2);
  const wallLeft = new THREE.Mesh(wallLeftGeo, wallMat);
  wallLeft.position.set(-3, 1.6, -100);
  wallLeft.rotation.y = Math.PI / 2;
  scene.add(wallLeft);

  const wallRight = wallLeft.clone();
  wallRight.position.x = 3;
  wallRight.rotation.y = -Math.PI / 2;
  scene.add(wallRight);

  // ---------- works (frames + images) ----------
  const textureLoader = new THREE.TextureLoader();
  const clickableMeshes = [];

  const frameWidth = 1.2;
  const frameHeight = 1.2;
  const spacingZ = 2.6;

  (WORKS || []).forEach(function (work, index) {
    const side = index % 2 === 0 ? -1 : 1;   // 左右
    const idxOnSide = Math.floor(index / 2); // 奥行きインデックス
    const z = -idxOnSide * spacingZ - 4;

    // フレーム（白でハッキリ見えるように）
    const frameGeo = new THREE.PlaneGeometry(frameWidth, frameHeight);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.4
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.set(side * 2.3, 1.6, z);
    scene.add(frameMesh);

    // 作品本体
    const planeGeo = new THREE.PlaneGeometry(1.0, 1.0);
    const tex = textureLoader.load(work.image);
    const planeMat = new THREE.MeshStandardMaterial({
      map: tex,
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0
    });
    const artMesh = new THREE.Mesh(planeGeo, planeMat);
    artMesh.position.set(side * 2.3, 1.6, z + 0.01 * side);
    artMesh.userData.work = work;
    scene.add(artMesh);

    clickableMeshes.push(artMesh);
  });

  // ---------- カメラ前後（← → ボタン） ----------
  const btnForward = document.getElementById('btn-forward');
  const btnBack = document.getElementById('btn-back');

  btnForward.addEventListener('click', function () { moveCamera(-1); });
  btnBack.addEventListener('click', function () { moveCamera(1); });

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function moveCamera(direction) {
    const step = spacingZ;
    const minZ = -spacingZ * (Math.ceil(WORKS.length / 2)) - 4;
    const maxZ = 6;

    camera.position.z += direction * step;
    camera.position.z = clamp(camera.position.z, minZ, maxZ);
  }

  // ---------- ドラッグ回転（シーン全体を回す） ----------
  let dragging = false;
  let lastX = 0;

  canvas.addEventListener('pointerdown', function (e) {
    dragging = true;
    lastX = e.clientX;
  });

  window.addEventListener('pointerup', function () {
    dragging = false;
  });
  window.addEventListener('pointerleave', function () {
    dragging = false;
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    scene.rotation.y += dx * 0.005;
  });

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
