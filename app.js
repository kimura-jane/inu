// app.js – 白基調の美術館 / アバターチェンジ / ジョイスティック移動 & ドラッグ視線

(function () {
  const canvas = document.getElementById("scene");

  // ---------- renderer & camera ----------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  function resizeRenderer() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  resizeRenderer();
  window.addEventListener("resize", resizeRenderer);

  // ---------- scene & lights ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050507);

  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.35);
  scene.add(hemi);

  const mainDirectional = new THREE.DirectionalLight(0xffffff, 1.0);
  mainDirectional.position.set(8, 12, 4);
  mainDirectional.castShadow = false;
  scene.add(mainDirectional);

  // ---------- room (ギャラリー) ----------
  const roomSize = 22; // 正方形の部屋
  const wallHeight = 6;

  const matFloor = new THREE.MeshStandardMaterial({
    color: 0x26262b,
    roughness: 0.9,
    metalness: 0.0,
  });
  const matWall = new THREE.MeshStandardMaterial({
    color: 0xf1f2f5,
    roughness: 0.85,
    metalness: 0.0,
  });
  const matCeiling = new THREE.MeshStandardMaterial({
    color: 0xf9fafc,
    roughness: 0.95,
    metalness: 0.0,
  });

  // floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    matFloor
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // ceiling
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    matCeiling
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = wallHeight;
  scene.add(ceiling);

  // walls（4枚の白い壁）
  const wallGeom = new THREE.PlaneGeometry(roomSize, wallHeight);

  const wallNorth = new THREE.Mesh(wallGeom, matWall);
  wallNorth.position.set(0, wallHeight / 2, -roomSize / 2);
  // 表面が部屋側を向くように
  // three.js の Plane は表が +Z 側
  wallNorth.rotation.y = Math.PI;
  scene.add(wallNorth);

  const wallSouth = new THREE.Mesh(wallGeom, matWall);
  wallSouth.position.set(0, wallHeight / 2, roomSize / 2);
  scene.add(wallSouth);

  const wallWest = new THREE.Mesh(wallGeom, matWall);
  wallWest.position.set(-roomSize / 2, wallHeight / 2, 0);
  wallWest.rotation.y = Math.PI / 2;
  scene.add(wallWest);

  const wallEast = new THREE.Mesh(wallGeom, matWall);
  wallEast.position.set(roomSize / 2, wallHeight / 2, 0);
  wallEast.rotation.y = -Math.PI / 2;
  scene.add(wallEast);

  // ---------- ceiling track lights ----------
  const trackLightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.4,
    metalness: 0.3,
  });
  const trackGeom = new THREE.BoxGeometry(roomSize * 0.8, 0.06, 0.2);
  const track = new THREE.Mesh(trackGeom, trackLightMat);
  track.position.set(0, wallHeight - 0.4, 0);
  scene.add(track);

  // ---------- artworks ----------
  const texLoader = new THREE.TextureLoader();
  const clickablePictures = [];
  const artGroups = new THREE.Group();
  scene.add(artGroups);

  function createFrameWithArt(work, index, wallId, offsetIndex, perWall) {
    const artWidth = 2.1;
    const artHeight = 3.1;

    const frameGroup = new THREE.Group();

    // 額の種類を3パターンくらい
    const frameType = index % 3;
    let outerColor, innerColor, depth;

    if (frameType === 0) {
      outerColor = 0xd4b48a; // ゴールド系
      innerColor = 0x111111;
      depth = 0.35;
    } else if (frameType === 1) {
      outerColor = 0x2f333a; // 黒＋金属
      innerColor = 0xe5e5ea;
      depth = 0.28;
    } else {
      outerColor = 0x987654; // 木目っぽい
      innerColor = 0x111111;
      depth = 0.32;
    }

    const outerGeom = new THREE.BoxGeometry(artWidth + 0.6, artHeight + 0.6, depth);
    const outerMat = new THREE.MeshStandardMaterial({
      color: outerColor,
      roughness: 0.55,
      metalness: 0.25,
    });
    const outerMesh = new THREE.Mesh(outerGeom, outerMat);
    frameGroup.add(outerMesh);

    const innerGeom = new THREE.BoxGeometry(artWidth + 0.15, artHeight + 0.15, depth * 0.3);
    const innerMat = new THREE.MeshStandardMaterial({
      color: innerColor,
      roughness: 0.8,
      metalness: 0.0,
    });
    const innerMesh = new THREE.Mesh(innerGeom, innerMat);
    innerMesh.position.z = depth * 0.22;
    frameGroup.add(innerMesh);

    const artGeom = new THREE.PlaneGeometry(artWidth, artHeight);
    const tex = texLoader.load(work.image);
    const artMat = new THREE.MeshBasicMaterial({ map: tex });
    const artMesh = new THREE.Mesh(artGeom, artMat);
    artMesh.position.z = depth * 0.25 + 0.001;
    artMesh.userData.work = work;
    frameGroup.add(artMesh);
    clickablePictures.push(artMesh);

    // 上部スポットライト（装飾＋光源）
    const lampGeom = new THREE.CylinderGeometry(0.15, 0.2, 0.6, 12);
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.7,
    });
    const lampMesh = new THREE.Mesh(lampGeom, lampMat);
    lampMesh.rotation.x = -Math.PI / 3;
    lampMesh.position.set(0, artHeight / 2 + 0.6, depth * 0.1);
    frameGroup.add(lampMesh);

    const spot = new THREE.SpotLight(0xffffff, 0.65, 10, Math.PI / 6, 0.4, 1.0);
    spot.position.set(0, artHeight / 2 + 0.8, depth * 0.4);
    spot.target = artMesh;
    frameGroup.add(spot);
    frameGroup.add(spot.target);

    // 部屋内での位置
    const margin = 1.6;
    const span = (roomSize - margin * 2) / (perWall - 1 || 1);
    const t = perWall === 1 ? 0.5 : offsetIndex / (perWall - 1);

    const sideShift = -roomSize / 2 + margin + span * offsetIndex;

    const centerY = wallHeight * 0.5;

    if (wallId === 0) {
      // 北側の壁（奥）
      frameGroup.position.set(sideShift, centerY, -roomSize / 2 + 0.05);
      frameGroup.rotation.y = Math.PI;
    } else if (wallId === 1) {
      // 東
      frameGroup.position.set(roomSize / 2 - 0.05, centerY, sideShift);
      frameGroup.rotation.y = -Math.PI / 2;
    } else if (wallId === 2) {
      // 南
      frameGroup.position.set(-sideShift, centerY, roomSize / 2 - 0.05);
      frameGroup.rotation.y = 0;
    } else {
      // 西
      frameGroup.position.set(-roomSize / 2 + 0.05, centerY, -sideShift);
      frameGroup.rotation.y = Math.PI / 2;
    }

    artGroups.add(frameGroup);
  }

  // WORKS を4つの壁に均等に配置
  if (Array.isArray(WORKS) && WORKS.length > 0) {
    const total = WORKS.length;
    const perWallBase = Math.floor(total / 4);
    const extra = total % 4;

    let workIndex = 0;
    for (let wall = 0; wall < 4; wall++) {
      const count = perWallBase + (wall < extra ? 1 : 0);
      for (let i = 0; i < count; i++) {
        createFrameWithArt(
          WORKS[workIndex],
          workIndex,
          wall,
          i,
          count
        );
        workIndex++;
      }
    }
  }

  // ---------- avatar ----------
  let avatar;
  let avatarType = "human";

  function createHumanAvatar() {
    const group = new THREE.Group();

    const bodyColorList = [0x234a9c, 0xd8872b, 0x1b8f86, 0x555555];
    const coatColor =
      bodyColorList[Math.floor(Math.random() * bodyColorList.length)];

    const matSkin = new THREE.MeshStandardMaterial({
      color: 0xf2c9a5,
      roughness: 0.7,
    });
    const matHair = new THREE.MeshStandardMaterial({
      color: 0x202024,
      roughness: 0.6,
      metalness: 0.1,
    });
    const matCoat = new THREE.MeshStandardMaterial({
      color: coatColor,
      roughness: 0.85,
      metalness: 0.05,
    });
    const matLeg = new THREE.MeshStandardMaterial({
      color: 0x202024,
      roughness: 0.8,
    });

    // torso
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.8, 2.2, 18),
      matCoat
    );
    torso.position.y = 1.5;
    group.add(torso);

    // head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 20, 20),
      matSkin
    );
    head.position.y = 2.9;
    group.add(head);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.67, 22, 22, 0, Math.PI * 2, 0, Math.PI / 1.4),
      matHair
    );
    hair.position.copy(head.position);
    group.add(hair);

    // arms
    const armGeom = new THREE.CylinderGeometry(0.2, 0.25, 1.4, 14);
    const armL = new THREE.Mesh(armGeom, matCoat);
    armL.position.set(-0.9, 1.6, 0);
    armL.rotation.z = Math.PI / 20;
    group.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.9;
    armR.rotation.z = -Math.PI / 20;
    group.add(armR);

    // legs
    const legGeom = new THREE.CylinderGeometry(0.25, 0.3, 1.3, 14);
    const legL = new THREE.Mesh(legGeom, matLeg);
    legL.position.set(-0.3, 0.6, 0);
    group.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.3;
    group.add(legR);

    // shoes
    const shoeGeom = new THREE.BoxGeometry(0.6, 0.25, 0.9);
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.5,
      metalness: 0.1,
    });
    const shoeL = new THREE.Mesh(shoeGeom, shoeMat);
    shoeL.position.set(-0.3, 0, 0.25);
    group.add(shoeL);
    const shoeR = shoeL.clone();
    shoeR.position.x = 0.3;
    group.add(shoeR);

    return group;
  }

  function createDogAvatar() {
    const group = new THREE.Group();

    const mainColorList = [0xf0d7b1, 0xc89a5b, 0x444444, 0x94745a];
    const accentColorList = [0xffffff, 0xf5f5f5, 0x222222];

    const bodyCol =
      mainColorList[Math.floor(Math.random() * mainColorList.length)];
    const accentCol =
      accentColorList[Math.floor(Math.random() * accentColorList.length)];

    const matBody = new THREE.MeshStandardMaterial({
      color: bodyCol,
      roughness: 0.8,
      metalness: 0.05,
    });
    const matAccent = new THREE.MeshStandardMaterial({
      color: accentCol,
      roughness: 0.9,
    });
    const matNose = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.5,
    });

    // torso
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.2, 2.6),
      matBody
    );
    torso.position.y = 1.0;
    group.add(torso);

    // head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.2, 1.4),
      matBody
    );
    head.position.set(0, 1.8, 1.3);
    group.add(head);

    // snout
    const snout = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.5, 0.7),
      matAccent
    );
    snout.position.set(0, 1.5, 2.0);
    group.add(snout);

    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.18, 0.25),
      matNose
    );
    nose.position.set(0, 1.52, 2.38);
    group.add(nose);

    // ears（垂れ耳気味）
    const earGeom = new THREE.BoxGeometry(0.35, 0.8, 0.15);
    const ear = new THREE.Mesh(earGeom, matBody);
    ear.position.set(-0.7, 2.1, 1.2);
    ear.rotation.z = 0.3;
    group.add(ear);
    const ear2 = ear.clone();
    ear2.position.x = 0.7;
    ear2.rotation.z = -0.3;
    group.add(ear2);

    // legs
    const legGeom = new THREE.CylinderGeometry(0.22, 0.24, 1.2, 12);
    const matLeg = new THREE.MeshStandardMaterial({
      color: bodyCol,
      roughness: 0.9,
    });
    const lf = new THREE.Mesh(legGeom, matLeg);
    lf.position.set(-0.5, 0.6, 0.8);
    group.add(lf);
    const rf = lf.clone();
    rf.position.x = 0.5;
    group.add(rf);
    const lb = lf.clone();
    lb.position.z = -0.8;
    group.add(lb);
    const rb = lb.clone();
    rb.position.x = 0.5;
    group.add(rb);

    // tail
    const tail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.12, 1.0, 10),
      matBody
    );
    tail.position.set(0, 1.5, -1.5);
    tail.rotation.x = Math.PI / 3;
    group.add(tail);

    return group;
  }

  function rebuildAvatar() {
    if (avatar) {
      scene.remove(avatar);
    }
    avatar =
      avatarType === "human" ? createHumanAvatar() : createDogAvatar();
    avatar.position.set(0, 0, 6); // ギャラリー入り口付近
    scene.add(avatar);
  }

  rebuildAvatar();

  // ---------- avatar UI ----------
  const avatarButtons = document.querySelectorAll(".avatar-btn");
  avatarButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = btn.dataset.type === "dog" ? "dog" : "human";
      if (t === avatarType) {
        // 同じ種類なら見た目だけランダムに再生成
        rebuildAvatar();
        return;
      }
      avatarType = t;
      avatarButtons.forEach((b) => b.classList.toggle("active", b === btn));
      rebuildAvatar();
    });
  });

  // ---------- camera control (third person) ----------
  let camYaw = Math.PI; // Avatar の正面側を向く向き
  let camPitch = 0.15;
  const camDistance = 8;
  const camHeight = 2.3;

  function updateCamera() {
    if (!avatar) return;

    const offset = new THREE.Vector3();
    offset.x = Math.sin(camYaw) * Math.cos(camPitch) * camDistance;
    offset.y = Math.sin(camPitch) * camDistance + camHeight;
    offset.z = Math.cos(camYaw) * Math.cos(camPitch) * camDistance;

    camera.position.copy(avatar.position).add(offset);
    camera.lookAt(
      avatar.position.x,
      avatar.position.y + 1.6,
      avatar.position.z
    );
  }

  updateCamera();

  // ---------- view drag (上下左右見回し) ----------
  let draggingView = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener("pointerdown", (e) => {
    // ジョイスティックの上は除外
    const joyRect = document
      .getElementById("joy-container")
      .getBoundingClientRect();
    if (
      e.clientX >= joyRect.left &&
      e.clientX <= joyRect.right &&
      e.clientY >= joyRect.top &&
      e.clientY <= joyRect.bottom
    ) {
      return;
    }
    draggingView = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!draggingView) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    camYaw -= dx * 0.004; // 左右回転
    camPitch -= dy * 0.003; // 上下
    const maxPitch = Math.PI / 3;
    const minPitch = -Math.PI / 4;
    if (camPitch > maxPitch) camPitch = maxPitch;
    if (camPitch < minPitch) camPitch = minPitch;
  });

  canvas.addEventListener("pointerup", (e) => {
    draggingView = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}
  });
  canvas.addEventListener("pointercancel", () => {
    draggingView = false;
  });

  // ---------- joystick ----------
  const joyBg = document.getElementById("joy-bg");
  const joyStick = document.getElementById("joy-stick");

  let joyActive = false;
  let joyCenterX = 0;
  let joyCenterY = 0;
  const joyRadius = 40; // px
  let joyX = 0; // -1〜1 右方向
  let joyY = 0; // -1〜1 下方向（上に倒すとマイナス）

  function startJoystick(e) {
    e.preventDefault();
    const rect = joyBg.getBoundingClientRect();
    joyCenterX = rect.left + rect.width / 2;
    joyCenterY = rect.top + rect.height / 2;
    joyActive = true;
    document.addEventListener("pointermove", moveJoystick);
    document.addEventListener("pointerup", endJoystick);
    document.addEventListener("pointercancel", endJoystick);
  }

  function moveJoystick(e) {
    if (!joyActive) return;
    e.preventDefault();
    const dx = e.clientX - joyCenterX;
    const dy = e.clientY - joyCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const limit = joyRadius;
    let nx = dx;
    let ny = dy;
    if (dist > limit && dist > 0) {
      const s = limit / dist;
      nx *= s;
      ny *= s;
    }
    joyStick.style.transform = `translate(${nx}px, ${ny}px)`;
    joyX = nx / limit;
    joyY = ny / limit;
  }

  function endJoystick(e) {
    joyActive = false;
    joyX = 0;
    joyY = 0;
    joyStick.style.transform = "translate(0px, 0px)";
    document.removeEventListener("pointermove", moveJoystick);
    document.removeEventListener("pointerup", endJoystick);
    document.removeEventListener("pointercancel", endJoystick);
  }

  joyBg.addEventListener("pointerdown", startJoystick);

  // ---------- artworks click (拡大表示) ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const infoPanel = document.getElementById("info-panel");
  const infoTitle = document.getElementById("info-title");
  const infoImage = document.getElementById("info-image");
  const infoClose = document.getElementById("info-close");

  let clickFromDrag = false;
  canvas.addEventListener("pointerdown", () => {
    clickFromDrag = false;
  });
  canvas.addEventListener("pointermove", () => {
    clickFromDrag = true;
  });

  canvas.addEventListener("click", (event) => {
    // ドラッグの終了クリックは無視
    if (clickFromDrag) return;

    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clickablePictures, false);
    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const work = mesh.userData.work;
      if (work) {
        infoTitle.textContent = work.title || "TAF DOG";
        infoImage.src = work.image;
        infoPanel.classList.remove("hidden");
      }
    }
  });

  infoClose.addEventListener("click", () => {
    infoPanel.classList.add("hidden");
  });
  infoPanel.addEventListener("click", (e) => {
    if (e.target === infoPanel) {
      infoPanel.classList.add("hidden");
    }
  });

  // ---------- animation loop ----------
  function animate() {
    requestAnimationFrame(animate);

    // ジョイスティックによる移動
    if (avatar) {
      const threshold = 0.05;
      if (Math.abs(joyX) > threshold || Math.abs(joyY) > threshold) {
        const strength = Math.min(
          1,
          Math.sqrt(joyX * joyX + joyY * joyY)
        );
        const baseSpeed = 0.12; // 前も横も同じスピード感
        const speed = baseSpeed * strength;

        // カメラの向きベースで前後左右
        const forward = new THREE.Vector3(
          Math.sin(camYaw),
          0,
          Math.cos(camYaw)
        );
        const right = new THREE.Vector3(
          Math.cos(camYaw),
          0,
          -Math.sin(camYaw)
        );

        const move = new THREE.Vector3();
        // joyY: 上に倒すとマイナス → 前進
        move.addScaledVector(forward, -joyY);
        move.addScaledVector(right, joyX);

        if (move.lengthSq() > 0) {
          move.normalize().multiplyScalar(speed);
          avatar.position.add(move);

          // 部屋の外に出ないように clamp
          const margin = 1.5;
          const limit = roomSize / 2 - margin;
          avatar.position.x = Math.max(
            -limit,
            Math.min(limit, avatar.position.x)
          );
          avatar.position.z = Math.max(
            -limit,
            Math.min(limit, avatar.position.z)
          );

          // 進行方向にアバターを向ける
          const dirAngle = Math.atan2(move.x, move.z);
          avatar.rotation.y = dirAngle;
        }
      }
    }

    updateCamera();
    renderer.render(scene, camera);
  }

  animate();
})();
