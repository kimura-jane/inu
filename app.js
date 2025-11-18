// app.js
// ===============================
// TAF DOG MUSEUM 3D
// 三人称視点 + ジョイスティック + アバターチェンジ
// ===============================

// ---------- 基本セットアップ ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// カメラ
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
scene.add(camera);

// 時間管理
const clock = new THREE.Clock();

// ---------- ライティング ----------
{
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const main = new THREE.DirectionalLight(0xffffff, 0.6);
  main.position.set(5, 10, 4);
  scene.add(main);
}

// ---------- 床・部屋 ----------
// 部屋サイズ（適宜調整してOK）
const ROOM_WIDTH = 18;
const ROOM_DEPTH = 12;
const ROOM_HEIGHT = 5;

function createRoom() {
  // 床
  const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.8,
    metalness: 0.0,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // 壁（3面だけ使う）
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xe5e5e5,
    roughness: 1.0,
  });

  const wallGeoW = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
  const wallGeoD = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);

  // 正面（Z+）
  const front = new THREE.Mesh(wallGeoW, wallMat);
  front.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
  front.rotation.y = Math.PI;
  scene.add(front);

  // 右側（X+）
  const right = new THREE.Mesh(wallGeoD, wallMat);
  right.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  right.rotation.y = -Math.PI / 2;
  scene.add(right);

  // 左側（X-）
  const left = new THREE.Mesh(wallGeoD, wallMat);
  left.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  left.rotation.y = Math.PI / 2;
  scene.add(left);

  return { front, right, left };
}

const walls = createRoom();

// ---------- 額縁 & 絵 ----------

const loader = new THREE.TextureLoader();
loader.crossOrigin = 'anonymous';

// Three.js の texture 設定（ドット感軽減）
function loadArtworkTexture(url) {
  const tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  return tex;
}

function createFrameMesh(work) {
  const frameWidth = 1.4;
  const frameHeight = 2.0;
  const frameDepth = 0.07;

  // 額
  const frameGeo = new THREE.BoxGeometry(frameWidth, frameHeight, frameDepth);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.2,
    roughness: 0.6,
  });
  const frame = new THREE.Mesh(frameGeo, frameMat);

  // 絵（板ポリ）
  const artGeo = new THREE.PlaneGeometry(frameWidth * 0.9, frameHeight * 0.9);
  const artTex = loadArtworkTexture(work.image);
  const artMat = new THREE.MeshStandardMaterial({
    map: artTex,
    side: THREE.FrontSide,
  });
  const art = new THREE.Mesh(artGeo, artMat);
  art.position.z = frameDepth / 2 + 0.001;

  // スポットライト
  const spot = new THREE.SpotLight(0xffffff, 0.9, 6, Math.PI / 4, 0.5, 2);
  spot.position.set(0, frameHeight / 2 + 0.5, 0.6);
  spot.target = frame;
  frame.add(spot);
  frame.add(spot.target);

  frame.add(art);
  return frame;
}

// 館内に配置
function layoutArtworks() {
  if (!window.WORKS || !Array.isArray(window.WORKS)) return;

  const works = window.WORKS;
  const total = works.length;

  // 3面にざっくり等分
  const perWall = Math.ceil(total / 3);
  const wallsArr = [walls.front, walls.right, walls.left];

  let index = 0;
  for (let w = 0; w < wallsArr.length; w++) {
    const wall = wallsArr[w];
    const count = Math.min(perWall, total - index);
    if (count <= 0) break;

    const span = 0.8; // 額同士の隙間
    const frameWidth = 1.4;
    const totalWidth = count * frameWidth + (count - 1) * span;

    for (let i = 0; i < count; i++) {
      const work = works[index++];
      const frame = createFrameMesh(work);

      const localX = -totalWidth / 2 + frameWidth / 2 + i * (frameWidth + span);
      const localY = ROOM_HEIGHT * 0.55;
      const localZ = 0.01; // 壁から少し浮かせる

      // 壁のローカル→ワールド
      const pos = new THREE.Vector3(localX, localY, localZ);
      wall.localToWorld(pos);
      frame.position.copy(pos);

      // 回転は壁に合わせる
      frame.rotation.y = wall.rotation.y;

      scene.add(frame);
    }
  }
}

layoutArtworks();

// ---------- アバター ----------

const avatarGroup = new THREE.Group();
scene.add(avatarGroup);

