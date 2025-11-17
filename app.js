// app.js - 3人称視点＋アバター切替＋額装＆スポットライト付き TAF DOG MUSEUM
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
  scene.background = new THREE.Color(0x050509);

  // ---------- camera ----------
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );

  let viewAngle = 0; // 左右の向き（ドラッグで変更）

  // ---------- lights ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 0.45);
  dir.position.set(4, 6, 3);
  scene.add(dir);

  // 天井の連続ライト（廊下中央）
  const ceilingStripMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 18; i++) {
    const geo = new THREE.PlaneGeometry(1.8, 0.5);
    const mesh = new THREE.Mesh(geo, ceilingStripMat);
    mesh.position.set(0, 3.18, -3 - i * 4);
    mesh.rotation.x = Math.PI / 2;
    scene.add(mesh);
  }

  // ---------- gallery geometry ----------
  const floorGeo = new THREE.PlaneGeometry(8, 240);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x222226,
    roughness: 0.9,
    metalness: 0.08
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
    color: 0xf2f2f4,
    roughness: 0.9,
    metalness: 0.02
  });

  const wallGeo = new THREE.PlaneGeometry(240, 3.2);
  const wallLeft = new THREE.Mesh(wallGeo, wallMat);
  wallLeft.position.set(-3, 1.6, -120);
  wallLeft.rotation.y = Math.PI / 2;
  scene.add(wallLeft);

  const wallRight = wallLeft.clone();
  wallRight.position.x = 3;
  wallRight.rotation.y = -Math.PI / 2;
  scene.add(wallRight);

  // 巾木
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x9a9a9f,
    roughness: 0.5,
    metalness: 0.1
  });
  const baseGeo = new THREE.BoxGeometry(0.08, 0.3, 240);
  const baseLeft = new THREE.Mesh(baseGeo, baseMat);
  baseLeft.position.set(-2.96, 0.15, -120);
  scene.add(baseLeft);
  const baseRight = baseLeft.clone();
  baseRight.position.x = 2.96;
  scene.add(baseRight);

  // ---------- アバター ----------
  const avatar = new THREE.Object3D();
  avatar.position.set(0, 0, 6); // 廊下の手前スタート
  scene.add(avatar);

  const avatarHuman = new THREE.Group();
  const avatarDog = new THREE.Group();
  avatar.add(avatarHuman);
  avatar.add(avatarDog);

  // 人アバター
  (function buildHuman(g) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe8ecff,
      roughness: 0.45,
      metalness: 0.15
    });
    const bodyGeo = new THREE.CylinderGeometry(0.25, 0.28, 0.8, 18);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.9;
    g.add(body);

    const headGeo = new THREE.SphereGeometry(0.32, 18, 18);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.y = 1.45;
    g.add(head);

    const footGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.22, 12);
    const lf = new THREE.Mesh(footGeo, mat);
    const rf = lf.clone();
    lf.position.set(-0.11, 0.11, 0.05);
    rf.position.set(0.11, 0.11, 0.05);
    g.add(lf, rf);
  })(avatarHuman);

  // 犬アバター（簡単なローポリ犬）
  (function buildDog(g) {
    const matBody = new THREE.MeshStandardMaterial({
      color: 0xf4c47a,
      roughness: 0.6,
      metalness: 0.05
    });
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.35, 1.0);
    const body = new THREE.Mesh(bodyGeo, matBody);
    body.position.set(0, 0.45, 0);
    g.add(body);

    const headGeo = new THREE.BoxGeometry(0.55, 0.5, 0.55);
    const head = new THREE.Mesh(headGeo, matBody);
    head.position.set(0, 0.85, 0.2);
    g.add(head);

    const legGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.35, 8);
    const fl = new THREE.Mesh(legGeo, matBody);
    const fr = fl.clone();
    const bl = fl.clone();
    const br = fl.clone();
    fl.position.set(-0.23, 0.18, 0.32);
    fr.position.set(0.23, 0.18, 0.32);
    bl.position.set(-0.23, 0.18, -0.32);
    br.position.set(0.23, 0.18, -0.32);
    g.add(fl, fr, bl, br);

    const tailGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8);
    const tail = new THREE.Mesh(tailGeo, matBody);
    tail.position.set(0, 0.7, -0.45);
    tail.rotation.x = Math.PI / 4;
    g.add(tail);
  })(avatarDog);

  avatarHuman.visible = true;
  avatarDog.visible = false;

  function setAvatar(type) {
    if (type === 'dog') {
      avatarHuman.visible = false;
      avatarDog.visible = true;
    } else {
      avatarHuman.visible = true;
      avatarDog.visible = false;
    }
  }

  // UIで切り替え
  const avatarButtons = document.querySelectorAll('.avatar-btn');
  avatarButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.avatar;
      setAvatar(type);
      avatarButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ---------- works ----------
  const textureLoader = new THREE.TextureLoader();
  const clickableMeshes = [];

  const frameWidth = 1.4;
  const frameHeight = 1.4;
  const spacingZ = 3.0;

  (WORKS || []).forEach(function (work, index) {
    const side = index % 2 === 0 ? -1 : 1; // 左右交互（-1:左, 1:右）
    const idxOnSide = Math.floor(index / 2);
    const z = -idxOnSide * spacingZ - 4;

    // グループ（壁に貼り付け）
    const group = new THREE.Group();
    group.position.set(side * 2.95, 1.6, z); // 壁のほぼ手前
    group.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(group);

    // 外枠フレーム
    const outerGeo = new THREE.PlaneGeometry(frameWidth, frameHeight);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.4,
      roughness: 0.35
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    group.add(outer);

    // マット（白い内枠）
    const matGeo = new THREE.PlaneGeometry(1.32, 1.32);
    const matMat = new THREE.MeshStandardMaterial({
      color: 0xfaf5ea,
      roughness: 1.0,
      metalness: 0.0
    });
    const matPlane = new THREE.Mesh(matGeo, matMat);
    matPlane.position.z = 0.01;
    group.add(matPlane);

    // 絵
    const artGeo = new THREE.PlaneGeometry(1.18, 1.18);
    const tex = textureLoader.load(work.image);
    const artMat = new THREE.MeshStandardMaterial({
      map: tex,
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.02
    });
    const artMesh = new THREE.Mesh(artGeo, artMat);
    artMesh.position.z = 0.02;
    artMesh.userData.work = work;
    group.add(artMesh);

    clickableMeshes.push(artMesh);

    // 各作品用スポットライト
    const spot = new THREE.SpotLight(0xffffff, 1.0, 7, Math.PI / 7, 0.4, 1.2);
    const lightX = side * 1.6; // 通路側に少し寄せて当てる
    spot.position.set(lightX, 3.1, z);
    const target = new THREE.Object3D();
    target.position.set(group.position.x, group.position.y + 0.1, group.position.z);
    scene.add(target);
    spot.target = target;
    scene.add(spot);
  });

  // ---------- ドラッグで視点回転 ----------
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
    viewAngle -= dx * 0.004;
  });

  // ---------- ジョイスティック ----------
  const joyBg = document.getElementById('joy-bg');
  const joyStick = document.getElementById('joy-stick');
  const joyRect = { x: 0, y: 0, r: 0 };
  let joyActive = false;
  let joyDX = 0;
  let joyDY = 0;

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

      const forwardInput = -joyDY; // 上：前進
      const strafeInput = joyDX;

      const cosA = Math.cos(viewAngle);
      const sinA = Math.sin(viewAngle);

      moveZ = (forwardInput * cosA - strafeInput * sinA) * speed;
      moveX = (forwardInput * sinA + strafeInput * cosA) * speed * 0.7;
    }

    if (moveZ !== 0 || moveX !== 0) {
      const rows = Math.ceil((WORKS || []).length / 2);
      const minZ = -spacingZ * rows - 6;
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
    const camOffset = new THREE.Vector3(0, 2.6, 5.0);
    camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), viewAngle);

    const camPos = avatar.position.clone().add(camOffset);
    camera.position.copy(camPos);
    camera.lookAt(
      avatar.position.x,
      avatar.position.y + 1.3,
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
