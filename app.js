// ====== グローバル ======
let scene, camera, renderer;
let avatar, avatarType = "human";
let yaw = 0;
let isDraggingView = false;
let dragStartX = 0;
let dragStartYaw = 0;

let joyActive = false;
let joyCenter = { x: 0, y: 0 };
let joyVec = { x: 0, y: 0 };

const ROOM_SIZE = 1600;

// ====== 初期化 ======
init();
animate();

function init() {
  const canvas = document.getElementById("scene");

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  resizeRenderer();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050509);

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 5000);

  // ライト
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.8);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(800, 1200, 400);
  scene.add(dir);

  // 白いギャラリー部屋
  createGalleryRoom();

  // 額＋絵
  createArtworks();

  // アバター
  avatar = createHumanAvatar();
  scene.add(avatar);
  avatarType = "human";

  // カメラ初期位置
  avatar.position.set(0, 0, 400);
  yaw = Math.PI; // 部屋の内側を向かせる

  // UI イベント
  setupJoystick();
  setupViewDrag();
  setupAvatarButtons();
  setupModal();

  window.addEventListener("resize", resizeRenderer, false);
}

// ====== 部屋 ======
function createGalleryRoom() {
  const room = new THREE.Group();

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    roughness: 0.9,
    metalness: 0.0
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf6f6f6,
    roughness: 0.9
  });
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.8
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  room.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
    ceilingMat
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 500;
  room.add(ceiling);

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, 500),
    wallMat
  );
  backWall.position.set(0, 250, -ROOM_SIZE / 2);
  room.add(backWall);

  const frontWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, 500),
    wallMat
  );
  frontWall.position.set(0, 250, ROOM_SIZE / 2);
  frontWall.rotation.y = Math.PI;
  room.add(frontWall);

  const leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, 500),
    wallMat
  );
  leftWall.position.set(-ROOM_SIZE / 2, 250, 0);
  leftWall.rotation.y = Math.PI / 2;
  room.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, 500),
    wallMat
  );
  rightWall.position.set(ROOM_SIZE / 2, 250, 0);
  rightWall.rotation.y = -Math.PI / 2;
  room.add(rightWall);

  scene.add(room);

  // 天井スポットライト
  const spotRow = 7;
  const gap = ROOM_SIZE / (spotRow + 1);
  for (let i = 0; i < spotRow; i++) {
    const x = -ROOM_SIZE / 2 + gap * (i + 1);
    const spot = new THREE.SpotLight(0xffffff, 0.65, 1200, Math.PI / 6, 0.4, 2);
    spot.position.set(x, 480, 0);
    spot.target.position.set(x, 0, 0);
    scene.add(spot);
    scene.add(spot.target);
  }
}

// ====== 絵と額 ======
function createArtworks() {
  if (!Array.isArray(WORKS)) return;

  const count = WORKS.length;
  const perWall = Math.ceil(count / 4);
  const startY = 260;

  const frameTypes = [
    { color: 0x111111, depth: 18 },
    { color: 0x8b6b3d, depth: 22 },
    { color: 0xd0d0d0, depth: 16 },
    { color: 0x3a3a3a, depth: 20 }
  ];

  for (let i = 0; i < count; i++) {
    const work = WORKS[i];
    const wallIndex = Math.floor(i / perWall);
    const indexOnWall = i % perWall;

    const ratio = perWall === 1 ? 0.5 : indexOnWall / (perWall - 1);
    const offset = ROOM_SIZE * 0.7;
    const posOffset = -offset / 2 + offset * ratio;

    let pos = new THREE.Vector3();
    let rotY = 0;

    switch (wallIndex) {
      case 0: // back
        pos.set(posOffset, startY, -ROOM_SIZE / 2 + 2);
        rotY = 0;
        break;
      case 1: // right
        pos.set(ROOM_SIZE / 2 - 2, startY, posOffset);
        rotY = -Math.PI / 2;
        break;
      case 2: // front
        pos.set(-posOffset, startY, ROOM_SIZE / 2 - 2);
        rotY = Math.PI;
        break;
      case 3: // left
      default:
        pos.set(-ROOM_SIZE / 2 + 2, startY, -posOffset);
        rotY = Math.PI / 2;
        break;
    }

    const frameSetting = frameTypes[i % frameTypes.length];

    const group = new THREE.Group();

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(220, 320, frameSetting.depth),
      new THREE.MeshStandardMaterial({
        color: frameSetting.color,
        metalness: 0.3,
        roughness: 0.6
      })
    );
    group.add(frame);

    const canvas = new THREE.Mesh(
      new THREE.PlaneGeometry(190, 290),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    canvas.position.z = frameSetting.depth / 2 + 0.1;
    group.add(canvas);

    // テクスチャ
    const texLoader = new THREE.TextureLoader();
    texLoader.load(work.image, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      canvas.material.map = tex;
      canvas.material.needsUpdate = true;
    });

    const lamp = new THREE.Mesh(
      new THREE.ConeGeometry(20, 40, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.3
      })
    );
    lamp.position.set(0, 210, frameSetting.depth / 2 + 10);
    lamp.rotation.x = -Math.PI / 4;
    group.add(lamp);

    group.position.copy(pos);
    group.rotation.y = rotY;

    group.userData.work = work;
    clickableObjects.push(group);

    scene.add(group);
  }
}

