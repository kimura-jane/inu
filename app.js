// app.js
// Three.js のグローバル版前提（<script src="three.min.js"></script> のやつ）

(function () {
  // ========= DOM 取得 =========
  const canvas =
    document.getElementById("webgl") ||
    document.querySelector("canvas");

  const btnHuman =
    document.getElementById("avatar-human") ||
    document.querySelector('[data-avatar="human"]');

  const btnDog =
    document.getElementById("avatar-dog") ||
    document.querySelector('[data-avatar="dog"]');

  const joystickBase =
    document.getElementById("joystick") ||
    document.getElementById("joystick-base");

  const joystickStick =
    document.getElementById("joystick-stick") ||
    (joystickBase ? joystickBase.firstElementChild : null);

  const viewerEl = document.getElementById("viewer");
  const viewerImg = document.getElementById("viewer-image");
  const viewerTitle = document.getElementById("viewer-title");
  const viewerClose =
    document.getElementById("viewer-close") ||
    (viewerEl ? viewerEl.querySelector(".viewer-close") : null);

  // ========= Three.js 基本セットアップ =========
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101014);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.outputEncoding = THREE.sRGBEncoding;

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  // アバター基準にカメラを置くための pivot
  const cameraPivot = new THREE.Object3D();
  cameraPivot.add(camera);
  scene.add(cameraPivot);

  // ========= ライティング =========
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x404040, 0.9);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // ========= ルーム（ギャラリー） =========
  const ROOM_WIDTH = 40;
  const ROOM_DEPTH = 40;
  const ROOM_HEIGHT = 10;

  function createRoom() {
    const materialWall = new THREE.MeshStandardMaterial({
      color: 0xf3f3f3,
      roughness: 0.9,
      metalness: 0.0,
    });

    const materialFloor = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      roughness: 1.0,
      metalness: 0.0,
    });

    const materialCeiling = new THREE.MeshStandardMaterial({
      color: 0xf8f8f8,
      roughness: 0.9,
      metalness: 0.0,
    });

    // 床
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
      materialFloor
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // 天井
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
      materialCeiling
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = ROOM_HEIGHT;
    scene.add(ceiling);

    // 壁（4枚）
    const wallGeomFrontBack = new THREE.PlaneGeometry(
      ROOM_WIDTH,
      ROOM_HEIGHT
    );
    const wallGeomLeftRight = new THREE.PlaneGeometry(
      ROOM_DEPTH,
      ROOM_HEIGHT
    );

    // 奥（Z マイナス）
    const wallBack = new THREE.Mesh(wallGeomFrontBack, materialWall);
    wallBack.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
    wallBack.rotation.y = 0;
    scene.add(wallBack);

    // 手前（Z プラス）
    const wallFront = new THREE.Mesh(wallGeomFrontBack, materialWall);
    wallFront.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
    wallFront.rotation.y = Math.PI;
    scene.add(wallFront);

    // 右（X プラス）
    const wallRight = new THREE.Mesh(wallGeomLeftRight, materialWall);
    wallRight.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    wallRight.rotation.y = -Math.PI / 2;
    scene.add(wallRight);

    // 左（X マイナス）
    const wallLeft = new THREE.Mesh(wallGeomLeftRight, materialWall);
    wallLeft.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    wallLeft.rotation.y = Math.PI / 2;
    scene.add(wallLeft);

    return { wallBack, wallFront, wallRight, wallLeft };
  }

  const walls = createRoom();

  // ========= スポットライト（絵用） =========
  const artworkSpotlights = [];

  function createSpotlight(x, z) {
    const spot = new THREE.SpotLight(0xffffff, 1.1, 25, Math.PI / 4, 0.3);
    spot.position.set(x, ROOM_HEIGHT - 1, z);
    spot.target.position.set(x, ROOM_HEIGHT * 0.45, z + 0.1);
    scene.add(spot);
    scene.add(spot.target);
    artworkSpotlights.push(spot);
  }

  // ========= アートワーク配置 =========
  const artworkMeshes = []; // クリック判定用

  const textureLoader = new THREE.TextureLoader();

  function createFrameWithImage(work) {
    const frameWidth = 3.2;
    const frameHeight = 4.0;
    const frameDepth = 0.15;

    const frameGeom = new THREE.BoxGeometry(
      frameWidth,
      frameHeight,
      frameDepth
    );

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x2b2b2b,
      roughness: 0.6,
      metalness: 0.1,
    });

    const frameMesh = new THREE.Mesh(frameGeom, frameMat);

    // 画像テクスチャ
    const imgGeom = new THREE.PlaneGeometry(
      frameWidth * 0.9,
      frameHeight * 0.9
    );

    const group = new THREE.Group();
    group.add(frameMesh);

    textureLoader.load(
      work.image,
      (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        // モザイク軽減（線形フィルタ）
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

        const imgMat = new THREE.MeshBasicMaterial({
          map: texture,
        });
        const imgMesh = new THREE.Mesh(imgGeom, imgMat);
        imgMesh.position.z = frameDepth / 2 + 0.01;
        group.add(imgMesh);
      },
      undefined,
      () => {
        // 読み込み失敗時はグレー板
        const fallbackMat = new THREE.MeshBasicMaterial({
          color: 0x555555,
        });
        const imgMesh = new THREE.Mesh(imgGeom, fallbackMat);
        imgMesh.position.z = frameDepth / 2 + 0.01;
        group.add(imgMesh);
      }
    );

    group.userData.work = work;
    artworkMeshes.push(group);
    return group;
  }

  function layoutArtworks() {
    if (!window.WORKS || !Array.isArray(window.WORKS)) return;

    const works = window.WORKS;
    const total = works.length;
    const wallCount = 4;
    const worksPerWall = Math.ceil(total / wallCount);

    const wallDefs = [
      {
        // 奥（Z マイナス）
        center: new THREE.Vector3(0, ROOM_HEIGHT * 0.5, -ROOM_DEPTH / 2 + 0.05),
        width: ROOM_WIDTH - 4,
        normal: new THREE.Vector3(0, 0, 1),
        rotY: 0,
      },
      {
        // 右（X プラス）
        center: new THREE.Vector3(ROOM_WIDTH / 2 - 0.05, ROOM_HEIGHT * 0.5, 0),
        width: ROOM_DEPTH - 4,
        normal: new THREE.Vector3(-1, 0, 0),
        rotY: -Math.PI / 2,
      },
      {
        // 手前（Z プラス）
        center: new THREE.Vector3(0, ROOM_HEIGHT * 0.5, ROOM_DEPTH / 2 - 0.05),
        width: ROOM_WIDTH - 4,
        normal: new THREE.Vector3(0, 0, -1),
        rotY: Math.PI,
      },
      {
        // 左（X マイナス）
        center: new THREE.Vector3(-ROOM_WIDTH / 2 + 0.05, ROOM_HEIGHT * 0.5, 0),
        width: ROOM_DEPTH - 4,
        normal: new THREE.Vector3(1, 0, 0),
        rotY: Math.PI / 2,
      },
    ];

    artworkMeshes.length = 0; // クリア

    let workIndex = 0;

    for (let w = 0; w < wallDefs.length; w++) {
      if (workIndex >= total) break;

      const def = wallDefs[w];
      const remain = total - workIndex;
      const count = Math.min(worksPerWall, remain);

      const spacing =
        count > 1 ? def.width / (count - 1) : 0;

      for (let i = 0; i < count; i++) {
        const work = works[workIndex++];

        const frameGroup = createFrameWithImage(work);

        const offset =
          -def.width / 2 + i * spacing;

        const pos = def.center.clone();
        if (Math.abs(def.normal.z) > 0) {
          // Z ± の壁 → X 方向に並べる
          pos.x += offset;
        } else {
          // X ± の壁 → Z 方向に並べる
          pos.z += offset;
        }

        frameGroup.position.copy(pos);
        frameGroup.rotation.y = def.rotY;
        scene.add(frameGroup);

        // スポットライト
        createSpotlight(pos.x, pos.z);
      }
    }
  }

  layoutArtworks();

  // ========= アバター =========
  const avatarGroup = new THREE.Group();
  scene.add(avatarGroup);

  // 人間アバター
  const humanGroup = new THREE.Group();
  avatarGroup.add(humanGroup);

  (function createHuman() {
    const bodyMatBlue = new THREE.MeshStandardMaterial({
      color: 0x1f4bff,
      roughness: 0.7,
      metalness: 0.05,
    });

    const headMat = new THREE.MeshStandardMaterial({
      color: 0xf1c27d,
      roughness: 0.7,
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.6,
    });

    const bodyGeo = new THREE.CylinderGeometry(0.8, 0.8, 4.0, 24);
    const body = new THREE.Mesh(bodyGeo, bodyMatBlue);
    body.position.y = 2.0;
    humanGroup.add(body);

    const headGeo = new THREE.SphereGeometry(1.1, 32, 32);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 4.4;
    humanGroup.add(head);

    const hairGeo = new THREE.SphereGeometry(1.1, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 4.7;
    humanGroup.add(hair);

    const feetGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.5, 16);
    const feetMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
    });

    const leftFoot = new THREE.Mesh(feetGeo, feetMat);
    leftFoot.position.set(-0.35, 0.25, 0);
    const rightFoot = new THREE.Mesh(feetGeo, feetMat);
    rightFoot.position.set(0.35, 0.25, 0);
    humanGroup.add(leftFoot);
    humanGroup.add(rightFoot);
  })();

  // 犬アバター（ざっくりでOK）
  const dogGroup = new THREE.Group();
  avatarGroup.add(dogGroup);

  (function createDog() {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xc88f4f,
      roughness: 0.6,
    });
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xd9a066,
      roughness: 0.6,
    });
    const earMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.6,
    });

    const bodyGeo = new THREE.CylinderGeometry(0.7, 0.8, 2.0, 20);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2;
    dogGroup.add(body);

    const headGeo = new THREE.SphereGeometry(0.9, 24, 24);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.4;
    head.position.z = 0.4;
    dogGroup.add(head);

    const earGeo = new THREE.BoxGeometry(0.2, 0.8, 0.1);
    const earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.55, 2.6, 0.3);
    const earR = earL.clone();
    earR.position.x *= -1;
    dogGroup.add(earL);
    dogGroup.add(earR);

    const legGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 12);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x3b2b1a,
    });
    const legPositions = [
      [-0.35, 0.3, 0.35],
      [0.35, 0.3, 0.35],
      [-0.35, 0.3, -0.35],
      [0.35, 0.3, -0.35],
    ];
    legPositions.forEach((p) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(p[0], p[1], p[2]);
      dogGroup.add(leg);
    });

    dogGroup.visible = false; // 初期は人間
  })();

  avatarGroup.position.set(0, 0, 10);
  cameraPivot.position.copy(avatarGroup.position);

  // カメラを少し後ろに
  camera.position.set(0, 3.5, 7);
  camera.lookAt(new THREE.Vector3(0, 3, 0));

  let currentAvatar = "human";

  function setAvatar(type) {
    currentAvatar = type;

    if (type === "human") {
      humanGroup.visible = true;
      dogGroup.visible = false;
    } else {
      humanGroup.visible = false;
      dogGroup.visible = true;
    }

    if (btnHuman && btnDog) {
      const activeClass = "is-active";
      if (type === "human") {
        btnHuman.classList.add(activeClass);
        btnDog.classList.remove(activeClass);
      } else {
        btnDog.classList.add(activeClass);
        btnHuman.classList.remove(activeClass);
      }
    }
  }

  if (btnHuman) {
    btnHuman.addEventListener("click", () => setAvatar("human"));
  }
  if (btnDog) {
    btnDog.addEventListener("click", () => setAvatar("dog"));
  }

  setAvatar("human");

  // ========= カメラのドラッグ操作 =========
  let isDragging = false;
  let lastPointer = { x: 0, y: 0 };
  let yaw = 0; // 左右
  let pitch = 0.15; // 上下

  function updateCameraFromAngles() {
    const radius = 7;
    const offset = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch) * radius,
      Math.sin(pitch) * radius + 3.0,
      Math.cos(yaw) * Math.cos(pitch) * radius
    );

    camera.position.copy(avatarGroup.position).add(offset);
    camera.lookAt(
      avatarGroup.position.clone().setY(avatarGroup.position.y + 2.5)
    );
    cameraPivot.position.copy(avatarGroup.position);
  }

  canvas.addEventListener("pointerdown", (e) => {
    // ジョイスティック上の pointerdown は別処理に任せる
    if (e.target === joystickBase || e.target === joystickStick) return;
    isDragging = true;
    lastPointer.x = e.clientX;
    lastPointer.y = e.clientY;
  });

  window.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    lastPointer.x = e.clientX;
    lastPointer.y = e.clientY;

    const ROT_SPEED = 0.005;
    yaw -= dx * ROT_SPEED;
    pitch -= dy * ROT_SPEED;
    const maxPitch = Math.PI / 3;
    const minPitch = -Math.PI / 6;
    pitch = Math.max(minPitch, Math.min(maxPitch, pitch));

    updateCameraFromAngles();
  });

  window.addEventListener("pointerup", () => {
    isDragging = false;
  });

  // ========= ジョイスティック =========
  let joyActive = false;
  let joyCenter = { x: 0, y: 0 };
  let joyVector = { x: 0, y: 0 }; // -1〜1

  function setJoystickStick(dx, dy) {
    if (!joystickStick) return;
    joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function handleJoyStart(e) {
    if (!joystickBase) return;

    joyActive = true;
    const rect = joystickBase.getBoundingClientRect();
    joyCenter.x = rect.left + rect.width / 2;
    joyCenter.y = rect.top + rect.height / 2;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    handleJoyMoveInternal(clientX, clientY);
  }

  function handleJoyMove(e) {
    if (!joyActive) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    handleJoyMoveInternal(clientX, clientY);
  }

  function handleJoyMoveInternal(clientX, clientY) {
    const dx = clientX - joyCenter.x;
    const dy = clientY - joyCenter.y;
    const maxR = (joystickBase.getBoundingClientRect().width || 120) / 2;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);

    const nx = (clampedDist * Math.cos(angle)) / maxR;
    const ny = (clampedDist * Math.sin(angle)) / maxR;

    // 上にドラッグ → 前に進むように Y を反転
    joyVector.x = nx;
    joyVector.y = -ny;

    const stickDx = clampedDist * Math.cos(angle);
    const stickDy = clampedDist * Math.sin(angle);
    setJoystickStick(stickDx, stickDy);
  }

  function handleJoyEnd() {
    joyActive = false;
    joyVector.x = 0;
    joyVector.y = 0;
    setJoystickStick(0, 0);
  }

  if (joystickBase) {
    joystickBase.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      handleJoyStart(e);
    });
    window.addEventListener("pointermove", (e) => {
      if (!joyActive) return;
      e.preventDefault();
      handleJoyMove(e);
    });
    window.addEventListener("pointerup", (e) => {
      if (!joyActive) return;
      e.preventDefault();
      handleJoyEnd();
    });

    // タッチ用
    joystickBase.addEventListener("touchstart", (e) => {
      e.preventDefault();
      handleJoyStart(e);
    });
    window.addEventListener("touchmove", (e) => {
      if (!joyActive) return;
      e.preventDefault();
      handleJoyMove(e);
    });
    window.addEventListener("touchend", (e) => {
      if (!joyActive) return;
      e.preventDefault();
      handleJoyEnd();
    });
  }

  // ========= 画像クリックで拡大表示 =========
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();

  function onCanvasClick(e) {
    if (!viewerEl || artworkMeshes.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    pointerNDC.set(x, y);

    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(artworkMeshes, true);
    if (hits.length === 0) return;

    let obj = hits[0].object;
    while (obj && !obj.userData.work && obj.parent) {
      obj = obj.parent;
    }
    if (!obj || !obj.userData.work) return;

    const work = obj.userData.work;
    if (viewerImg) viewerImg.src = work.image;
    if (viewerTitle) viewerTitle.textContent = work.title || "";
    viewerEl.classList.add("is-open");
  }

  if (canvas) {
    canvas.addEventListener("click", onCanvasClick);
  }
  if (viewerClose && viewerEl) {
    viewerClose.addEventListener("click", () =>
      viewerEl.classList.remove("is-open")
    );
    viewerEl.addEventListener("click", (e) => {
      if (e.target === viewerEl) {
        viewerEl.classList.remove("is-open");
      }
    });
  }

  // ========= リサイズ =========
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", onResize);
  onResize();

  // ========= メインループ =========
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    // ジョイスティックから移動
    const speed = 6.0;
    if (Math.abs(joyVector.x) > 0.02 || Math.abs(joyVector.y) > 0.02) {
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      const move = new THREE.Vector3();
      // 上に倒すと前（forward）へ
      move.addScaledVector(forward, joyVector.y * speed * dt);
      // 右に倒すと右へ
      move.addScaledVector(right, joyVector.x * speed * dt);

      avatarGroup.position.add(move);
      updateCameraFromAngles();
    }

    renderer.render(scene, camera);
  }

  updateCameraFromAngles();
  animate();
})();
