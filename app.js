// app.js
// Three.js を <script> タグで読み込んでいる前提

window.addEventListener("load", () => {
  // ================== ここから中身 ==================

  // ========= DOM 取得 =========
  const canvas =
    document.getElementById("webgl") ||
    document.querySelector("canvas");

  // 「人間」「犬」ボタンを柔軟に検出
  function findAvatarButton(label) {
    if (label === "human") {
      return (
        document.getElementById("avatar-human") ||
        document.querySelector('[data-avatar="human"]')
      );
    }
    if (label === "dog") {
      return (
        document.getElementById("avatar-dog") ||
        document.querySelector('[data-avatar="dog"]')
      );
    }
    // テキストで探索（button以外の要素も見る）
    const candidates = Array.from(
      document.querySelectorAll("button, .avatar-btn, [data-avatar]")
    );
    if (label === "human") {
      return (
        candidates.find((el) =>
          el.textContent.trim().includes("人間")
        ) || null
      );
    }
    if (label === "dog") {
      return (
        candidates.find((el) =>
          el.textContent.trim().includes("犬")
        ) || null
      );
    }
    return null;
  }

  const btnHuman = findAvatarButton("human");
  const btnDog = findAvatarButton("dog");

  // ジョイスティック要素を柔軟に検出
  const joystickBase =
    document.getElementById("joystick") ||
    document.querySelector("[data-joystick]") ||
    document.querySelector(".joystick");

  const joystickStick =
    (joystickBase &&
      (joystickBase.querySelector(".joystick-stick") ||
        joystickBase.querySelector(".joystick__stick") ||
        joystickBase.querySelector(".stick"))) ||
    null;

  // モーダル系（あれば使用）
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

  // アバターを追うカメラ用 pivot
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
    const matWall = new THREE.MeshStandardMaterial({
      color: 0xf3f3f3,
      roughness: 0.9,
      metalness: 0.0,
    });

    const matFloor = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      roughness: 1.0,
      metalness: 0.0,
    });

    const matCeiling = new THREE.MeshStandardMaterial({
      color: 0xf8f8f8,
      roughness: 0.9,
      metalness: 0.0,
    });

    // floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
      matFloor
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    // ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
      matCeiling
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = ROOM_HEIGHT;
    scene.add(ceiling);

    // walls
    const wallGeomFrontBack = new THREE.PlaneGeometry(
      ROOM_WIDTH,
      ROOM_HEIGHT
    );
    const wallGeomLeftRight = new THREE.PlaneGeometry(
      ROOM_DEPTH,
      ROOM_HEIGHT
    );

    // back (Z-)
    const wallBack = new THREE.Mesh(wallGeomFrontBack, matWall);
    wallBack.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
    scene.add(wallBack);

    // front (Z+)
    const wallFront = new THREE.Mesh(wallGeomFrontBack, matWall);
    wallFront.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
    wallFront.rotation.y = Math.PI;
    scene.add(wallFront);

    // right (X+)
    const wallRight = new THREE.Mesh(wallGeomLeftRight, matWall);
    wallRight.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    wallRight.rotation.y = -Math.PI / 2;
    scene.add(wallRight);

    // left (X-)
    const wallLeft = new THREE.Mesh(wallGeomLeftRight, matWall);
    wallLeft.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    wallLeft.rotation.y = Math.PI / 2;
    scene.add(wallLeft);

    return { wallBack, wallFront, wallRight, wallLeft };
  }

  createRoom();

  // ========= アートワーク =========
  const artworkMeshes = [];
  const artworkSpotlights = [];
  const textureLoader = new THREE.TextureLoader();

  function createSpotlight(x, z) {
    const spot = new THREE.SpotLight(0xffffff, 1.1, 25, Math.PI / 4, 0.3);
    spot.position.set(x, ROOM_HEIGHT - 1, z);
    spot.target.position.set(x, ROOM_HEIGHT * 0.45, z + 0.1);
    scene.add(spot);
    scene.add(spot.target);
    artworkSpotlights.push(spot);
  }

  function createFrameWithImage(work) {
    const frameWidth = 3.0;
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
    const group = new THREE.Group();
    group.add(frameMesh);

    const imgGeom = new THREE.PlaneGeometry(
      frameWidth * 0.9,
      frameHeight * 0.9
    );

    textureLoader.load(
      work.image,
      (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

        const imgMat = new THREE.MeshBasicMaterial({ map: texture });
        const imgMesh = new THREE.Mesh(imgGeom, imgMat);
        imgMesh.position.z = frameDepth / 2 + 0.01;
        group.add(imgMesh);
      },
      undefined,
      () => {
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

    artworkMeshes.length = 0;
    artworkSpotlights.length = 0;

    const wallDefs = [
      {
        // back (Z-)
        center: new THREE.Vector3(0, ROOM_HEIGHT * 0.5, -ROOM_DEPTH / 2 + 0.05),
        width: ROOM_WIDTH - 6,
        rotY: 0,
        axis: "x",
      },
      {
        // right (X+)
        center: new THREE.Vector3(ROOM_WIDTH / 2 - 0.05, ROOM_HEIGHT * 0.5, 0),
        width: ROOM_DEPTH - 6,
        rotY: -Math.PI / 2,
        axis: "z",
      },
      {
        // front (Z+)
        center: new THREE.Vector3(0, ROOM_HEIGHT * 0.5, ROOM_DEPTH / 2 - 0.05),
        width: ROOM_WIDTH - 6,
        rotY: Math.PI,
        axis: "x",
      },
      {
        // left (X-)
        center: new THREE.Vector3(-ROOM_WIDTH / 2 + 0.05, ROOM_HEIGHT * 0.5, 0),
        width: ROOM_DEPTH - 6,
        rotY: Math.PI / 2,
        axis: "z",
      },
    ];

    let workIndex = 0;

    for (let w = 0; w < wallDefs.length; w++) {
      if (workIndex >= total) break;

      const def = wallDefs[w];
      const remain = total - workIndex;
      const count = Math.min(worksPerWall, remain);

      const maxSpacing = 4.0;
      const spacing = Math.min(maxSpacing, def.width / (count + 1));
      const start = -spacing * ((count - 1) / 2);

      for (let i = 0; i < count; i++) {
        const work = works[workIndex++];
        const group = createFrameWithImage(work);

        const offset = start + i * spacing;
        const pos = def.center.clone();

        if (def.axis === "x") {
          pos.x += offset;
        } else {
          pos.z += offset;
        }

        group.position.copy(pos);
        group.rotation.y = def.rotY;
        scene.add(group);

        createSpotlight(pos.x, pos.z);
      }
    }
  }

  layoutArtworks();

  // ========= アバター =========
  const avatarGroup = new THREE.Group();
  scene.add(avatarGroup);

  const humanGroup = new THREE.Group();
  const dogGroup = new THREE.Group();
  avatarGroup.add(humanGroup);
  avatarGroup.add(dogGroup);

  // 人間
  (function createHuman() {
    const matBody = new THREE.MeshStandardMaterial({
      color: 0x1f4bff,
      roughness: 0.7,
      metalness: 0.05,
    });
    const matHead = new THREE.MeshStandardMaterial({
      color: 0xf1c27d,
      roughness: 0.7,
    });
    const matHair = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.6,
    });
    const matFoot = new THREE.MeshStandardMaterial({
      color: 0x111111,
    });

    const bodyGeo = new THREE.CylinderGeometry(0.8, 0.8, 4.0, 24);
    const body = new THREE.Mesh(bodyGeo, matBody);
    body.position.y = 2.0;
    humanGroup.add(body);

    const headGeo = new THREE.SphereGeometry(1.1, 32, 32);
    const head = new THREE.Mesh(headGeo, matHead);
    head.position.y = 4.4;
    humanGroup.add(head);

    const hairGeo = new THREE.SphereGeometry(
      1.1,
      32,
      32,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    const hair = new THREE.Mesh(hairGeo, matHair);
    hair.position.y = 4.7;
    humanGroup.add(hair);

    const footGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.5, 16);
    const leftFoot = new THREE.Mesh(footGeo, matFoot);
    leftFoot.position.set(-0.35, 0.25, 0);
    const rightFoot = new THREE.Mesh(footGeo, matFoot);
    rightFoot.position.set(0.35, 0.25, 0);
    humanGroup.add(leftFoot);
    humanGroup.add(rightFoot);
  })();

  // 犬
  (function createDog() {
    const matBody = new THREE.MeshStandardMaterial({
      color: 0xc88f4f,
      roughness: 0.6,
    });
    const matHead = new THREE.MeshStandardMaterial({
      color: 0xd9a066,
      roughness: 0.6,
    });
    const matEar = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.6,
    });
    const matLeg = new THREE.MeshStandardMaterial({
      color: 0x3b2b1a,
    });

    const bodyGeo = new THREE.CylinderGeometry(0.7, 0.8, 2.0, 20);
    const body = new THREE.Mesh(bodyGeo, matBody);
    body.position.y = 1.2;
    dogGroup.add(body);

    const headGeo = new THREE.SphereGeometry(0.9, 24, 24);
    const head = new THREE.Mesh(headGeo, matHead);
    head.position.set(0, 2.4, 0.4);
    dogGroup.add(head);

    const earGeo = new THREE.BoxGeometry(0.2, 0.8, 0.1);
    const earL = new THREE.Mesh(earGeo, matEar);
    earL.position.set(-0.55, 2.6, 0.3);
    const earR = earL.clone();
    earR.position.x *= -1;
    dogGroup.add(earL, earR);

    const legGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 12);
    const legPos = [
      [-0.35, 0.3, 0.35],
      [0.35, 0.3, 0.35],
      [-0.35, 0.3, -0.35],
      [0.35, 0.3, -0.35],
    ];
    legPos.forEach((p) => {
      const leg = new THREE.Mesh(legGeo, matLeg);
      leg.position.set(p[0], p[1], p[2]);
      dogGroup.add(leg);
    });

    dogGroup.visible = false;
  })();

  avatarGroup.position.set(0, 0, 10);
  cameraPivot.position.copy(avatarGroup.position);
  camera.position.set(0, 3.5, 7);

  let currentAvatar = "human";

  function setAvatar(type) {
    currentAvatar = type;
    humanGroup.visible = type === "human";
    dogGroup.visible = type === "dog";

    if (btnHuman && btnDog) {
      const active = "is-active";
      if (type === "human") {
        btnHuman.classList.add(active);
        btnDog.classList.remove(active);
      } else {
        btnDog.classList.add(active);
        btnHuman.classList.remove(active);
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

  // ========= カメラのドラッグ =========
  let isDragging = false;
  let lastPointer = { x: 0, y: 0 };
  let yaw = 0;
  let pitch = 0.15;

  function updateCameraFromAngles() {
    const r = 7;
    const offset = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch) * r,
      Math.sin(pitch) * r + 3.0,
      Math.cos(yaw) * Math.cos(pitch) * r
    );

    camera.position.copy(avatarGroup.position).add(offset);
    camera.lookAt(
      avatarGroup.position.clone().setY(avatarGroup.position.y + 2.5)
    );
    cameraPivot.position.copy(avatarGroup.position);
  }

  if (canvas) {
    canvas.addEventListener("pointerdown", (e) => {
      if (e.target === joystickBase || e.target === joystickStick) return;
      isDragging = true;
      lastPointer.x = e.clientX;
      lastPointer.y = e.clientY;
    });
  }

  window.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    lastPointer.x = e.clientX;
    lastPointer.y = e.clientY;

    const ROT = 0.005;
    yaw -= dx * ROT;
    pitch -= dy * ROT;
    const maxP = Math.PI / 3;
    const minP = -Math.PI / 6;
    pitch = Math.max(minP, Math.min(maxP, pitch));

    updateCameraFromAngles();
  });

  window.addEventListener("pointerup", () => {
    isDragging = false;
  });

  // ========= ジョイスティック =========
  let joyActive = false;
  let joyCenter = { x: 0, y: 0 };
  let joyVector = { x: 0, y: 0 };

  function setJoystickStick(dx, dy) {
    if (!joystickStick) return;
    joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function joyStart(e) {
    if (!joystickBase) return;
    joyActive = true;

    const rect = joystickBase.getBoundingClientRect();
    joyCenter.x = rect.left + rect.width / 2;
    joyCenter.y = rect.top + rect.height / 2;

    const t = e.touches ? e.touches[0] : e;
    joyMoveInternal(t.clientX, t.clientY);
  }

  function joyMove(e) {
    if (!joyActive) return;
    const t = e.touches ? e.touches[0] : e;
    joyMoveInternal(t.clientX, t.clientY);
  }

  function joyMoveInternal(x, y) {
    const dx = x - joyCenter.x;
    const dy = y - joyCenter.y;
    const maxR = (joystickBase.getBoundingClientRect().width || 120) / 2;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, maxR);
    const ang = Math.atan2(dy, dx);

    const nx = (clamped * Math.cos(ang)) / maxR;
    const ny = (clamped * Math.sin(ang)) / maxR;

    // 上にドラッグで前進
    joyVector.x = nx;
    joyVector.y = -ny;

    setJoystickStick(clamped * Math.cos(ang), clamped * Math.sin(ang));
  }

  function joyEnd() {
    joyActive = false;
    joyVector.x = 0;
    joyVector.y = 0;
    setJoystickStick(0, 0);
  }

  if (joystickBase) {
    joystickBase.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      joyStart(e);
    });
    window.addEventListener("pointermove", (e) => {
      if (!joyActive) return;
      e.preventDefault();
      joyMove(e);
    });
    window.addEventListener("pointerup", (e) => {
      if (!joyActive) return;
      e.preventDefault();
      joyEnd();
    });

    joystickBase.addEventListener("touchstart", (e) => {
      e.preventDefault();
      joyStart(e);
    });
    window.addEventListener("touchmove", (e) => {
      if (!joyActive) return;
      e.preventDefault();
      joyMove(e);
    });
    window.addEventListener("touchend", (e) => {
      if (!joyActive) return;
      e.preventDefault();
      joyEnd();
    });
  }

  // ========= 画像クリック =========
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
    if (!hits.length) return;

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
      if (e.target === viewerEl) viewerEl.classList.remove("is-open");
    });
  }

  // ========= リサイズ & ループ =========
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

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    if (Math.abs(joyVector.x) > 0.02 || Math.abs(joyVector.y) > 0.02) {
      const speed = 6.0;

      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      const move = new THREE.Vector3();
      move.addScaledVector(forward, joyVector.y * speed * dt);
      move.addScaledVector(right, joyVector.x * speed * dt);

      avatarGroup.position.add(move);
      updateCameraFromAngles();
    }

    renderer.render(scene, camera);
  }

  updateCameraFromAngles();
  animate();

  // ================== ここまで ==================
});
