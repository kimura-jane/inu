// TAF DOG MUSEUM 3D ギャラリー

(() => {
  'use strict';

  // ====== 基本セットアップ ======
  // data.js が読めなくても最低 5 枚は表示するためのデフォルト
  const DEFAULT_WORKS = [
    { id: 1,  title: 'TAF DOG #01', image: 'taf_dog_01.png' },
    { id: 2,  title: 'TAF DOG #02', image: 'taf_dog_02.png' },
    { id: 3,  title: 'TAF DOG #03', image: 'taf_dog_03.png' },
    { id: 4,  title: 'TAF DOG #04', image: 'taf_dog_04.png' },
    { id: 5,  title: 'TAF DOG #05', image: 'taf_dog_05.png' }
  ];

  const WORKS =
    (window.WORKS && Array.isArray(window.WORKS) && window.WORKS.length)
      ? window.WORKS
      : DEFAULT_WORKS;

  const canvas = document.getElementById('scene');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111116);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 8);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const clock = new THREE.Clock();

  // ====== ルーム寸法 ======
  const ROOM_WIDTH = 20;
  const ROOM_DEPTH = 14;
  const ROOM_HEIGHT = 5;

  // ====== ライト ======
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.7);
  mainLight.position.set(10, 15, 10);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(2048, 2048);
  scene.add(mainLight);

  // ====== 床・壁 ======
  function createRoom() {
    // 床
    const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0xdddddd });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 天井
    const ceilGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    const ceilMat = new THREE.MeshPhongMaterial({ color: 0xf4f4f4 });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = ROOM_HEIGHT;
    scene.add(ceil);

    // 壁
    const wallMat = new THREE.MeshPhongMaterial({ color: 0xe5e5e8 });
    const wallGeoW = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
    const wallGeoD = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);

    // 前（z マイナス側）
    const wallFront = new THREE.Mesh(wallGeoW, wallMat);
    wallFront.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
    wallFront.receiveShadow = true;
    scene.add(wallFront);

    // 後ろ（z プラス側）
    const wallBack = new THREE.Mesh(wallGeoW, wallMat);
    wallBack.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
    wallBack.rotation.y = Math.PI;
    wallBack.receiveShadow = true;
    scene.add(wallBack);

    // 左（x マイナス側）
    const wallLeft = new THREE.Mesh(wallGeoD, wallMat);
    wallLeft.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    wallLeft.rotation.y = Math.PI / 2;
    wallLeft.receiveShadow = true;
    scene.add(wallLeft);

    // 右（x プラス側）
    const wallRight = new THREE.Mesh(wallGeoD, wallMat);
    wallRight.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    wallRight.rotation.y = -Math.PI / 2;
    wallRight.receiveShadow = true;
    scene.add(wallRight);
  }

  createRoom();

  // ====== アートフレーム ======
  const textureLoader = new THREE.TextureLoader();

  function createFrame(texture, position, rotationY) {
    const frameWidth = 2.0;
    const frameHeight = 2.6;
    const frameDepth = 0.1;

    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const materials = [
      new THREE.MeshPhongMaterial({ color: 0x111111 }), // right
      new THREE.MeshPhongMaterial({ color: 0x111111 }), // left
      new THREE.MeshPhongMaterial({ color: 0x111111 }), // top
      new THREE.MeshPhongMaterial({ color: 0x111111 }), // bottom
      new THREE.MeshPhongMaterial({ map: texture }),    // front
      new THREE.MeshPhongMaterial({ color: 0x111111 })  // back
    ];

    const frameGeo = new THREE.BoxGeometry(
      frameWidth,
      frameHeight,
      frameDepth
    );
    const frame = new THREE.Mesh(frameGeo, materials);
    frame.position.copy(position);
    frame.rotation.y = rotationY;
    frame.castShadow = true;
    frame.receiveShadow = true;
    scene.add(frame);

    // スポットライト
    const spot = new THREE.SpotLight(0xffffff, 0.65, 10, Math.PI / 6, 0.4, 1);
    spot.position.set(
      position.x,
      position.y + 1.2,
      position.z + (Math.cos(rotationY) * 0.7) - (Math.sin(rotationY) * 0.7)
    );
    spot.target = frame;
    spot.castShadow = true;
    scene.add(spot);
    scene.add(spot.target);
  }

  function layoutArtworks() {
    if (!WORKS.length) return;

    const total = WORKS.length;
    const perWall = Math.ceil(total / 4);

    const frontZ = -ROOM_DEPTH / 2 + 0.05;
    const backZ = ROOM_DEPTH / 2 - 0.05;
    const leftX = -ROOM_WIDTH / 2 + 0.05;
    const rightX = ROOM_WIDTH / 2 - 0.05;

    const frontLen = ROOM_WIDTH - 4; // 左右マージン
    const sideLen = ROOM_DEPTH - 4;

    const frontStep = perWall > 1 ? frontLen / (perWall - 1) : 0;
    const sideStep = perWall > 1 ? sideLen / (perWall - 1) : 0;

    WORKS.forEach((work, i) => {
      const imgPath =
        work.img || work.image || work.src || work.url || work.path;
      if (!imgPath) return;

      const wallIndex = Math.floor(i / perWall); // 0〜3
      const indexOnWall = i % perWall;

      const h = 2.0;
      let pos = new THREE.Vector3();
      let rotY = 0;

      switch (wallIndex) {
        // 前の壁（z マイナス）: 正面を +z 向き
        case 0: {
          const startX = -frontLen / 2;
          pos.set(startX + frontStep * indexOnWall, h, frontZ);
          rotY = 0;
          break;
        }
        // 右の壁（x プラス）: 正面を -x 向き
        case 1: {
          const startZ = -sideLen / 2;
          pos.set(rightX, h, startZ + sideStep * indexOnWall);
          rotY = -Math.PI / 2;
          break;
        }
        // 後ろの壁（z プラス）: 正面を -z 向き
        case 2: {
          const startX = frontLen / 2;
          pos.set(startX - frontStep * indexOnWall, h, backZ);
          rotY = Math.PI;
          break;
        }
        // 左の壁（x マイナス）: 正面を +x 向き
        default: {
          const startZ = sideLen / 2;
          pos.set(leftX, h, startZ - sideStep * indexOnWall);
          rotY = Math.PI / 2;
          break;
        }
      }

      textureLoader.load(
        imgPath,
        (tex) => createFrame(tex, pos, rotY),
        undefined,
        () => {
          // 読み込み失敗時も黒いフレームだけ出す
          const dummy = new THREE.Texture();
          createFrame(dummy, pos, rotY);
        }
      );
    });
  }

  layoutArtworks();

  // ====== アバター ======
  let avatarGroup = null;
  let avatarType = 'human'; // 'human' or 'dog'

  function clearAvatar() {
    if (!avatarGroup) return;
    scene.remove(avatarGroup);
    avatarGroup.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose && m.dispose());
        } else if (obj.material && obj.material.dispose) {
          obj.material.dispose();
        }
      }
    });
    avatarGroup = null;
  }

  function createHumanAvatar() {
    const group = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.6, 0.6, 2.0, 24);
    const colors = [0x2166ac, 0x8c510a, 0x5c3566, 0x1a9850];
    const bodyMat = new THREE.MeshPhongMaterial({
      color: colors[Math.floor(Math.random() * colors.length)]
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.position.y = 1.0;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.7, 24, 16);
    const headMat = new THREE.MeshPhongMaterial({ color: 0xf1c27d });
    const head = new THREE.Mesh(headGeo, headMat);
    head.castShadow = true;
    head.position.y = 2.1;
    group.add(head);

    const footGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16);
    const footMat = new THREE.MeshPhongMaterial({ color: 0x222222 });

    const leftFoot = new THREE.Mesh(footGeo, footMat);
    leftFoot.position.set(-0.25, 0.1, 0.2);
    leftFoot.castShadow = true;
    group.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, footMat);
    rightFoot.position.set(0.25, 0.1, 0.2);
    rightFoot.castShadow = true;
    group.add(rightFoot);

    group.position.set(0, 0, 4);
    group.rotation.y = Math.PI; // 絵の方を見る

    return group;
  }

  function createDogAvatar() {
    const group = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(1.4, 0.8, 2.0);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x8d5a2b });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.position.y = 0.6;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.6, 20, 16);
    const headMat = new THREE.MeshPhongMaterial({ color: 0x8d5a2b });
    const head = new THREE.Mesh(headGeo, headMat);
    head.castShadow = true;
    head.position.set(0, 1.1, 0.9);
    group.add(head);

    const earGeo = new THREE.BoxGeometry(0.2, 0.4, 0.1);
    const earMat = new THREE.MeshPhongMaterial({ color: 0x5b3b1a });
    const earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.35, 1.4, 0.8);
    earL.castShadow = true;
    group.add(earL);
    const earR = earL.clone();
    earR.position.x *= -1;
    group.add(earR);

    const legGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 12);
    const legMat = new THREE.MeshPhongMaterial({ color: 0x4a2d13 });

    const legPositions = [
      [-0.4, 0.3, 0.7],
      [0.4, 0.3, 0.7],
      [-0.4, 0.3, -0.7],
      [0.4, 0.3, -0.7]
    ];

    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.castShadow = true;
      leg.position.set(x, y, z);
      group.add(leg);
    });

    group.position.set(0, 0, 4);
    group.rotation.y = Math.PI;

    return group;
  }

  function getCameraOffset() {
    if (avatarType === 'dog') {
      return new THREE.Vector3(0, 1.4, 4.0);
    }
    return new THREE.Vector3(0, 2.0, 4.5);
  }

  function setAvatar(type) {
    avatarType = type;
    clearAvatar();
    avatarGroup = type === 'dog' ? createDogAvatar() : createHumanAvatar();
    scene.add(avatarGroup);
    updateAvatarButtons();
  }

  // ====== アバター切り替えUI ======
  const btnHuman = document.getElementById('btn-human');
  const btnDog = document.getElementById('btn-dog');

  function updateAvatarButtons() {
    if (!btnHuman || !btnDog) return;
    if (avatarType === 'human') {
      btnHuman.classList.add('active');
      btnDog.classList.remove('active');
    } else {
      btnDog.classList.add('active');
      btnHuman.classList.remove('active');
    }
  }

  if (btnHuman) btnHuman.addEventListener('click', () => setAvatar('human'));
  if (btnDog) btnDog.addEventListener('click', () => setAvatar('dog'));

  // 初期アバター
  setAvatar('human');

  // ====== 視線ドラッグ ======
  let isDraggingView = false;
  let lastPointerX = 0;

  function onPointerDownView(e) {
    isDraggingView = true;
    lastPointerX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
  }

  function onPointerMoveView(e) {
    if (!isDraggingView || !avatarGroup) return;
    const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const dx = x - lastPointerX;
    lastPointerX