// ====== アバター生成 ======
function createHumanAvatar() {
  const group = new THREE.Group();

  const bodyColors = [0x2e4c9a, 0xd08b2f, 0x3a835a, 0x8b3a66];
  const coatColor = bodyColors[Math.floor(Math.random() * bodyColors.length)];
  const skinColors = [0xf2d5b5, 0xe0b894, 0xc89b6a];
  const skinColor = skinColors[Math.floor(Math.random() * skinColors.length)];

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(40, 40, 170, 24),
    new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.6 })
  );
  body.position.y = 120;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(45, 24, 24),
    new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 })
  );
  head.position.y = 220;
  group.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(46, 24, 24, 0, Math.PI * 2, 0, Math.PI / 1.8),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 })
  );
  hair.position.y = 230;
  group.add(hair);

  const legMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const legGeo = new THREE.CylinderGeometry(18, 18, 90, 16);

  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-18, 45, 0);
  const legR = legL.clone();
  legR.position.x = 18;
  group.add(legL, legR);

  return group;
}

function createDogAvatar() {
  const group = new THREE.Group();

  const furColors = [0x444444, 0xcfa46b, 0xdbd3c5, 0x94735a];
  const fur = furColors[Math.floor(Math.random() * furColors.length)];

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(120, 60, 180),
    new THREE.MeshStandardMaterial({ color: fur, roughness: 0.7 })
  );
  body.position.y = 55;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(80, 70, 80),
    new THREE.MeshStandardMaterial({ color: fur, roughness: 0.7 })
  );
  head.position.set(0, 95, 100);
  group.add(head);

  const earGeo = new THREE.BoxGeometry(18, 40, 8);
  const earMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const earL = new THREE.Mesh(earGeo, earMat);
  earL.position.set(-32, 120, 80);
  const earR = earL.clone();
  earR.position.x = 32;
  group.add(earL, earR);

  const legGeo = new THREE.CylinderGeometry(10, 10, 50, 12);
  const legMat = new THREE.MeshStandardMaterial({ color: fur });
  const legs = [];
  for (let i = 0; i < 4; i++) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.y = 25;
    legs.push(leg);
  }
  legs[0].position.set(-35, 25, 60);
  legs[1].position.set(35, 25, 60);
  legs[2].position.set(-35, 25, -60);
  legs[3].position.set(35, 25, -60);
  group.add(...legs);

  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 6, 60, 10),
    new THREE.MeshStandardMaterial({ color: fur })
  );
  tail.position.set(0, 80, -100);
  tail.rotation.x = Math.PI / 3;
  group.add(tail);

  return group;
}

// ====== アバターボタン ======
function setupAvatarButtons() {
  const btnHuman = document.getElementById("btn-human");
  const btnDog = document.getElementById("btn-dog");

  btnHuman.addEventListener("click", () => {
    if (avatarType === "human") return;
    changeAvatar("human");
    btnHuman.classList.add("active");
    btnDog.classList.remove("active");
  });

  btnDog.addEventListener("click", () => {
    if (avatarType === "dog") return;
    changeAvatar("dog");
    btnDog.classList.add("active");
    btnHuman.classList.remove("active");
  });
}