// 人間
let humanMesh;
(function createHuman() {
  const bodyGeo = new THREE.CylinderGeometry(0.45, 0.45, 2.0, 32);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x0044aa,
    roughness: 0.6,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.0;

  const headGeo = new THREE.SphereGeometry(0.55, 32, 32);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffcc99,
    roughness: 0.7,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 2.1;

  const shoesGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.25, 16);
  const shoesMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.5,
  });
  const leftShoe = new THREE.Mesh(shoesGeo, shoesMat);
  const rightShoe = new THREE.Mesh(shoesGeo, shoesMat);
  leftShoe.position.set(-0.18, 0.1, 0);
  rightShoe.position.set(0.18, 0.1, 0);

  humanMesh = new THREE.Group();
  humanMesh.add(body, head, leftShoe, rightShoe);
  avatarGroup.add(humanMesh);

  humanMesh.userData.bodyMat = bodyMat;
})();

// 犬（シンプルなローポリアバター）
let dogMesh;
const dogColors = [0xb27a3c, 0xd9a066, 0x8b5a2b];

(function createDog() {
  const bodyGeo = new THREE.CapsuleGeometry(0.4, 0.8, 8, 16);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: dogColors[0],
    roughness: 0.8,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.6;

  const headGeo = new THREE.SphereGeometry(0.45, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({
    color: dogColors[0],
    roughness: 0.8,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 1.1, 0.35);

  const earGeo = new THREE.BoxGeometry(0.12, 0.35, 0.08);
  const earMat = new THREE.MeshStandardMaterial({
    color: 0x5b3a1a,
    roughness: 0.8,
  });
  const earL = new THREE.Mesh(earGeo, earMat);
  const earR = new THREE.Mesh(earGeo, earMat);
  earL.position.set(-0.2, 1.25, 0.3);
  earR.position.set(0.2, 1.25, 0.3);

  const legGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.45, 8);
  const legMat = new THREE.MeshStandardMaterial({
    color: dogColors[0],
  });
  const legs = [];
  const offs = [
    [-0.18, 0.25, 0.15],
    [0.18, 0.25, 0.15],
    [-0.18, 0.25, -0.15],
    [0.18, 0.25, -0.15],
  ];
  offs.forEach(o => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(o[0], o[1], o[2]);
    legs.push(leg);
  });

  dogMesh = new THREE.Group();
  dogMesh.add(body, head, earL, earR, ...legs);

  dogMesh.visible = false;
  avatarGroup.add(dogMesh);

  dogMesh.userData = {
    bodyMat,
    headMat,
    legMat,
  };
})();

let avatarMode = 'human'; // 'human' or 'dog'
let dogColorIndex = 0;

function applyDogColor() {
  const color = dogColors[dogColorIndex % dogColors.length];
  dogColorIndex++;

  const c = new THREE.Color(color);
  const ud = dogMesh.userData;
  ud.bodyMat.color.copy(c);
  ud.headMat.color.copy(c);
  ud.legMat.color.copy(c);
}

function randomizeHumanClothes() {
  const colors = [0x0044aa, 0x663399, 0x008866, 0xaa3333];
  const c = new THREE.Color(
    colors[Math.floor(Math.random() * colors.length)]
  );
  humanMesh.userData.bodyMat.color.copy(c);
}

function setAvatarMode(mode) {
  avatarMode = mode;
  if (mode === 'human') {
    humanMesh.visible = true;
    dogMesh.visible = false;
    randomizeHumanClothes();
  } else {
    humanMesh.visible = false;
    dogMesh.visible = true;
    applyDogColor();
  }
}

// 初期位置
avatarGroup.position.set(0, 0, 2);

// ---------- カメラ追従 ----------

let yaw = Math.PI; // 左右回転
let pitch = 0;     // 上下回転（小さめに）

const CAM_DIST = 4.2;
const HUMAN_HEIGHT = 2.1;
const DOG_HEIGHT = 1.1;

function updateCamera() {
  const baseHeight = avatarMode === 'human' ? HUMAN_HEIGHT : DOG_HEIGHT;
  const target = new THREE.Vector3(
    avatarGroup.position.x,
    baseHeight * 0.65,
    avatarGroup.position.z
  );

  const offset = new THREE.Vector3();
  offset.x = Math.sin(yaw) * CAM_DIST;
  offset.z = Math.cos(yaw) * CAM_DIST;
  offset.y = baseHeight * 0.6 + Math.sin(pitch) * 1.0;

  camera.position.copy(target).add(offset);
  camera.lookAt(target);
}

// ---------- ドラッグで視点回転 ----------

let dragging = false;
let prevX = 0;
let prevY = 0;

function onPointerDown(e) {
  dragging = true;
  prevX = e.clientX;
  prevY = e.clientY;
}

