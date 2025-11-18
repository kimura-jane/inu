// app.js
(function () {
  // ======== 安全対策：ARTWORKS が無かったら空配列 ========
  var ART = [];
  if (window.ARTWORKS && Object.prototype.toString.call(window.ARTWORKS) === "[object Array]") {
    ART = window.ARTWORKS;
  }

  // ======== 基本セットアップ ========
  var canvas = document.getElementById("scene");
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050507);

  var camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );

  // 環境光・平行光
  var amb = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(amb);

  var dir = new THREE.DirectionalLight(0xffffff, 0.4);
  dir.position.set(0, 10, -10);
  scene.add(dir);

  // ======== 美術館の廊下 ========
  var HALL_LENGTH = 120;
  var HALL_WIDTH = 22;
  var WALL_HEIGHT = 10;

  var texLoader = new THREE.TextureLoader();

  // 床
  var floorGeo = new THREE.PlaneGeometry(HALL_WIDTH, HALL_LENGTH);
  var floorMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.8,
    metalness: 0.1
  });
  var floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // 天井
  var ceilGeo = new THREE.PlaneGeometry(HALL_WIDTH, HALL_LENGTH);
  var ceilMat = new THREE.MeshStandardMaterial({
    color: 0x111217,
    roughness: 0.9
  });
  var ceil = new THREE.Mesh(ceilGeo, ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = WALL_HEIGHT;
  scene.add(ceil);

  // 壁
  var wallGeo = new THREE.PlaneGeometry(HALL_LENGTH, WALL_HEIGHT);
  var wallMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.95
  });

  var wallLeft = new THREE.Mesh(wallGeo, wallMat);
  wallLeft.rotation.y = Math.PI / 2;
  wallLeft.position.set(-HALL_WIDTH / 2, WALL_HEIGHT / 2, 0);
  scene.add(wallLeft);

  var wallRight = new THREE.Mesh(wallGeo, wallMat.clone());
  wallRight.rotation.y = -Math.PI / 2;
  wallRight.position.set(HALL_WIDTH / 2, WALL_HEIGHT / 2, 0);
  scene.add(wallRight);

  // 天井のラインライト
  var lineGeo = new THREE.PlaneGeometry(HALL_WIDTH * 0.4, 0.5);
  var lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  var lightCount = 12;
  for (var i = 0; i < lightCount; i++) {
    var lm = new THREE.Mesh(lineGeo, lineMat);
    lm.position.set(
      0,
      WALL_HEIGHT - 0.1,
      -HALL_LENGTH / 2 + (HALL_LENGTH / (lightCount + 1)) * (i + 1)
    );
    lm.rotation.x = Math.PI / 2;
    scene.add(lm);
  }

  // ======== 額装＋作品 ========
  var clickable = [];

  var frameStyles = [
    { frameColor: 0x1a1a1a, innerColor: 0xffffff },
    { frameColor: 0x9b7b3a, innerColor: 0xf5f3ec },
    { frameColor: 0x44474f, innerColor: 0xe0e0e0 },
    { frameColor: 0x2b2b2b, innerColor: 0xf7f7f7 }
  ];

  var artWidth = 4;
  var artHeight = 4.5;

  var count = ART.length > 0 ? ART.length : 8; // 0 でもクラッシュさせない
  var perSide = Math.ceil(count / 2);
  var spacing = HALL_LENGTH / (perSide + 2);
  var startZ = -HALL_LENGTH / 2 + spacing;

  function createFrame(art, sideIndex, indexWithinSide) {
    var z = startZ + spacing * indexWithinSide;
    var x = sideIndex === 0 ? -HALL_WIDTH / 2 + 0.3 : HALL_WIDTH / 2 - 0.3;
    var faceDir = sideIndex === 0 ? 1 : -1;

    var style = frameStyles[(indexWithinSide + sideIndex) % frameStyles.length];

    var group = new THREE.Group();

    // フレーム
    var frameDepth = 0.25;
    var frameGeo = new THREE.BoxGeometry(artWidth + 0.6, artHeight + 0.6, frameDepth);
    var frameMat = new THREE.MeshStandardMaterial({
      color: style.frameColor,
      metalness: 0.3,
      roughness: 0.4
    });
    var frameMesh = new THREE.Mesh(frameGeo, frameMat);
    group.add(frameMesh);

    // マット
    var matGeo = new THREE.PlaneGeometry(artWidth + 0.2, artHeight + 0.2);
    var matMat = new THREE.MeshStandardMaterial({
      color: style.innerColor,
      roughness: 1.0
    });
    var matMesh = new THREE.Mesh(matGeo, matMat);
    matMesh.position.z = frameDepth / 2 + 0.001;
    group.add(matMesh);

    // 絵
    var artMesh;
    if (art && art.file) {
      var tex = texLoader.load(art.file);
      var artGeo = new THREE.PlaneGeometry(artWidth, artHeight);
      var artMat = new THREE.MeshBasicMaterial({ map: tex });
      artMesh = new THREE.Mesh(artGeo, artMat);
    } else {
      var artGeo2 = new THREE.PlaneGeometry(artWidth, artHeight);
      var artMat2 = new THREE.MeshBasicMaterial({ color: 0x333333 });
      artMesh = new THREE.Mesh(artGeo2, artMat2);
    }
    artMesh.position.z = frameDepth / 2 + 0.01;
    group.add(artMesh);

    // 位置向き
    group.position.set(x + 0.01 * faceDir, 3.8, z);
    group.rotation.y = (Math.PI / 2) * faceDir * -1;

    // スポットライト
    var spot = new THREE.SpotLight(0xffffff, 0.9, 18, Math.PI / 6, 0.4, 1);
    spot.position.set(x + 1.5 * faceDir, WALL_HEIGHT - 0.2, z);
    spot.target = group;
    scene.add(spot);

    scene.add(group);

    group.userData.art = art || null;
    clickable.push(group);
  }

  if (ART.length > 0) {
    var half = Math.ceil(ART.length / 2);
    for (i = 0; i < ART.length; i++) {
      var side = i < half ? 0 : 1;
      var idx = side === 0 ? i : i - half;
      createFrame(ART[i], side, idx);
    }
  } else {
    // デモ用の空フレーム
    for (i = 0; i < count; i++) {
      side = i < perSide ? 0 : 1;
      idx = side === 0 ? i : i - perSide;
      createFrame(null, side, idx);
    }
  }

  // ======== アバター ========
  var avatarGroup = null;
  var avatarMode = "human";

  function randomColor() {
    var base = [0.2, 0.3, 0.4, 0.5];
    var r = base[Math.floor(Math.random() * base.length)];
    var g = base[Math.floor(Math.random() * base.length)];
    var b = base[Math.floor(Math.random() * base.length)];
    return new THREE.Color(r, g, b);
  }

  function createHumanAvatar() {
    var g = new THREE.Group();

    var headGeo = new THREE.SphereGeometry(0.8, 24, 16);
    var headMat = new THREE.MeshStandardMaterial({ color: 0xf4d2b5, roughness: 0.8 });
    var head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.2;
    g.add(head);

    var hairGeo = new THREE.SphereGeometry(0.82, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.6);
    var hairMat = new THREE.MeshStandardMaterial({ color: randomColor().offsetHSL(0, 0, -0.2) });
    var hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.copy(head.position);
    g.add(hair);

    var bodyGeo = new THREE.CylinderGeometry(0.8, 0.9, 2.4, 20);
    var bodyMat = new THREE.MeshStandardMaterial({ color: randomColor(), roughness: 0.85 });
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2;
    g.add(body);

    var armGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.6, 16);
    var armMat = new THREE.MeshStandardMaterial({ color: bodyMat.color });
    var armL = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-0.9, 1.4, 0);
    var armR = armL.clone();
    armR.position.x = 0.9;
    g.add(armL);
    g.add(armR);

    var legGeo = new THREE.BoxGeometry(0.5, 1.2, 0.6);
    var legMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    var legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.3, 0.3, 0);
    var legR = legL.clone();
    legR.position.x = 0.3;
    g.add(legL);
    g.add(legR);

    return g;
  }

  function createDogAvatar() {
    var g = new THREE.Group();
    var coat = randomColor();

    var headGeo = new THREE.BoxGeometry(1.6, 1.4, 1.6);
    var headMat = new THREE.MeshStandardMaterial({ color: coat, roughness: 0.8 });
    var head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.8;
    g.add(head);

    var earGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
    var earMat = new THREE.MeshStandardMaterial({ color: coat.clone().offsetHSL(0, 0, -0.15) });
    var earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.7, 2.2, -0.2);
    var earR = earL.clone();
    earR.position.x = 0.7;
    g.add(earL);
    g.add(earR);

    var snoutGeo = new THREE.BoxGeometry(0.9, 0.6, 1.0);
    var snoutMat = new THREE.MeshStandardMaterial({ color: coat.clone().offsetHSL(0, 0, 0.1) });
    var snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0, 1.5, 0.9);
    g.add(snout);

    var noseGeo = new THREE.BoxGeometry(0.3, 0.25, 0.3);
    var noseMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    var nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 1.6, 1.2);
    g.add(nose);

    var bodyGeo = new THREE.BoxGeometry(1.6, 1.2, 2.4);
    var bodyMat = new THREE.MeshStandardMaterial({ color: coat, roughness: 0.9 });
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 1.0, 0);
    g.add(body);

    var legGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.0, 12);
    var legMat = new THREE.MeshStandardMaterial({ color: coat.clone().offsetHSL(0, 0, -0.25) });
    var offsets = [
      [-0.5, 0.0, 0.9],
      [0.5, 0.0, 0.9],
      [-0.5, 0.0, -0.9],
      [0.5, 0.0, -0.9]
    ];
    for (i = 0; i < offsets.length; i++) {
      var off = offsets[i];
      var leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(off[0], 0.5, off[2]);
      g.add(leg);
    }

    var tailGeo = new THREE.CylinderGeometry(0.18, 0.1, 1.2, 10);
    var tailMat = new THREE.MeshStandardMaterial({ color: coat.clone().offsetHSL(0, 0, 0.05) });
    var tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, 1.6, -1.2);
    tail.rotation.x = Math.PI / 3;
    g.add(tail);

    return g;
  }

  function rebuildAvatar() {
    if (avatarGroup) {
      scene.remove(avatarGroup);
    }
    if (avatarMode === "human") {
      avatarGroup = createHumanAvatar();
    } else {
      avatarGroup = createDogAvatar();
    }
    avatarGroup.position.set(0, 0, -HALL_LENGTH / 2 + 6);
    scene.add(avatarGroup);
  }

  rebuildAvatar();

  // ======== カメラ制御 ========
  var cameraYaw = 0;
  var CAMERA_HEIGHT = 6;
  var CAMERA_DISTANCE = 10;

  function updateCamera() {
    if (!avatarGroup) return;
    var target = avatarGroup.position;
    var bx = target.x - Math.sin(cameraYaw) * CAMERA_DISTANCE;
    var bz = target.z - Math.cos(cameraYaw) * CAMERA_DISTANCE;
    camera.position.set(bx, CAMERA_HEIGHT, bz);
    camera.lookAt(target.x, 2.0, target.z);
  }

  // ======== 視点ドラッグ ========
  var dragView = false;
  var lastX = 0;

  canvas.addEventListener("pointerdown", function (e) {
    dragView = true;
    lastX = e.clientX;
  });

  window.addEventListener("pointerup", function () {
    dragView = false;
  });

  window.addEventListener("pointermove", function (e) {
    if (!dragView) return;
    var dx = e.clientX - lastX;
    lastX = e.clientX;
    cameraYaw -= dx * 0.004;
  });

  // ======== ジョイスティック ========
  var joyBg = document.getElementById("joy-bg");
  var joyStick = document.getElementById("joy-stick");
  var joyActive = false;
  var joyStart = { x: 0, y: 0 };
  var joyOffset = { x: 0, y: 0 };
  var JOY_MAX = 40;

  function setJoyPosition(x, y) {
    joyStick.style.transform = "translate(" + x + "px," + y + "px)";
  }

  function getXYFromEvent(e) {
    if (typeof e.clientX === "number") {
      return { x: e.clientX, y: e.clientY };
    }
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
    return null;
  }

  function joyStartHandler(e) {
    e.preventDefault();
    joyActive = true;
    var rect = joyBg.getBoundingClientRect();
    joyStart.x = rect.left + rect.width / 2;
    joyStart.y = rect.top + rect.height / 2;
  }

  function joyMoveHandler(e) {
    if (!joyActive) return;
    var pos = getXYFromEvent(e);
    if (!pos) return;

    var dx = pos.x - joyStart.x;
    var dy = pos.y - joyStart.y;

    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > JOY_MAX) {
      dx = (dx / len) * JOY_MAX;
      dy = (dy / len) * JOY_MAX;
    }

    joyOffset.x = dx;
    joyOffset.y = dy;
    setJoyPosition(dx, dy);
  }

  function joyEndHandler() {
    joyActive = false;
    joyOffset.x = 0;
    joyOffset.y = 0;
    setJoyPosition(0, 0);
  }

  joyBg.addEventListener("pointerdown", joyStartHandler);
  window.addEventListener("pointermove", joyMoveHandler);
  window.addEventListener("pointerup", joyEndHandler);

  joyBg.addEventListener("touchstart", joyStartHandler, { passive: false });
  window.addEventListener("touchmove", joyMoveHandler, { passive: false });
  window.addEventListener("touchend", joyEndHandler);

  // ======== アバターモード切り替え ========
  var btnHuman = document.getElementById("btn-human");
  var btnDog = document.getElementById("btn-dog");

  function setMode(mode) {
    if (mode === avatarMode) {
      // 同じモードならランダム着せ替えだけ
      rebuildAvatar();
      return;
    }
    avatarMode = mode;
    btnHuman.classList.toggle("active", mode === "human");
    btnDog.classList.toggle("active", mode === "dog");
    rebuildAvatar();
  }

  btnHuman.addEventListener("click", function () {
    setMode("human");
  });
  btnDog.addEventListener("click", function () {
    setMode("dog");
  });

  // ======== 作品クリック ========
  var infoPanel = document.getElementById("info-panel");
  var infoTitle = document.getElementById("info-title");
  var infoDesc = document.getElementById("info-desc");
  var infoClose = document.getElementById("info-close");
  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2();

  function showInfo(art) {
    if (!art) return;
    infoTitle.textContent = art.title || "";
    infoDesc.textContent = art.desc || "";
    infoPanel.classList.remove("hidden");
  }

  infoClose.addEventListener("click", function () {
    infoPanel.classList.add("hidden");
  });

  canvas.addEventListener("click", function (e) {
    if (dragView) return;
    var rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(clickable, true);
    if (hits.length > 0) {
      var g = hits[0].object.parent;
      var art = g.userData.art;
      showInfo(art);
    }
  });

  // ======== 移動計算 ========
  var tmpForward = new THREE.Vector3();
  var tmpRight = new THREE.Vector3();

  function clampWithinHall(pos) {
    var marginX = HALL_WIDTH / 2 - 2;
    var marginZ = HALL_LENGTH / 2 - 4;
    if (pos.x < -marginX) pos.x = -marginX;
    if (pos.x > marginX) pos.x = marginX;
    if (pos.z < -marginZ) pos.z = -marginZ;
    if (pos.z > marginZ) pos.z = marginZ;
  }

  // ======== リサイズ ========
  function resizeRenderer() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resizeRenderer);
  resizeRenderer();

  // ======== ループ ========
  function animate() {
    requestAnimationFrame(animate);

    if (avatarGroup) {
      var nx = joyOffset.x / JOY_MAX; // 左右
      var ny = joyOffset.y / JOY_MAX; // 上下

      // 画面上方向に倒すと前進（-ny）
      var forwardAmount = -ny;
      var strafeAmount = nx;

      tmpForward.set(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
      tmpRight.set(tmpForward.z, 0, -tmpForward.x);

      var speed = 0.15;
      avatarGroup.position.addScaledVector(tmpForward, forwardAmount * speed);
      avatarGroup.position.addScaledVector(tmpRight, strafeAmount * speed);
      clampWithinHall(avatarGroup.position);
    }

    updateCamera();
    renderer.render(scene, camera);
  }

  animate();
})();