function changeAvatar(type) {
  if (avatar) scene.remove(avatar);
  avatarType = type;
  avatar = type === "human" ? createHumanAvatar() : createDogAvatar();
  scene.add(avatar);
  avatar.position.set(0, 0, 400);
}

// ====== ジョイスティック ======
function setupJoystick() {
  const bg = document.getElementById("joy-bg");
  const stick = document.getElementById("joy-stick");

  const start = (e) => {
    e.preventDefault();
    joyActive = true;
    const rect = bg.getBoundingClientRect();
    joyCenter.x = rect.left + rect.width / 2;
    joyCenter.y = rect.top + rect.height / 2;
    move(e);
  };

  const move = (e) => {
    if (!joyActive) return;
    const point = getPoint(e);
    const dx = point.x - joyCenter.x;
    const dy = point.y - joyCenter.y;
    const maxR = 40;

    let x = dx;
    let y = dy;
    const len = Math.hypot(x, y);
    if (len > maxR) {
      x = (x / len) * maxR;
      y = (y / len) * maxR;
    }

    joyVec.x = x / maxR;
    joyVec.y = y / maxR;

    stick.style.transform = `translate(${x}px, ${y}px)`;
  };

  const end = () => {
    joyActive = false;
    joyVec.x = 0;
    joyVec.y = 0;
    stick.style.transform = "translate(0,0)";
  };

  bg.addEventListener("pointerdown", start);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
}

function getPoint(e) {
  if (e.touches && e.touches[0]) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

// ====== 視線ドラッグ ======
function setupViewDrag() {
  const canvas = document.getElementById("scene");
  const joy = document.getElementById("joy-bg");

  const onDown = (e) => {
    if (e.target === joy || joy.contains(e.target)) return;
    e.preventDefault();
    isDraggingView = true;
    dragStartX = getPoint(e).x;
    dragStartYaw = yaw;
  };

  const onMove = (e) => {
    if (!isDraggingView) return;
    e.preventDefault();
    const x = getPoint(e).x;
    const dx = x - dragStartX;
    const rotSpeed = 0.005;
    yaw = dragStartYaw - dx * rotSpeed;
  };

  const onUp = () => {
    isDraggingView = false;
  };

  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

// ====== 画像クリック拡大 ======
const clickableObjects = [];
let raycaster = new THREE.Raycaster();
let pointer = new THREE.Vector2();

function setupModal() {
  const overlay = document.createElement("div");
  overlay.id = "modal-overlay";
  overlay.innerHTML = "<img />";
  document.body.appendChild(overlay);

  overlay.addEventListener("click", () => {
    overlay.classList.remove("active");
  });

  const canvas = document.getElementById("scene");
  const showModal = (work) => {
    const img = overlay.querySelector("img");
    img.src = work.image;
    overlay.classList.add("active");
  };

  const handleClick = (event) => {
    const rect = canvas.getBoundingClientRect();
    const p = getPoint(event);
    pointer.x = ((p.x - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((p.y - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(clickableObjects, true);
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && !obj.userData.work && obj.parent) {
        obj = obj.parent;
      }
      if (obj && obj.userData.work) {
        showModal(obj.userData.work);
      }
    }
  };

  canvas.addEventListener("click", handleClick);
}

// ====== レンダリング ======
function animate() {
  requestAnimationFrame(animate);

  if (avatar) {
    const speed = 3.0;
    const forward = -joyVec.y * speed;
    const strafe = joyVec.x * speed;

    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);

    avatar.position.x += sin * forward + cos * strafe;
    avatar.position.z += cos * forward - sin * strafe;

    if (avatarType === "human") {
      avatar.position.y = 0;
    } else {
      avatar.position.y = 0;
    }

    const camOffset = new THREE.Vector3(0, 180, 260);
    const rotMat = new THREE.Matrix4().makeRotationY(yaw);
    camOffset.applyMatrix4(rotMat);

    camera.position.copy(avatar.position).add(camOffset);
    camera.lookAt(
      avatar.position.x,
      avatar.position.y + (avatarType === "human" ? 160 : 80),
      avatar.position.z
    );

    avatar.rotation.y = yaw;
  }

  renderer.render(scene, camera);
}

function resizeRenderer() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  if (camera) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}