function onPointerMove(e) {
  if (!dragging) return;
  const dx = e.clientX - prevX;
  const dy = e.clientY - prevY;
  prevX = e.clientX;
  prevY = e.clientY;

  const ROT_SPEED_X = 0.004;
  const ROT_SPEED_Y = 0.003;

  yaw -= dx * ROT_SPEED_X;
  pitch -= dy * ROT_SPEED_Y;
  const limit = Math.PI / 4;
  if (pitch > limit) pitch = limit;
  if (pitch < -limit) pitch = -limit;
}

function onPointerUp() {
  dragging = false;
}

canvas.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointerleave', onPointerUp);

// ---------- ジョイスティック ----------

const joyContainer = document.getElementById('joy-container');
const joyBg = document.getElementById('joy-bg');
const joyStick = document.getElementById('joy-stick');

let joyActive = false;
let joyCenter = { x: 0, y: 0 };
let joyVec = { x: 0, y: 0 }; // -1〜1

function setJoyPosition(x, y) {
  const rect = joyBg.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const dx = x - cx;
  const dy = y - cy;
  const maxR = rect.width / 2;

  let nx = dx / maxR;
  let ny = dy / maxR;

  const len = Math.hypot(nx, ny);
  if (len > 1) {
    nx /= len;
    ny /= len;
  }

  joyVec.x = nx;
  joyVec.y = ny;

  joyStick.style.transform = `translate(${nx * maxR * 0.6}px, ${ny * maxR * 0.6}px)`;
}

function resetJoy() {
  joyVec.x = 0;
  joyVec.y = 0;
  joyStick.style.transform = 'translate(0px, 0px)';
}

function handleJoyStart(e) {
  e.preventDefault();
  joyActive = true;
  const p = e.touches ? e.touches[0] : e;
  setJoyPosition(p.clientX, p.clientY);
}

function handleJoyMove(e) {
  if (!joyActive) return;
  e.preventDefault();
  const p = e.touches ? e.touches[0] : e;
  setJoyPosition(p.clientX, p.clientY);
}

function handleJoyEnd(e) {
  e && e.preventDefault();
  joyActive = false;
  resetJoy();
}

joyBg.addEventListener('mousedown', handleJoyStart);
window.addEventListener('mousemove', handleJoyMove);
window.addEventListener('mouseup', handleJoyEnd);

joyBg.addEventListener('touchstart', handleJoyStart, { passive: false });
window.addEventListener('touchmove', handleJoyMove, { passive: false });
window.addEventListener('touchend', handleJoyEnd, { passive: false });
window.addEventListener('touchcancel', handleJoyEnd, { passive: false });

// ---------- アバターチェンジ UI ----------

const btnHuman = document.getElementById('btn-human');
const btnDog = document.getElementById('btn-dog');

btnHuman.addEventListener('click', () => {
  setAvatarMode('human');
  btnHuman.classList.add('active');
  btnDog.classList.remove('active');
});

btnDog.addEventListener('click', () => {
  setAvatarMode('dog');
  btnDog.classList.add('active');
  btnHuman.classList.remove('active');
});

// 初期状態
setAvatarMode('human');
btnHuman.classList.add('active');

// ---------- メインループ ----------

function updateAvatarMovement(delta) {
  if (!joyVec.x && !joyVec.y) return;

  const speed = avatarMode === 'human' ? 3.0 : 4.0; // 犬はちょい速い
  // joyVec.y: 下方向が + なので前後反転
  const inputX = joyVec.x;
  const inputY = -joyVec.y;

  // カメラの向いている向きに対しての移動
  const moveAngle = yaw + Math.atan2(inputX, inputY || 0.0001);
  const v = Math.hypot(inputX, inputY);
  const dist = speed * v * delta;

  const dx = Math.sin(moveAngle) * dist;
  const dz = Math.cos(moveAngle) * dist;

  avatarGroup.position.x += dx;
  avatarGroup.position.z += dz;

  // 部屋の範囲内に制限
  const margin = 1.0;
  const maxX = ROOM_WIDTH / 2 - margin;
  const maxZ = ROOM_DEPTH / 2 - margin;
  avatarGroup.position.x = Math.max(-maxX, Math.min(maxX, avatarGroup.position.x));
  avatarGroup.position.z = Math.max(-maxZ, Math.min(maxZ, avatarGroup.position.z));

  // 進行方向にアバターを回転
  avatarGroup.rotation.y = moveAngle;
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  updateAvatarMovement(delta);
  updateCamera();

  renderer.render(scene, camera);
}

animate();

// ---------- リサイズ ----------
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});
